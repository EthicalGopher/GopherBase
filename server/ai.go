package server

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"regexp"
	"strings"
	"sync"

	"github.com/gofiber/contrib/v3/websocket"
	"github.com/gofiber/fiber/v3"
	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
)

// AI Types & Constants
type AIQueryRequest struct {
	Prompt string `json:"prompt"`
	Mode   string `json:"mode"` // "command", "chat", "both", or "auto"
}

type AIResponse struct {
	Agent    string        `json:"agent"` // "chat", "command", or "decider"
	Text     string        `json:"text"`
	Response []interface{} `json:"response"`
}

const (
	OllamaModelName = "mistral:7b-instruct"

	DeciderSystemPrompt = "You are a Routing Agent for GopherBase. Your job is to decide if a user prompt requires a database operation (COMMAND), a general conversation (CHAT), or BOTH.\n" +
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

	ChatSystemPrompt = "You are a friendly GopherBase Chat Assistant.\n" +
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

	CommandSystemPrompt = "You are a PostgreSQL Expert Command Agent for GopherBase.\n" +
		"Your ONLY job is to execute SQL commands using tools.\n\n" +
		"CRITICAL RULES:\n" +
		"1. DO NOT TALK. DO NOT EXPLAIN. ONLY CALL TOOLS.\n" +
		"2. NEVER use '...' or placeholders. Every SQL query must be complete and valid.\n" +
		"3. UUID columns REQUIRE valid UUIDs. Use `gen_random_uuid()` for new IDs or existing UUID strings.\n" +
		"4. Column names and types vary. ALWAYS call `describe_table` before an INSERT if you haven't seen the schema yet.\n" +
		"5. Use single quotes for strings: 'example', NOT \"example\".\n" +
		"6. If a tool returns an error, analyze the error message and retry with fixed SQL.\n" +
		"7. If you reach the final step, just output the tool call. No additional text."
)

// Dynamic Configuration Helpers
func (h *Handler) getAIProvider() string {
	provider := h.GetConfigValue("AI_PROVIDER")
	if provider == "" {
		provider = os.Getenv("AI_PROVIDER")
	}

	finalProvider := "ollama"
	if strings.ToLower(provider) == "gemini" {
		finalProvider = "gemini"
	}

	log.Printf("[AI] Current provider: %s (from config: %s)", finalProvider, provider)
	return finalProvider
}

func (h *Handler) getGeminiAPIKey() string {
	key := h.GetConfigValue("GEMINI_API_KEY")
	if key == "" {
		key = os.Getenv("GEMINI_API_KEY")
	}
	return key
}

func (h *Handler) getOllamaHost() string {
	host := h.GetConfigValue("OLLAMA_HOST")
	if host == "" {
		host = os.Getenv("OLLAMA_HOST")
	}
	if host == "" {
		host = "http://localhost:11434"
	}
	return host
}

// Dispatcher Methods
func (h *Handler) runDeciderAgent(ctx context.Context, prompt string) string {
	if h.getAIProvider() == "gemini" {
		return h.runGeminiDeciderAgent(ctx, prompt)
	}
	return h.runOllamaDeciderAgent(ctx, prompt)
}

func (h *Handler) runChatAgent(ctx context.Context, prompt string) AIResponse {
	if h.getAIProvider() == "gemini" {
		return h.runGeminiChatAgent(ctx, prompt)
	}
	return h.runOllamaChatAgent(ctx, prompt)
}

func (h *Handler) runCommandAgent(ctx context.Context, prompt string) AIResponse {
	if h.getAIProvider() == "gemini" {
		return h.runGeminiCommandAgent(ctx, prompt)
	}
	return h.runOllamaCommandAgent(ctx, prompt)
}

