export default function SQLEditor() {
  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden h-full">
      {/* Code Editor Panel */}
      <div className="flex-1 relative flex flex-col bg-editor-bg overflow-hidden border-b border-slate-200 dark:border-slate-800">
        <div className="flex-1 font-mono text-sm leading-relaxed p-6 overflow-auto custom-scrollbar select-none">
          <div className="flex gap-4">
            <div className="text-slate-600 text-right pr-4 select-none border-r border-slate-800/50">
              <div>1</div>
              <div>2</div>
              <div>3</div>
              <div>4</div>
              <div>5</div>
            </div>
            <div className="flex-1">
              <div><span className="sql-syntax-keyword">SELECT</span> *</div>
              <div><span className="sql-syntax-keyword">FROM</span> users</div>
              <div><span className="sql-syntax-keyword">WHERE</span> status = <span className="sql-syntax-string">'active'</span></div>
              <div><span className="sql-syntax-keyword">ORDER BY</span> created_at <span className="sql-syntax-keyword">DESC</span>;</div>
              <div className="w-1.5 h-5 bg-primary/60 inline-block animate-pulse align-middle ml-0.5"></div>
            </div>
          </div>
        </div>

        {/* Editor Footer */}
        <div className="px-6 py-2 bg-slate-900/40 border-t border-slate-800 flex justify-between items-center text-[10px] uppercase tracking-widest text-slate-500">
          <div className="flex gap-4">
            <span>PostgreSQL 15.4</span>
            <span>UTF-8</span>
          </div>
          <div className="flex gap-4">
            <span>Ln 4, Col 32</span>
            <span>Spaces: 4</span>
          </div>
        </div>
      </div>

      {/* Results Pane */}
      <div className="h-[40%] flex flex-col bg-background-light dark:bg-background-dark overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button className="text-sm font-semibold border-b-2 border-primary pb-1">Query Results</button>
            <button className="text-sm font-medium text-slate-500 pb-1">Execution Plan</button>
            <button className="text-sm font-medium text-slate-500 pb-1">Messages</button>
          </div>
          <div className="text-xs text-slate-500">
            Fetched 4 rows in 12ms
          </div>
        </div>
        
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900/80 backdrop-blur-sm shadow-sm z-10">
              <tr>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">id</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">username</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">email</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">status</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">created_at</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              <tr className="hover:bg-slate-50 dark:hover:bg-primary/5 transition-colors">
                <td className="px-6 py-4 text-sm font-mono text-slate-400">1024</td>
                <td className="px-6 py-4 text-sm font-medium">alex_mercer</td>
                <td className="px-6 py-4 text-sm text-slate-500">alex@nexa.io</td>
                <td className="px-6 py-4 text-sm"><span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase">active</span></td>
                <td className="px-6 py-4 text-sm text-slate-500">2023-11-24 14:20:01</td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-primary/5 transition-colors">
                <td className="px-6 py-4 text-sm font-mono text-slate-400">1023</td>
                <td className="px-6 py-4 text-sm font-medium">sarah_connor</td>
                <td className="px-6 py-4 text-sm text-slate-500">s.connor@sky.net</td>
                <td className="px-6 py-4 text-sm"><span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase">active</span></td>
                <td className="px-6 py-4 text-sm text-slate-500">2023-11-24 11:05:45</td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-primary/5 transition-colors">
                <td className="px-6 py-4 text-sm font-mono text-slate-400">1019</td>
                <td className="px-6 py-4 text-sm font-medium">neo_anderson</td>
                <td className="px-6 py-4 text-sm text-slate-500">thomas@metacortex.com</td>
                <td className="px-6 py-4 text-sm"><span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase">active</span></td>
                <td className="px-6 py-4 text-sm text-slate-500">2023-11-23 09:12:30</td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-primary/5 transition-colors">
                <td className="px-6 py-4 text-sm font-mono text-slate-400">1012</td>
                <td className="px-6 py-4 text-sm font-medium">j_wick</td>
                <td className="px-6 py-4 text-sm text-slate-500">babayaga@continental.com</td>
                <td className="px-6 py-4 text-sm"><span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase">active</span></td>
                <td className="px-6 py-4 text-sm text-slate-500">2023-11-22 22:55:10</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
