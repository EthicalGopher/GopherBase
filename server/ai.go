package server

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"regexp"
	"strings"
	"sync"

	"github.com/gofiber/contrib/v3/websocket"
	"github.com/gofiber/fiber/v3"
)

type AIQueryRequest struct {
	Prompt string `json:"prompt"`
	Mode   string `json:"mode"` // "command", "chat", "both", or "auto"
}

type AIResponse struct {
	Agent    string        `json:"agent"` // "chat", "command", or "decider"
	Text     string        `json:"text"`
	Response []interface{} `json:"response"`
}

type OllamaMessage struct {
	Role       string     `json:"role"`
	Content    string     `json:"content"`
	ToolCalls  []ToolCall `json:"tool_calls,omitempty"`
	ToolCallID string     `json:"tool_call_id,omitempty"`
}

type ToolCall struct {
	ID       string       `json:"id,omitempty"`
	Type     string       `json:"type,omitempty"`
	Function FunctionCall `json:"function"`
}

type FunctionCall struct {
	Name      string          `json:"name"`
	Arguments json.RawMessage `json:"arguments"`
}

type OllamaChatRequest struct {
	Model    string          `json:"model"`
	Messages []OllamaMessage `json:"messages"`
	Tools    []OllamaTool    `json:"tools,omitempty"`
	Stream   bool            `json:"stream"`
}

type OllamaTool struct {
	Type     string             `json:"type"`
	Function OllamaFunctionDesc `json:"function"`
}

type OllamaFunctionDesc struct {
	Name        string                `json:"name"`
	Description string                `json:"description"`
	Parameters  OllamaParameterSchema `json:"parameters"`
}

type OllamaParameterSchema struct {
	Type       string                    `json:"type"`
	Properties map[string]OllamaProperty `json:"properties"`
	Required   []string                  `json:"required"`
}

type OllamaProperty struct {
	Type        string   `json:"type"`
	Description string   `json:"description"`
	Enum        []string `json:"enum,omitempty"`
}

type OllamaChatResponse struct {
	Message OllamaMessage `json:"message"`
}

func (h *Handler) runDeciderAgent(ctx context.Context, prompt string, ollamaHost string) string {
	systemPrompt := "You are a Routing Agent for GopherBase. Your job is to decide if a user prompt requires a database operation (COMMAND), a general conversation (CHAT), or BOTH.\n" +
		"RULES:\n" +
		"1. Respond ONLY with one of these three words: 'chat', 'command', or 'both'.\n" +
		"2. If the user wants to list tables, query data, create tables, or any DB task -> 'command'.\n" +
		"3. If the user is asking general questions, greeting, or seeking explanation without DB tasks -> 'chat'.\n" +
		"4. If the prompt does both (e.g., 'Hello, show me the users') -> 'both'.\n" +
		"EXAMPLES:\n" +
		"User: 'Hi'\nAgent: 'chat'\n" +
		"User: 'Select all users'\nAgent: 'command'\n" +
		"User: 'Explain GopherBase and list tables'\nAgent: 'both'"

	messages := []OllamaMessage{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: prompt},
	}

	reqBody := OllamaChatRequest{
		Model:    "deepseek-coder:6.7b",
		Messages: messages,
		Stream:   false,
	}

	jsonData, _ := json.Marshal(reqBody)
	resp, err := http.Post(ollamaHost+"/api/chat", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return "both" // Fallback
	}
	defer resp.Body.Close()

	var ollamaResp OllamaChatResponse
	json.NewDecoder(resp.Body).Decode(&ollamaResp)

	decision := strings.ToLower(strings.TrimSpace(ollamaResp.Message.Content))
	if strings.Contains(decision, "both") {
		return "both"
	}
	if strings.Contains(decision, "command") {
		return "command"
	}
	return "chat"
}

