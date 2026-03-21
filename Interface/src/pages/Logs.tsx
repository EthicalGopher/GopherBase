import { useState, useEffect } from 'react';
import { API_BASE, safeJson } from '../contexts/AuthContext';

interface Log {
  id: string;
  event: string;
  user: string;
  table: string;
  timestamp: string;
}

export default function Logs() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchLogs = async () => {
    try {
      const token = localStorage.getItem('gopherbase_access_token');
      const res = await fetch(`${API_BASE}/activity`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await safeJson(res);
      if (Array.isArray(data)) {
        setLogs(data);
      }
    } catch (err) {
      console.error('Failed to fetch logs', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getEventColor = (event: string) => {
    const e = event?.toUpperCase() || '';
    if (e.includes('DELETE') || e.includes('DROP')) return 'text-red-500 bg-red-500/10';
    if (e.includes('INSERT') || e.includes('CREATE')) return 'text-emerald-500 bg-emerald-500/10';
    if (e.includes('UPDATE') || e.includes('ALTER')) return 'text-amber-500 bg-amber-500/10';
    if (e.includes('SELECT')) return 'text-blue-500 bg-blue-500/10';
    return 'text-slate-500 bg-slate-500/10';
  };

  return (
    <div className="p-8 space-y-8 overflow-y-auto w-full h-full custom-scrollbar">
      <div className="flex flex-col gap-1">
        <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Activity Logs</h1>
        <p className="text-slate-500 dark:text-slate-400 text-base">Real-time API monitoring and database transactions.</p>
      </div>

      <div className="glass-card rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Time</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Event</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">User</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Table / Resource</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-sm text-slate-500 font-medium">Streaming logs...</p>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500 italic">No activity recorded yet.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-indigo-500/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(log.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-black tracking-tight ${getEventColor(log.event)}`}>
                        {log.event}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-500">
                          {log.user?.substring(0, 2).toUpperCase() || '??'}
                        </div>
                        <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">{log.user || 'System'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {log.table ? (
                        <code className="text-xs font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/50 px-1.5 py-0.5 rounded group-hover:text-indigo-500 transition-colors">
                          {log.table}
                        </code>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Global</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
