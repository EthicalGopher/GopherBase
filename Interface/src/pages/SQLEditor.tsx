import { useState } from 'react';
import { API_BASE, safeJson } from '../contexts/AuthContext';

export default function SQLEditor() {
  const [query, setQuery] = useState('SELECT * FROM auth;');
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [execTime, setExecTime] = useState<number | null>(null);

  const handleRunQuery = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);
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
      const data = await safeJson(res);
      const end = performance.now();
      setExecTime(Math.round(end - start));

      if (!res.ok) {
        throw new Error(data.error || 'Failed to execute query');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-900/20 overflow-hidden">
      {/* Editor Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-indigo-500 text-sm">terminal</span>
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">SQL Editor</h2>
            <p className="text-[10px] text-slate-500 font-medium">Execute raw PostgreSQL commands</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {execTime && (
            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
              Executed in {execTime}ms
            </span>
          )}
          <button 
            onClick={handleRunQuery}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
          >
            {isLoading ? (
              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <span className="material-symbols-outlined !text-sm">play_arrow</span>
            )}
            Run Query
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 grid grid-rows-2 overflow-hidden">
        {/* SQL Input */}
        <div className="relative border-b border-slate-200 dark:border-slate-800">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-full p-6 font-mono text-sm bg-white dark:bg-slate-900 outline-none resize-none custom-scrollbar text-slate-700 dark:text-slate-300"
            spellCheck={false}
          />
        </div>

        {/* Results Pane */}
        <div className="bg-white dark:bg-slate-900 flex flex-col overflow-hidden">
          <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Query Results</span>
            {result?.rows && (
              <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50/10 px-2 py-0.5 rounded">
                {result.rows.length} rows returned
              </span>
            )}
          </div>
          
          <div className="flex-1 overflow-auto custom-scrollbar">
            {error ? (
              <div className="p-8 flex flex-col items-center justify-center text-center max-w-lg mx-auto">
                <span className="material-symbols-outlined text-4xl text-red-500 mb-4 animate-bounce">warning</span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">SQL Execution Error</h3>
                <code className="text-xs font-mono bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl border border-red-100 dark:border-red-900/50 block w-full text-left whitespace-pre-wrap">
                  {error}
                </code>
              </div>
            ) : result?.rows ? (
              <div className="min-w-full">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                      {result.columns?.map((col: string) => (
                        <th key={col} className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest border-r border-slate-100 dark:border-slate-800 last:border-0">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {result.rows.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        {result.columns?.map((col: string) => (
                          <td key={col} className="px-4 py-3 text-xs font-mono text-slate-600 dark:text-slate-400 border-r border-slate-50 dark:border-slate-800 last:border-0 truncate max-w-xs">
                            {row[col] === null ? (
                              <span className="text-slate-300 italic">NULL</span>
                            ) : typeof row[col] === 'object' ? (
                              JSON.stringify(row[col])
                            ) : String(row[col])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : result?.message ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-emerald-500">check_circle</span>
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{result.message}</p>
                {result.rowsAffected !== undefined && (
                  <p className="text-xs text-slate-500 mt-1">{result.rowsAffected} rows affected</p>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-30 text-slate-400">
                <span className="material-symbols-outlined text-6xl mb-4">dataset</span>
                <p className="text-sm font-medium">Execute a query to see results</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