// Gemini Implementation
func (h *Handler) runGeminiDeciderAgent(ctx context.Context, prompt string) string {
	apiKey := h.getGeminiAPIKey()
	if apiKey == "" {
		return "both"
	}

	client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		return "both"
	}
	defer client.Close()

	model := client.GenerativeModel("gemini-2.5-flash")
	model.SystemInstruction = &genai.Content{
		Parts: []genai.Part{genai.Text(DeciderSystemPrompt)},
	}

	resp, err := model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil || len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return "both"
	}

	part := resp.Candidates[0].Content.Parts[0]
	decision := strings.ToLower(strings.TrimSpace(fmt.Sprintf("%v", part)))

	if strings.Contains(decision, "both") {
		return "both"
	}
	if strings.Contains(decision, "command") {
		return "command"
	}
	return "chat"
}

func (h *Handler) runGeminiChatAgent(ctx context.Context, prompt string) AIResponse {
	apiKey := h.getGeminiAPIKey()
	if apiKey == "" {
		return AIResponse{Agent: "chat", Text: "Error: GEMINI_API_KEY not set"}
	}

	client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		return AIResponse{Agent: "chat", Text: "Error: " + err.Error()}
	}
	defer client.Close()

	model := client.GenerativeModel("gemini-2.5-flash")
	model.SystemInstruction = &genai.Content{
		Parts: []genai.Part{genai.Text(ChatSystemPrompt)},
	}

	resp, err := model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil || len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return AIResponse{Agent: "chat", Text: "Error generating response"}
	}

	return AIResponse{
		Agent: "chat",
		Text:  fmt.Sprintf("%v", resp.Candidates[0].Content.Parts[0]),
	}
}

func (h *Handler) runGeminiCommandAgent(ctx context.Context, prompt string) AIResponse {
	apiKey := h.getGeminiAPIKey()
	if apiKey == "" {
		return AIResponse{Agent: "command", Text: "Error: GEMINI_API_KEY not set"}
	}

	client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		return AIResponse{Agent: "command", Text: "Error: " + err.Error()}
	}
	defer client.Close()

	model := client.GenerativeModel("gemini-2.5-flash")
	model.SystemInstruction = &genai.Content{
		Parts: []genai.Part{genai.Text(CommandSystemPrompt)},
	}

	model.Tools = []*genai.Tool{
		{
			FunctionDeclarations: []*genai.FunctionDeclaration{
				{
					Name:        "execute_sql",
					Description: "Execute a PostgreSQL query. Use for SELECT, INSERT, UPDATE, DELETE, etc.",
					Parameters: &genai.Schema{
						Type: genai.TypeObject,
						Properties: map[string]*genai.Schema{
							"sql": {
								Type:        genai.TypeString,
								Description: "The exact PostgreSQL query to execute",
							},
						},
						Required: []string{"sql"},
					},
				},
				{
					Name:        "list_tables",
					Description: "List all public tables in the database.",
					Parameters: &genai.Schema{
						Type: genai.TypeObject,
					},
				},
				{
					Name:        "describe_table",
					Description: "Get column names and types for a specific table.",
					Parameters: &genai.Schema{
						Type: genai.TypeObject,
						Properties: map[string]*genai.Schema{
							"table": {
								Type:        genai.TypeString,
								Description: "The name of the table to describe",
							},
						},
						Required: []string{"table"},
					},
				},
			},
		},
	}

	session := model.StartChat()
	var toolExecutions []interface{}

	resp, err := session.SendMessage(ctx, genai.Text(prompt))
	if err != nil {
		return AIResponse{Agent: "command", Text: "Error: " + err.Error()}
	}

	maxIterations := 5
	for i := 0; i < maxIterations; i++ {
		if len(resp.Candidates) == 0 {
			break
		}

		var functionCalls []genai.FunctionCall
		for _, part := range resp.Candidates[0].Content.Parts {
			if fn, ok := part.(genai.FunctionCall); ok {
				functionCalls = append(functionCalls, fn)
			}
		}

		if len(functionCalls) == 0 {
			if len(resp.Candidates[0].Content.Parts) > 0 {
				return AIResponse{
					Agent:    "command",
					Text:     fmt.Sprintf("%v", resp.Candidates[0].Content.Parts[0]),
					Response: toolExecutions,
				}
			}
			break
		}

		var functionResponses []genai.Part
		for _, fn := range functionCalls {
			var result interface{}
			var toolError error

			switch fn.Name {
			case "execute_sql":
				sqlArg := fn.Args["sql"]
				sql, ok := sqlArg.(string)
				if !ok {
					toolError = fmt.Errorf("missing or invalid sql argument")
				} else {
					result, toolError = h.executeRawSQL(ctx, sql)
					toolExecutions = append(toolExecutions, fiber.Map{
						"tool": "execute_sql", "query": sql, "result": result,
						"error": func() string {
							if toolError != nil {
								return toolError.Error()
							}
							return ""
						}(),
					})
				}
			case "list_tables":
				result, toolError = h.listTablesInternal(ctx)
				toolExecutions = append(toolExecutions, fiber.Map{"tool": "list_tables", "result": result})
			case "describe_table":
				tableArg := fn.Args["table"]
				table, ok := tableArg.(string)
				if !ok {
					toolError = fmt.Errorf("missing or invalid table argument")
				} else {
					result, toolError = h.describeTableInternal(ctx, table)
					toolExecutions = append(toolExecutions, fiber.Map{"tool": "describe_table", "table": table, "result": result})
				}
			}

			resMap := make(map[string]interface{})
			if toolError != nil {
				resMap["error"] = toolError.Error()
			} else {
				resMap["result"] = result
			}

			functionResponses = append(functionResponses, genai.FunctionResponse{
				Name:     fn.Name,
				Response: resMap,
			})
		}

		resp, err = session.SendMessage(ctx, functionResponses...)
		if err != nil {
			return AIResponse{Agent: "command", Text: "Tool execution error: " + err.Error(), Response: toolExecutions}
		}
	}

	return AIResponse{Agent: "command", Text: "", Response: toolExecutions}
}

