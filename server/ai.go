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
		"User: 'What is GopherBase?'\nAgent: 'chat'\n" +
		"User: 'Select all users'\nAgent: 'command'\n" +
		"User: 'Create a table called products with name and price'\nAgent: 'command'\n" +
		"User: 'List all tables'\nAgent: 'command'\n" +
		"User: 'Hello, can you show me the last 5 logs?'\nAgent: 'both'\n" +
		"User: 'Explain how to use GopherBase and then delete the users table'\nAgent: 'both'"

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
		"Agent: 'GopherBase is an open-source Supabase alternative built in Go. It provides RESTful APIs, a lightweight TypeScript SDK, and an integrated interface for managing your PostgreSQL database.'\n" +
		"User: 'How do I install the SDK?'\n" +
		"Agent: 'You can install the GopherBase SDK using npm: `npm install gopherbase`. After that, you can initialize the client using the `createClient` function.'\n" +
		"User: 'Hello!'\n" +
		"Agent: 'Hi there! I am your GopherBase assistant. How can I help you today?'\n\n" +
		"Focus on general conversation, guidance, and explaining concepts. " +
		"STRICT RULE: DO NOT provide specific SQL queries or execute database commands. " +
		"If the user asks for database operations, politely explain that you are for general help and they should use the Command mode for database tasks."

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
				Description: "Execute a PostgreSQL query. Use for SELECT, INSERT, UPDATE, DELETE, CREATE, etc.",
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
				Description: "List all public tables.",
				Parameters: OllamaParameterSchema{
					Type:       "object",
					Properties: map[string]OllamaProperty{},
				},
			},
		},
	}

	systemPrompt := "You are a PostgreSQL Command Agent for GopherBase. " +
		"Your ONLY job is to execute SQL commands using tools.\n" +
		"RULES:\n" +
		"1. DO NOT TALK. DO NOT EXPLAIN.\n" +
		"2. ONLY CALL TOOLS OR OUTPUT JSON.\n" +
		"3. If tool calling is unavailable, output JSON: {\"name\": \"execute_sql\", \"arguments\": {\"sql\": \"...\"}}.\n" +
		"4. If you need to know which tables exist, call list_tables first.\n" +
		"EXAMPLES:\n" +
		"User: 'Show me all users'\n" +
		"Agent: {\"name\": \"execute_sql\", \"arguments\": {\"sql\": \"SELECT * FROM users;\"}}\n" +
		"User: 'Create a table for posts'\n" +
		"Agent: {\"name\": \"execute_sql\", \"arguments\": {\"sql\": \"CREATE TABLE posts (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), title TEXT, content TEXT, created_at TIMESTAMP DEFAULT NOW());\"}}\n" +
		"User: 'What tables are there?'\n" +
		"Agent: {\"name\": \"list_tables\", \"arguments\": {}}\n" +
		"User: 'Delete the table named old_data'\n" +
		"Agent: {\"name\": \"execute_sql\", \"arguments\": {\"sql\": \"DROP TABLE old_data;\"}}"

	messages := []OllamaMessage{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: prompt},
	}

	maxIterations := 3
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
			return AIResponse{Agent: "command", Text: "Connection Error: " + err.Error()}
		}
		defer resp.Body.Close()

		var ollamaResp OllamaChatResponse
		if err := json.NewDecoder(resp.Body).Decode(&ollamaResp); err != nil {
			return AIResponse{Agent: "command", Text: "Decode Error: " + err.Error()}
		}

		// Try to extract tool call if native ToolCalls is empty
		if len(ollamaResp.Message.ToolCalls) == 0 && ollamaResp.Message.Content != "" {
			extracted := h.tryExtractToolCall(ollamaResp.Message.Content)
			if extracted != nil {
				ollamaResp.Message.ToolCalls = []ToolCall{*extracted}
			}
		}

		messages = append(messages, ollamaResp.Message)

		if len(ollamaResp.Message.ToolCalls) == 0 {
			return AIResponse{
				Agent:    "command",
				Text:     ollamaResp.Message.Content,
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
				if args.SQL == "" {
					var raw map[string]interface{}
					json.Unmarshal(tc.Function.Arguments, &raw)
					if s, ok := raw["sql"].(string); ok {
						args.SQL = s
					}
				}
				
				if args.SQL != "" {
					result, toolError = h.executeRawSQL(ctx, args.SQL)
					toolExecutions = append(toolExecutions, fiber.Map{
						"tool": "execute_sql", 
						"query": args.SQL, 
						"result": result, 
						"error": func() string { if toolError != nil { return toolError.Error() }; return "" }(),
					})
				}
			case "list_tables":
				result, toolError = h.listTablesInternal(ctx)
				toolExecutions = append(toolExecutions, fiber.Map{
					"tool": "list_tables", 
					"result": result,
				})
			}

			resBytes, _ := json.Marshal(result)
			messages = append(messages, OllamaMessage{
				Role:       "tool",
				Content:    string(resBytes),
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
	// 1. Look for markdown SQL blocks first
	sqlRegex := regexp.MustCompile("(?s)```sql\\s*(.*?)\\s*```")
	if match := sqlRegex.FindStringSubmatch(content); len(match) > 1 {
		return &ToolCall{
			Function: FunctionCall{
				Name:      "execute_sql",
				Arguments: json.RawMessage(fmt.Sprintf(`{"sql": %q}`, strings.TrimSpace(match[1]))),
			},
		}
	}

	// 2. Look for JSON-like tool call structure
	jsonRegex := regexp.MustCompile(`\{.*"name".*"(execute_sql|list_tables)".*\}`)
	if match := jsonRegex.FindString(content); match != "" {
		var tc struct {
			Name      string          `json:"name"`
			Arguments json.RawMessage `json:"arguments"`
		}
		if err := json.Unmarshal([]byte(match), &tc); err == nil && tc.Name != "" {
			return &ToolCall{
				Function: FunctionCall{
					Name:      tc.Name,
					Arguments: tc.Arguments,
				},
			}
		}
	}

	// 3. Last resort: If it contains SELECT/INSERT/CREATE/UPDATE/DELETE
	upper := strings.ToUpper(content)
	if strings.Contains(upper, "SELECT") || strings.Contains(upper, "INSERT") || 
	   strings.Contains(upper, "CREATE TABLE") || strings.Contains(upper, "UPDATE") || 
	   strings.Contains(upper, "DELETE FROM") {
		return &ToolCall{
			Function: FunctionCall{
				Name:      "execute_sql",
				Arguments: json.RawMessage(fmt.Sprintf(`{"sql": %q}`, content)),
			},
		}
	}

	return nil
}

func (h *Handler) listTablesInternal(ctx context.Context) (interface{}, error) {
	query := `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name NOT LIKE 'pg_%' AND table_name NOT LIKE '_gopherbase_%'`
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