func (h *Handler) runChatAgent(ctx context.Context, prompt string, ollamaHost string) AIResponse {
	systemPrompt := "You are a friendly GopherBase Chat Assistant.\n" +
		"EXAMPLES:\n" +
		"User: 'What is GopherBase?'\n" +
		"Agent: 'GopherBase is an open-source Supabase alternative built in Go.'\n" +
		"User: 'Hello!'\n" +
		"Agent: 'Hi there! How can I help you with GopherBase today?'\n\n" +
		"Focus on general conversation and guidance. " +
		"STRICT RULE: DO NOT provide any code (Go, SQL, Javascript, etc.) or specific database commands. " +
		"If the user asks for code or queries, politely explain that you are for general help and they should use the Command mode for database tasks."

	messages := []OllamaMessage{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: prompt},
	}

	reqBody := OllamaChatRequest{
		Model:    "qwen2.5:32b",
		Messages: messages,
		Stream:   false,
	}

	jsonData, _ := json.Marshal(reqBody)
	resp, err := http.Post(ollamaHost+"/api/chat", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return AIResponse{Agent: "chat", Text: "Error: " + err.Error()}
	}
	defer resp.Body.Close()

	var ollamaResp OllamaChatResponse
	json.NewDecoder(resp.Body).Decode(&ollamaResp)

	return AIResponse{
		Agent: "chat",
		Text:  ollamaResp.Message.Content,
	}
}

func (h *Handler) runCommandAgent(ctx context.Context, prompt string, ollamaHost string) AIResponse {
	tools := []OllamaTool{
		{
			Type: "function",
			Function: OllamaFunctionDesc{
				Name:        "execute_sql",
				Description: "Execute a PostgreSQL query and return the results. Use this for SELECT, INSERT, UPDATE, DELETE or even DDL like CREATE TABLE.",
				Parameters: OllamaParameterSchema{
					Type: "object",
					Properties: map[string]OllamaProperty{
						"sql": {
							Type:        "string",
							Description: "The exact PostgreSQL query to execute",
						},
					},
					Required: []string{"sql"},
				},
			},
		},
		{
			Type: "function",
			Function: OllamaFunctionDesc{
				Name:        "list_tables",
				Description: "List all user-defined tables in the public schema of the database.",
				Parameters: OllamaParameterSchema{
					Type:       "object",
					Properties: map[string]OllamaProperty{},
				},
			},
		},
		{
			Type: "function",
			Function: OllamaFunctionDesc{
				Name:        "describe_table",
				Description: "Get detailed information about a table's columns, types, and constraints.",
				Parameters: OllamaParameterSchema{
					Type: "object",
					Properties: map[string]OllamaProperty{
						"table_name": {
							Type:        "string",
							Description: "The name of the table to describe",
						},
					},
					Required: []string{"table_name"},
				},
			},
		},
	}

	systemPrompt := "You are a PostgreSQL Command Agent for GopherBase. " +
		"Your ONLY job is to execute SQL commands using tools. " +
		"DO NOT TALK. DO NOT EXPLAIN. ONLY CALL TOOLS.\n" +
		"If you need information about the schema, call list_tables or describe_table.\n" +
		"If you have enough information, call execute_sql.\n" +
		"STRICT RULE: NO CONVERSATIONAL TEXT. ONLY TOOL CALLS."

	messages := []OllamaMessage{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: prompt},
	}

	maxIterations := 5
	var toolExecutions []interface{}

	for i := 0; i < maxIterations; i++ {
		reqBody := OllamaChatRequest{
			Model:    "deepseek-coder:6.7b",
			Messages: messages,
			Tools:    tools,
			Stream:   false,
		}

		jsonData, _ := json.Marshal(reqBody)
		resp, err := http.Post(ollamaHost+"/api/chat", "application/json", bytes.NewBuffer(jsonData))
		if err != nil {
			return AIResponse{Agent: "command", Text: "Error: " + err.Error()}
		}
		defer resp.Body.Close()

		var ollamaResp OllamaChatResponse
		json.NewDecoder(resp.Body).Decode(&ollamaResp)

		// Ensure we don't output text in command mode
		if len(ollamaResp.Message.ToolCalls) == 0 && ollamaResp.Message.Content != "" {
			// If it returned text instead of tools, try to extract if it looks like SQL
			if strings.Contains(strings.ToUpper(ollamaResp.Message.Content), "SELECT") ||
				strings.Contains(strings.ToUpper(ollamaResp.Message.Content), "CREATE") ||
				strings.Contains(strings.ToUpper(ollamaResp.Message.Content), "INSERT") {
				// Try to wrap it in a tool call if it's just raw SQL text
				ollamaResp.Message.ToolCalls = []ToolCall{
					{
						Function: FunctionCall{
							Name:      "execute_sql",
							Arguments: json.RawMessage(fmt.Sprintf(`{"sql": %q}`, ollamaResp.Message.Content)),
						},
					},
				}
			}
		}

		messages = append(messages, ollamaResp.Message)

		if len(ollamaResp.Message.ToolCalls) == 0 {
			return AIResponse{
				Agent:    "command",
				Text:     "", // Force empty text for command agent
				Response: toolExecutions,
			}
		}

		for _, tc := range ollamaResp.Message.ToolCalls {
			var result interface{}
			var toolError error

			switch tc.Function.Name {
			case "execute_sql":
				var args struct {
					SQL string `json:"sql"`
				}
				json.Unmarshal(tc.Function.Arguments, &args)
				if args.SQL != "" {
					result, toolError = h.executeRawSQL(ctx, args.SQL)
					toolExecutions = append(toolExecutions, fiber.Map{"tool": "execute_sql", "query": args.SQL, "result": result, "error": func() string {
						if toolError != nil {
							return toolError.Error()
						}
						return ""
					}()})
				}
			case "list_tables":
				result, toolError = h.listTablesInternal(ctx)
				toolExecutions = append(toolExecutions, fiber.Map{"tool": "list_tables", "result": result, "error": func() string {
					if toolError != nil {
						return toolError.Error()
					}
					return ""
				}()})
			case "describe_table":
				var args struct {
					TableName string `json:"table_name"`
				}
				json.Unmarshal(tc.Function.Arguments, &args)
				result, toolError = h.describeTableInternal(ctx, args.TableName)
				toolExecutions = append(toolExecutions, fiber.Map{"tool": "describe_table", "table": args.TableName, "result": result, "error": func() string {
					if toolError != nil {
						return toolError.Error()
					}
					return ""
				}()})
			}

			resultStr := ""
			if toolError != nil {
				resultStr = fmt.Sprintf("Error: %v", toolError)
			} else {
				resBytes, _ := json.Marshal(result)
				resultStr = string(resBytes)
			}

			messages = append(messages, OllamaMessage{
				Role:       "tool",
				Content:    resultStr,
				ToolCallID: tc.ID,
			})
		}
	}

	return AIResponse{Agent: "command", Text: "", Response: toolExecutions}
}

