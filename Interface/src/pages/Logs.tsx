import { useState, useEffect } from 'react';
import { API_BASE } from '../contexts/AuthContext';

type ActivityLog = {
  id: string;
  event: string;
  user: string;
  table: string;
  timestamp: string;
};

export default function Logs() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const token = localStorage.getItem('gopherbase_access_token');
      const res = await fetch(`${API_BASE}/activity`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setLogs(data);
      }
    } catch (err) {
      console.error('Failed to fetch logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [isPaused]);

  const filteredLogs = logs.filter(log => 
    log.event.toLowerCase().includes(filter.toLowerCase()) ||
    log.user.toLowerCase().includes(filter.toLowerCase()) ||
    log.table.toLowerCase().includes(filter.toLowerCase())
  );

  const getLogLevel = (event: string) => {
    if (event.includes('FAIL') || event.includes('ERROR')) return 'ERROR';
    if (event.includes('WARN')) return 'WARN';
    return 'INFO';
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR': return 'bg-red-500/10 text-red-500';
      case 'WARN': return 'bg-amber-500/10 text-amber-500';
      default: return 'bg-blue-500/10 text-blue-500';
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Page Header & Toolbar */}
      <div className="flex flex-col border-b border-slate-200 bg-white px-8 py-6 dark:border-slate-800 dark:bg-background-dark/50">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">System Logs</h1>
            <p className="text-sm text-slate-500">Real-time database activity logs for GopherBase</p>
          </div>
          <div className="flex items-center gap-3">
            {!isPaused && (
              <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 dark:bg-slate-800">
                <span className="flex h-2 w-2 animate-pulse rounded-full bg-green-500"></span>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Live Streaming</span>
              </div>
            )}
            <button 
              onClick={() => setIsPaused(!isPaused)}
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary/90"
            >
              <span className="material-symbols-outlined text-sm">{isPaused ? 'play_arrow' : 'pause'}</span>
              {isPaused ? 'Resume Stream' : 'Pause Stream'}
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[300px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">filter_alt</span>
            <input 
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm focus:border-primary focus:ring-0 dark:border-slate-700 dark:bg-slate-900/50" 
              placeholder="Filter by event, user, table..." 
              type="text" 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium dark:border-slate-700">
              Level: All
              <span className="material-symbols-outlined text-sm">expand_more</span>
            </button>
            <button 
              onClick={fetchLogs}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Refresh
              <span className="material-symbols-outlined text-sm">refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Log Viewer */}
      <div className="flex-1 overflow-auto bg-white dark:bg-slate-950 font-mono text-sm leading-relaxed custom-scrollbar">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase text-[11px] font-bold tracking-wider z-10">
            <tr>
              <th className="w-56 border-b border-slate-200 px-4 py-2 text-left dark:border-slate-800">Timestamp</th>
              <th className="w-24 border-b border-slate-200 px-4 py-2 text-left dark:border-slate-800">Level</th>
              <th className="w-48 border-b border-slate-200 px-4 py-2 text-left dark:border-slate-800">User</th>
              <th className="border-b border-slate-200 px-4 py-2 text-left dark:border-slate-800">Event / Table</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">Loading logs...</td>
              </tr>
            ) : filteredLogs.length > 0 ? filteredLogs.map((log) => {
              const level = getLogLevel(log.event);
              return (
                <tr key={log.id} className="group hover:bg-slate-50 dark:hover:bg-slate-900/50">
                  <td className="whitespace-nowrap px-4 py-1.5 text-slate-400">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-1.5">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${getLevelColor(level)}`}>
                      {level}
                    </span>
                  </td>
                  <td className="px-4 py-1.5 text-slate-500 italic">
                    {log.user || 'system'}
                  </td>
                  <td className="px-4 py-1.5 text-slate-700 dark:text-slate-300">
                    <span className="font-bold">{log.event}</span>
                    {log.table && <span className="ml-2 text-primary opacity-80 text-xs">on "{log.table}"</span>}
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">No logs found matching your criteria.</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Bottom Indicator */}
        {!isPaused && !loading && (
          <div className="flex items-center justify-center p-8 text-slate-400">
            <div className="flex flex-col items-center gap-2">
              <span className="material-symbols-outlined animate-spin">refresh</span>
              <span className="text-xs">Listening for incoming logs...</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-2 dark:border-slate-800 dark:bg-background-dark">
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Displayed</span>
            <span className="text-xs font-semibold">{filteredLogs.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Errors</span>
            <span className="text-xs font-semibold text-red-500">
              {logs.filter(l => getLogLevel(l.event) === 'ERROR').length}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Auto Scroll</span>
          <div className="h-4 w-8 rounded-full bg-primary p-0.5 relative cursor-pointer">
            <div className="h-3 w-3 rounded-full bg-white absolute right-0.5 shadow-sm"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