// Ollama Implementation
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

func (h *Handler) runOllamaDeciderAgent(ctx context.Context, prompt string) string {
	ollamaHost := h.getOllamaHost()

	messages := []OllamaMessage{
		{Role: "system", Content: DeciderSystemPrompt},
		{Role: "user", Content: prompt},
	}

	reqBody := OllamaChatRequest{Model: OllamaModelName, Messages: messages, Stream: false}
	jsonData, _ := json.Marshal(reqBody)
	resp, err := http.Post(ollamaHost+"/api/chat", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return "both"
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

func (h *Handler) runOllamaChatAgent(ctx context.Context, prompt string) AIResponse {
	ollamaHost := h.getOllamaHost()

	messages := []OllamaMessage{
		{Role: "system", Content: ChatSystemPrompt},
		{Role: "user", Content: prompt},
	}

	reqBody := OllamaChatRequest{Model: OllamaModelName, Messages: messages, Stream: false}
	jsonData, _ := json.Marshal(reqBody)
	resp, err := http.Post(ollamaHost+"/api/chat", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return AIResponse{Agent: "chat", Text: "Error: " + err.Error()}
	}
	defer resp.Body.Close()

	var ollamaResp OllamaChatResponse
	json.NewDecoder(resp.Body).Decode(&ollamaResp)

	return AIResponse{Agent: "chat", Text: ollamaResp.Message.Content}
}

func (h *Handler) runOllamaCommandAgent(ctx context.Context, prompt string) AIResponse {
	ollamaHost := h.getOllamaHost()

	tools := []OllamaTool{
		{
			Type: "function",
			Function: OllamaFunctionDesc{
				Name:        "execute_sql",
				Description: "Execute a PostgreSQL query.",
				Parameters: OllamaParameterSchema{
					Type: "object",
					Properties: map[string]OllamaProperty{
						"sql": {Type: "string", Description: "The exact PostgreSQL query to execute"},
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
				Parameters:  OllamaParameterSchema{Type: "object", Properties: map[string]OllamaProperty{}},
			},
		},
		{
			Type: "function",
			Function: OllamaFunctionDesc{
				Name:        "describe_table",
				Description: "Get column names and types.",
				Parameters: OllamaParameterSchema{
					Type: "object",
					Properties: map[string]OllamaProperty{
						"table": {Type: "string", Description: "The name of the table to describe"},
					},
					Required: []string{"table"},
				},
			},
		},
	}

	messages := []OllamaMessage{
		{Role: "system", Content: CommandSystemPrompt},
		{Role: "user", Content: prompt},
	}

	maxIterations := 5
	var toolExecutions []interface{}

	for i := 0; i < maxIterations; i++ {
		reqBody := OllamaChatRequest{Model: OllamaModelName, Messages: messages, Tools: tools, Stream: false}
		jsonData, _ := json.Marshal(reqBody)
		resp, err := http.Post(ollamaHost+"/api/chat", "application/json", bytes.NewBuffer(jsonData))
		if err != nil {
			return AIResponse{Agent: "command", Text: "Connection Error: " + err.Error()}
		}
		defer resp.Body.Close()

		var ollamaResp OllamaChatResponse
		json.NewDecoder(resp.Body).Decode(&ollamaResp)

		if len(ollamaResp.Message.ToolCalls) == 0 && ollamaResp.Message.Content != "" {
			extracted := h.tryExtractToolCall(ollamaResp.Message.Content)
			if extracted != nil {
				ollamaResp.Message.ToolCalls = []ToolCall{*extracted}
			}
		}

		if len(ollamaResp.Message.ToolCalls) == 0 {
			if ollamaResp.Message.Content != "" {
				return AIResponse{Agent: "command", Text: ollamaResp.Message.Content, Response: toolExecutions}
			}
			break
		}

		messages = append(messages, ollamaResp.Message)
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
					toolExecutions = append(toolExecutions, fiber.Map{
						"tool": "execute_sql", "query": args.SQL, "result": result,
						"error": func() string {
							if toolError != nil {
								return toolError.Error()
							}
							return ""
						}(),
					})
				}
			case "list_tables":
				result, toolError = h.listTablesInternal(ctx)
				toolExecutions = append(toolExecutions, fiber.Map{"tool": "list_tables", "result": result})
			case "describe_table":
				var args struct {
					Table string `json:"table"`
				}
				json.Unmarshal(tc.Function.Arguments, &args)
				if args.Table != "" {
					result, toolError = h.describeTableInternal(ctx, args.Table)
					toolExecutions = append(toolExecutions, fiber.Map{"tool": "describe_table", "table": args.Table, "result": result})
				}
			}

			var resultContent string
			if toolError != nil {
				resultContent = fmt.Sprintf("Error: %v", toolError)
			} else {
				resBytes, _ := json.Marshal(result)
				resultContent = string(resBytes)
			}

			messages = append(messages, OllamaMessage{
				Role: "tool", Content: resultContent, ToolCallID: tc.ID,
			})
		}
	}

	return AIResponse{Agent: "command", Text: "", Response: toolExecutions}
}

// Entry Points
func (h *Handler) AIWebSocket(conn *websocket.Conn) {
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

		mode := req.Mode
		if mode == "both" || mode == "auto" || mode == "" {
			mode = h.runDeciderAgent(context.Background(), req.Prompt)
		}

		var wg sync.WaitGroup
		respChan := make(chan AIResponse, 2)

		if mode == "chat" || mode == "both" {
			wg.Add(1)
			go func() {
				defer wg.Done()
				respChan <- h.runChatAgent(context.Background(), req.Prompt)
			}()
		}

		if mode == "command" || mode == "both" {
			wg.Add(1)
			go func() {
				defer wg.Done()
				respChan <- h.runCommandAgent(context.Background(), req.Prompt)
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
	if h.DB == nil {
		return c.Status(503).JSON(fiber.Map{"error": "Database not ready"})
	}
	var body AIQueryRequest
	if err := c.Bind().Body(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	mode := body.Mode
	if mode == "both" || mode == "auto" || mode == "" {
		mode = h.runDeciderAgent(c.Context(), body.Prompt)
	}

	if mode == "command" {
		resp := h.runCommandAgent(c.Context(), body.Prompt)
		return c.JSON(fiber.Map{"agent": "command", "text": resp.Text, "response": resp.Response})
	} else {
		resp := h.runChatAgent(c.Context(), body.Prompt)
		return c.JSON(fiber.Map{"agent": "chat", "text": resp.Text, "response": resp.Response})
	}
}

// Helpers
func (h *Handler) tryExtractToolCall(content string) *ToolCall {
	sqlRegex := regexp.MustCompile("(?s)```sql\\s*(.*?)\\s*```")
	if match := sqlRegex.FindStringSubmatch(content); len(match) > 1 {
		return &ToolCall{
			Function: FunctionCall{
				Name:      "execute_sql",
				Arguments: json.RawMessage(fmt.Sprintf(`{"sql": %q}`, strings.TrimSpace(match[1]))),
			},
		}
	}

	trimmed := strings.TrimSpace(content)
	upper := strings.ToUpper(trimmed)
	if strings.HasPrefix(upper, "SELECT") || strings.HasPrefix(upper, "INSERT") ||
		strings.HasPrefix(upper, "CREATE") || strings.HasPrefix(upper, "UPDATE") ||
		strings.HasPrefix(upper, "DELETE") {
		return &ToolCall{
			Function: FunctionCall{
				Name:      "execute_sql",
				Arguments: json.RawMessage(fmt.Sprintf(`{"sql": %q}`, trimmed)),
			},
		}
	}

	return nil
}

func (h *Handler) listTablesInternal(ctx context.Context) (interface{}, error) {
	if h.DB == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	query := `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name NOT LIKE 'pg_%' AND table_name NOT LIKE '_gopherbase_%'`
	rows, err := h.DB.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tables []any
	for rows.Next() {
		var name string
		rows.Scan(&name)
		tables = append(tables, name)
	}
	return tables, nil
}

func (h *Handler) describeTableInternal(ctx context.Context, table string) (interface{}, error) {
	if h.DB == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	query := `SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = $1 AND table_schema = 'public'`
	rows, err := h.DB.Query(ctx, query, table)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var columns []any
	for rows.Next() {
		var name, dtype, nullable, def *string
		rows.Scan(&name, &dtype, &nullable, &def)
		
		columns = append(columns, map[string]any{
			"name":     derefString(name),
			"type":     derefString(dtype),
			"nullable": derefString(nullable),
			"default":  derefString(def),
		})
	}
	return columns, nil
}

func derefString(s *string) any {
	if s == nil {
		return nil
	}
	return *s
}

func (h *Handler) executeRawSQL(ctx context.Context, query string) (interface{}, error) {
	if h.DB == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	isSelect := strings.HasPrefix(strings.ToUpper(strings.TrimSpace(query)), "SELECT") || strings.HasPrefix(strings.ToUpper(strings.TrimSpace(query)), "WITH")

	if isSelect {
		rows, err := h.DB.Query(ctx, query)
		if err != nil {
			return nil, err
		}
		defer rows.Close()

		fd := rows.FieldDescriptions()
		columns := make([]string, len(fd))
		for i, f := range fd {
			columns[i] = f.Name
		}

		var results []any
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
		
		colAny := make([]any, len(columns))
		for i, v := range columns { colAny[i] = v }

		return map[string]any{"columns": colAny, "rows": results}, nil
	} else {
		tag, err := h.DB.Exec(ctx, query)
		if err != nil {
			return nil, err
		}
		return map[string]any{"message": "Query executed successfully", "rowsAffected": tag.RowsAffected()}, nil
	}
}