func (h *Handler) AIWebSocket(conn *websocket.Conn) {
	ollamaHost := os.Getenv("OLLAMA_HOST")
	if ollamaHost == "" {
		ollamaHost = "http://localhost:11434"
	}

	for {
		messageType, msg, err := conn.ReadMessage()
		if err != nil {
			break
		}

		if messageType != websocket.TextMessage {
			continue
		}

		var req AIQueryRequest
		if err := json.Unmarshal(msg, &req); err != nil {
			conn.WriteJSON(fiber.Map{"error": "Invalid request format"})
			continue
		}

		// Intelligent routing using Decider Agent
		mode := req.Mode
		if mode == "both" || mode == "auto" || mode == "" {
			mode = h.runDeciderAgent(context.Background(), req.Prompt, ollamaHost)
		}

		var wg sync.WaitGroup
		respChan := make(chan AIResponse, 2)

		if mode == "chat" || mode == "both" {
			wg.Add(1)
			go func() {
				defer wg.Done()
				respChan <- h.runChatAgent(context.Background(), req.Prompt, ollamaHost)
			}()
		}

		if mode == "command" || mode == "both" {
			wg.Add(1)
			go func() {
				defer wg.Done()
				respChan <- h.runCommandAgent(context.Background(), req.Prompt, ollamaHost)
			}()
		}

		go func() {
			wg.Wait()
			close(respChan)
		}()

		for resp := range respChan {
			conn.WriteJSON(resp)
		}
	}
}

