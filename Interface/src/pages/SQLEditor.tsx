import { useState } from 'react';
import { API_BASE } from '../contexts/AuthContext';

export default function SQLEditor() {
  const [query, setQuery] = useState('SELECT * FROM _gopherbase_logs LIMIT 10;');
  const [results, setResults] = useState<{ columns: string[], rows: any[] } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [execTime, setExecTime] = useState<number | null>(null);

  const handleRunQuery = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    setResults(null);
    const start = performance.now();
    try {
      const token = localStorage.getItem('gopherbase_access_token');
      const res = await fetch(`${API_BASE}/query`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query })
      });
      const data = await res.json();
      const end = performance.now();
      setExecTime(Math.round(end - start));

      if (!res.ok) {
        throw new Error(data.error || 'Failed to execute query');
      }

      if (data.columns && data.rows) {
        setResults({ columns: data.columns, rows: data.rows });
      } else {
        setMessage(data.message + (data.rowsAffected !== undefined ? ` (${data.rowsAffected} rows affected)` : ''));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden h-full bg-editor-bg">
      {/* Code Editor Panel */}
      <div className="flex-1 relative flex flex-col overflow-hidden border-b border-slate-200 dark:border-slate-800">
        <div className="flex-1 flex font-mono text-sm leading-relaxed p-0 overflow-hidden">
          <div className="bg-slate-900/50 text-slate-500 text-right py-6 px-4 select-none border-r border-slate-800 flex flex-col">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            spellCheck={false}
            className="flex-1 bg-transparent text-slate-300 p-6 outline-none resize-none custom-scrollbar"
            placeholder="-- Write your SQL query here..."
          />
        </div>

        {/* Action Bar */}
        <div className="px-6 py-3 bg-slate-900/20 flex justify-between items-center border-t border-slate-800">
          <div className="flex gap-2">
            <button 
              onClick={handleRunQuery}
              disabled={loading}
              className="flex items-center gap-2 bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">{loading ? 'progress_activity' : 'play_arrow'}</span>
              {loading ? 'Running...' : 'Run Query'}
            </button>
            <button 
              onClick={() => setQuery('')}
              className="flex items-center gap-2 text-slate-400 hover:text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            >
              Clear
            </button>
          </div>
          <div className="flex gap-4 text-[10px] uppercase tracking-widest text-slate-500">
            <span>PostgreSQL 15.4</span>
            <span>UTF-8</span>
          </div>
        </div>
      </div>

      {/* Results Pane */}
      <div className="h-[45%] flex flex-col bg-background-light dark:bg-background-dark overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button className={`text-sm font-semibold pb-1 border-b-2 ${results ? 'border-primary text-slate-900 dark:text-white' : 'border-transparent text-slate-500'}`}>
              Query Results
            </button>
            <button className={`text-sm font-semibold pb-1 border-b-2 ${message || error ? 'border-primary text-slate-900 dark:text-white' : 'border-transparent text-slate-500'}`}>
              Messages
            </button>
          </div>
          {execTime !== null && (
            <div className="text-xs text-slate-500">
              {results ? `Fetched ${results.rows.length} rows` : 'Executed'} in {execTime}ms
            </div>
          )}
        </div>
        
        <div className="flex-1 overflow-auto custom-scrollbar">
          {error && (
            <div className="p-6">
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex gap-3 text-red-500">
                <span className="material-symbols-outlined">error</span>
                <div className="text-sm font-mono whitespace-pre-wrap">{error}</div>
              </div>
            </div>
          )}

          {message && !error && (
            <div className="p-6">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex gap-3 text-blue-500 font-mono text-sm">
                <span className="material-symbols-outlined">info</span>
                {message}
              </div>
            </div>
          )}

          {results && !error && (
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900/80 backdrop-blur-sm shadow-sm z-10">
                <tr>
                  {results.columns.map(col => (
                    <th key={col} className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {results.rows.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-primary/5 transition-colors">
                    {results.columns.map(col => (
                      <td key={col} className="px-6 py-3 text-sm font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {row[col] === null ? <span className="text-slate-500 italic">NULL</span> : String(row[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!results && !message && !error && !loading && (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
              <span className="material-symbols-outlined text-4xl mb-2">data_usage</span>
              <p className="text-sm">Run a query to see results</p>
            </div>
          )}

          {loading && (
            <div className="h-full flex flex-col items-center justify-center text-slate-500">
              <span className="material-symbols-outlined animate-spin text-4xl mb-2">progress_activity</span>
              <p className="text-sm">Executing query...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
