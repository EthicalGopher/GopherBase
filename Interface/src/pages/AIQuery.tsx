import { useState, useEffect, useRef } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  agent?: 'chat' | 'command';
  response?: any[];
}

export default function AIQuery() {
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<'chat' | 'command' | 'both'>('both');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Initialize WebSocket connecting to the new top-level endpoint
    const wsUrl = "ws://127.0.0.1:8080/ws";
    console.log("Connecting to WebSocket:", wsUrl);
    
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log("WebSocket connected successfully");
      setConnected(true);
      setError(null);
    };

    socket.onmessage = (event) => {
      console.log("WebSocket message received:", event.data);
      try {
        const data = JSON.parse(event.data);
        if (data.error) {
          setError(data.error);
          setLoading(false);
          return;
        }

        const assistantMessage: Message = {
          role: 'assistant',
          agent: data.agent,
          content: data.text,
          response: data.response
        };

        setMessages(prev => [...prev, assistantMessage]);
        setLoading(false);
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err);
      }
    };

    socket.onerror = (event) => {
      console.error("WebSocket error observed:", event);
      setError("WebSocket connection failed. Ensure backend is running.");
      setLoading(false);
      setConnected(false);
    };

    socket.onclose = (event) => {
      console.log("WebSocket connection closed:", event.code, event.reason);
      setConnected(false);
    };

    return () => {
      socket.close();
    };
  }, []);

  const handleSend = () => {
    if (!prompt.trim() || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      if (!connected) setError("Not connected to AI server");
      return;
    }

    const userMessage: Message = { role: 'user', content: prompt };
    setMessages(prev => [...prev, userMessage]);
    
    setLoading(true);
    setError(null);

    socketRef.current.send(JSON.stringify({
      prompt: prompt,
      mode: mode
    }));

    setPrompt('');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-900/50">
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">smart_toy</span>
            AI Assistant
            {connected ? (
              <span className="w-2 h-2 bg-green-500 rounded-full" title="Connected"></span>
            ) : (
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" title="Disconnected"></span>
            )}
          </h1>
          <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-1">
            {(['chat', 'command', 'both'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-4 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${
                  mode === m 
                    ? 'bg-white dark:bg-slate-800 text-primary shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="max-w-4xl mx-auto space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 p-3 rounded-xl text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">error</span>
              {error}
            </div>
          )}

          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
              <span className="material-symbols-outlined text-6xl mb-4">smart_toy</span>
              <h2 className="text-xl font-bold text-slate-600 dark:text-slate-300">GopherBase AI Assistant</h2>
              <p className="mt-2 text-center max-w-md">
                I'm powered by two specialized agents: a <b>Chat Agent</b> for general help and a <b>Command Agent</b> for database operations.
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              {msg.agent && (
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 px-2">
                  {msg.agent} Agent
                </span>
              )}
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-primary text-white' 
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
              }`}>
                <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                
                {msg.response && msg.response.length > 0 && (
                  <div className="mt-4 space-y-4">
                    {msg.response.map((res: any, j: number) => (
                      <div key={j} className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-200 dark:border-slate-800">
                        <div className="text-[10px] font-mono text-slate-400 mb-2 uppercase tracking-wider">
                          {res.tool}: {res.query || res.table || ''}
                        </div>
                        
                        {res.error ? (
                          <div className="text-xs text-red-500 font-mono">Error: {res.error}</div>
                        ) : res.result?.rows ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-[11px]">
                              <thead>
                                <tr>
                                  {res.result.columns.slice(0, 5).map((col: string) => (
                                    <th key={col} className="p-1 border-b border-slate-200 dark:border-slate-700 text-slate-500">{col}</th>
                                  ))}
                                  {res.result.columns.length > 5 && <th className="p-1 border-b border-slate-200 dark:border-slate-700">...</th>}
                                </tr>
                              </thead>
                              <tbody>
                                {res.result.rows.slice(0, 5).map((row: any, k: number) => (
                                  <tr key={k}>
                                    {res.result.columns.slice(0, 5).map((col: string) => (
                                      <td key={col} className="p-1 font-mono text-slate-400">{String(row[col])}</td>
                                    ))}
                                    {res.result.columns.length > 5 && <td className="p-1">...</td>}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-xs text-green-500">
                            {typeof res.result === 'string' ? res.result : JSON.stringify(res.result)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-sm text-slate-400 italic">Processing...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
        <div className="max-w-4xl mx-auto flex gap-3">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask AI to run a query or manage your database..."
            className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={loading || !prompt.trim() || !connected}
            className="bg-primary text-white p-3 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined">send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