func (h *Handler) AIQuery(c fiber.Ctx) error {
	var body AIQueryRequest
	if err := c.Bind().Body(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if body.Prompt == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Prompt cannot be empty"})
	}

	ollamaHost := os.Getenv("OLLAMA_HOST")
	if ollamaHost == "" {
		ollamaHost = "http://localhost:11434"
	}

	mode := body.Mode
	if mode == "both" || mode == "auto" || mode == "" {
		mode = h.runDeciderAgent(c.Context(), body.Prompt, ollamaHost)
	}

	if mode == "command" {
		resp := h.runCommandAgent(c.Context(), body.Prompt, ollamaHost)
		return c.JSON(fiber.Map{
			"text":     resp.Text,
			"response": resp.Response,
		})
	} else {
		resp := h.runChatAgent(c.Context(), body.Prompt, ollamaHost)
		return c.JSON(fiber.Map{
			"text":     resp.Text,
			"response": resp.Response,
		})
	}
}

func (h *Handler) tryExtractToolCall(content string) *ToolCall {
	// Simple regex to find JSON-like blobs
	re := regexp.MustCompile(`\{.*"name".*"execute_sql".*\}`)
	match := re.FindString(content)
	if match == "" {
		return nil
	}

	var tc ToolCall
	// Try to unmarshal into a simplified structure first
	var raw map[string]interface{}
	if err := json.Unmarshal([]byte(match), &raw); err != nil {
		return nil
	}

	name, _ := raw["name"].(string)
	if name == "" {
		return nil
	}

	tc.Function.Name = name

	// Handle both OpenAI style 'arguments' and model-hallucinated 'parameters' or just raw fields
	if args, ok := raw["arguments"]; ok {
		tc.Function.Arguments, _ = json.Marshal(args)
	} else if params, ok := raw["parameters"]; ok {
		tc.Function.Arguments, _ = json.Marshal(params)
	} else {
		// Just marshal the whole thing as arguments
		tc.Function.Arguments = []byte(match)
	}

	return &tc
}

func (h *Handler) listTablesInternal(ctx context.Context) (interface{}, error) {
	query := `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name NOT LIKE 'pg_%'`
	rows, err := h.DB.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tables []string
	for rows.Next() {
		var name string
		rows.Scan(&name)
		tables = append(tables, name)
	}
	return tables, nil
}

func (h *Handler) describeTableInternal(ctx context.Context, table string) (interface{}, error) {
	query := `
		SELECT column_name, data_type, is_nullable, column_default
		FROM information_schema.columns 
		WHERE table_name = $1 AND table_schema = 'public'
	`
	rows, err := h.DB.Query(ctx, query, table)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var columns []interface{}
	for rows.Next() {
		var name, dtype, nullable, def *string
		rows.Scan(&name, &dtype, &nullable, &def)
		columns = append(columns, fiber.Map{
			"name":     name,
			"type":     dtype,
			"nullable": nullable,
			"default":  def,
		})
	}
	return columns, nil
}

func (h *Handler) executeRawSQL(ctx context.Context, query string) (interface{}, error) {
	isSelect := strings.HasPrefix(strings.ToUpper(strings.TrimSpace(query)), "SELECT") || strings.HasPrefix(strings.ToUpper(strings.TrimSpace(query)), "WITH")

	if isSelect {
		rows, err := h.DB.Query(ctx, query)
		if err != nil {
			return nil, err
		}
		defer rows.Close()

		fieldDescriptions := rows.FieldDescriptions()
		columns := make([]string, len(fieldDescriptions))
		for i, fd := range fieldDescriptions {
			columns[i] = fd.Name
		}

		var results []map[string]any
		for rows.Next() {
			values, err := rows.Values()
			if err != nil {
				return nil, err
			}

			rowMap := make(map[string]any)
			for i, col := range columns {
				val := values[i]
				if b, ok := val.([16]byte); ok {
					rowMap[col] = fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
				} else {
					rowMap[col] = val
				}
			}
			results = append(results, rowMap)
		}
		if results == nil {
			results = []map[string]any{}
		}
		return fiber.Map{"columns": columns, "rows": results}, nil
	} else {
		tag, err := h.DB.Exec(ctx, query)
		if err != nil {
			return nil, err
		}
		return fiber.Map{"message": "Query executed successfully", "rowsAffected": tag.RowsAffected()}, nil
	}
}
