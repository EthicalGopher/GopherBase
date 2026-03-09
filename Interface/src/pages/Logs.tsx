export default function Logs() {
  return (
    <div className="flex flex-col h-full w-full">
      {/* Page Header & Toolbar */}
      <div className="flex flex-col border-b border-slate-200 bg-white px-8 py-6 dark:border-slate-800 dark:bg-background-dark/50">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">System Logs</h1>
            <p className="text-sm text-slate-500">Streaming logs from cluster-01 in real-time</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 dark:bg-slate-800">
              <span className="flex h-2 w-2 animate-pulse rounded-full bg-green-500"></span>
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Live Streaming</span>
            </div>
            <button className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary/90">
              <span className="material-symbols-outlined text-sm">pause</span>
              Pause Stream
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[300px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">filter_alt</span>
            <input className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm focus:border-primary focus:ring-0 dark:border-slate-700 dark:bg-slate-900/50" placeholder="Filter by message, trace ID, host..." type="text" />
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium dark:border-slate-700">
              Level: All
              <span className="material-symbols-outlined text-sm">expand_more</span>
            </button>
            <button className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium dark:border-slate-700">
              Service: All
              <span className="material-symbols-outlined text-sm">expand_more</span>
            </button>
            <button className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium dark:border-slate-700">
              Last 15m
              <span className="material-symbols-outlined text-sm">expand_more</span>
            </button>
          </div>
          <button className="ml-auto text-xs font-medium text-primary hover:underline">
            Export Logs
          </button>
        </div>
      </div>

      {/* Log Viewer */}
      <div className="flex-1 overflow-auto bg-white dark:bg-slate-950 font-mono text-sm leading-relaxed">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
            <tr>
              <th className="w-56 border-b border-slate-200 px-4 py-2 text-left dark:border-slate-800">Timestamp</th>
              <th className="w-24 border-b border-slate-200 px-4 py-2 text-left dark:border-slate-800">Level</th>
              <th className="border-b border-slate-200 px-4 py-2 text-left dark:border-slate-800">Message</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
            {/* Info Log */}
            <tr className="group hover:bg-slate-50 dark:hover:bg-slate-900/50">
              <td className="whitespace-nowrap px-4 py-1.5 text-slate-400">2023-11-24 14:32:01.442</td>
              <td className="px-4 py-1.5">
                <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-bold text-blue-500">INFO</span>
              </td>
              <td className="px-4 py-1.5 text-slate-700 dark:text-slate-300">Connection established to master node cluster-01-main</td>
            </tr>
            {/* Error Log */}
            <tr className="group hover:bg-red-500/5 bg-red-500/5 dark:bg-red-950/20">
              <td className="whitespace-nowrap px-4 py-1.5 text-slate-400">2023-11-24 14:32:05.129</td>
              <td className="px-4 py-1.5">
                <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold text-red-500 uppercase">ERROR</span>
              </td>
              <td className="px-4 py-1.5 text-red-600 dark:text-red-400">Database connection pool exhausted. Retrying in 500ms... [trace_id=4f92-91bc]</td>
            </tr>
            {/* Warn Log */}
            <tr className="group hover:bg-slate-50 dark:hover:bg-slate-900/50">
              <td className="whitespace-nowrap px-4 py-1.5 text-slate-400">2023-11-24 14:32:08.001</td>
              <td className="px-4 py-1.5">
                <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-500">WARN</span>
              </td>
              <td className="px-4 py-1.5 text-slate-700 dark:text-slate-300">Query execution time (1200ms) exceeded threshold (1000ms) on 'users_v2'</td>
            </tr>
            {/* Info Logs */}
            <tr className="group hover:bg-slate-50 dark:hover:bg-slate-900/50">
              <td className="whitespace-nowrap px-4 py-1.5 text-slate-400">2023-11-24 14:32:10.882</td>
              <td className="px-4 py-1.5">
                <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-bold text-blue-500">INFO</span>
              </td>
              <td className="px-4 py-1.5 text-slate-700 dark:text-slate-300">Indexing completed for collection 'events_log_2023' (2.4M rows affected)</td>
            </tr>
            <tr className="group hover:bg-slate-50 dark:hover:bg-slate-900/50">
              <td className="whitespace-nowrap px-4 py-1.5 text-slate-400">2023-11-24 14:32:12.311</td>
              <td className="px-4 py-1.5">
                <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-bold text-blue-500">INFO</span>
              </td>
              <td className="px-4 py-1.5 text-slate-700 dark:text-slate-300">Auth middleware initialized for tenant_id: t-88219</td>
            </tr>
            <tr className="group hover:bg-slate-50 dark:hover:bg-slate-900/50">
              <td className="whitespace-nowrap px-4 py-1.5 text-slate-400">2023-11-24 14:32:15.004</td>
              <td className="px-4 py-1.5">
                <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-bold text-blue-500">INFO</span>
              </td>
              <td className="px-4 py-1.5 text-slate-700 dark:text-slate-300">Received heartbeat from secondary replica set 'rs-west-01'</td>
            </tr>
            {/* Error Log */}
            <tr className="group hover:bg-red-500/5 bg-red-500/5 dark:bg-red-950/20">
              <td className="whitespace-nowrap px-4 py-1.5 text-slate-400">2023-11-24 14:32:18.492</td>
              <td className="px-4 py-1.5">
                <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold text-red-500 uppercase">ERROR</span>
              </td>
              <td className="px-4 py-1.5 text-red-600 dark:text-red-400">Failed to write transaction to WAL: Disk quota exceeded on /var/lib/nexadb/data</td>
            </tr>
            {/* More Info */}
            <tr className="group hover:bg-slate-50 dark:hover:bg-slate-900/50">
              <td className="whitespace-nowrap px-4 py-1.5 text-slate-400">2023-11-24 14:32:20.100</td>
              <td className="px-4 py-1.5">
                <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-bold text-blue-500">INFO</span>
              </td>
              <td className="px-4 py-1.5 text-slate-700 dark:text-slate-300">Compaction strategy 'LeveledCompaction' started for table 'metrics_store'</td>
            </tr>
            <tr className="group hover:bg-slate-50 dark:hover:bg-slate-900/50">
              <td className="whitespace-nowrap px-4 py-1.5 text-slate-400">2023-11-24 14:32:22.562</td>
              <td className="px-4 py-1.5">
                <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-bold text-blue-500">INFO</span>
              </td>
              <td className="px-4 py-1.5 text-slate-700 dark:text-slate-300">GC overhead at 2.1%. Memory usage stable at 4.2GB / 8GB</td>
            </tr>
            <tr className="group hover:bg-slate-50 dark:hover:bg-slate-900/50">
              <td className="whitespace-nowrap px-4 py-1.5 text-slate-400">2023-11-24 14:32:25.881</td>
              <td className="px-4 py-1.5">
                <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-bold text-blue-500">INFO</span>
              </td>
              <td className="px-4 py-1.5 text-slate-700 dark:text-slate-300">New client connection accepted from 192.168.1.44:55201</td>
            </tr>
            <tr className="group hover:bg-slate-50 dark:hover:bg-slate-900/50">
              <td className="whitespace-nowrap px-4 py-1.5 text-slate-400">2023-11-24 14:32:28.112</td>
              <td className="px-4 py-1.5">
                <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-bold text-blue-500">INFO</span>
              </td>
              <td className="px-4 py-1.5 text-slate-700 dark:text-slate-300">Query planner: Optimized JOIN order for 3 table scan</td>
            </tr>
            <tr className="group hover:bg-slate-50 dark:hover:bg-slate-900/50">
              <td className="whitespace-nowrap px-4 py-1.5 text-slate-400">2023-11-24 14:32:30.402</td>
              <td className="px-4 py-1.5">
                <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-bold text-blue-500">INFO</span>
              </td>
              <td className="px-4 py-1.5 text-slate-700 dark:text-slate-300">Backup process 'nightly_full' scheduled to start in 3h 27m</td>
            </tr>
          </tbody>
        </table>

        {/* Bottom Indicator */}
        <div className="flex items-center justify-center p-8 text-slate-400">
          <div className="flex flex-col items-center gap-2">
            <span className="material-symbols-outlined animate-spin">refresh</span>
            <span className="text-xs">Listening for incoming logs...</span>
          </div>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-2 dark:border-slate-800 dark:bg-background-dark">
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Events</span>
            <span className="text-xs font-semibold">1,248,302</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Errors (24h)</span>
            <span className="text-xs font-semibold text-red-500">42</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Storage</span>
            <span className="text-xs font-semibold">12.4 GB</span>
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
