import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useDatabase } from '../contexts/DatabaseContext';
import { useAuth } from '../contexts/AuthContext';

export default function Sidebar() {
  const location = useLocation();
  const [isTablesOpen, setIsTablesOpen] = useState(true);
  const { tables } = useDatabase();
  const { signOut, user } = useAuth();

  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-800 flex flex-col h-screen sticky top-0 bg-white dark:bg-background-dark">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-white">
          <span className="material-symbols-outlined text-xl">database</span>
        </div>
        <div>
          <h1 className="font-bold text-lg leading-none">GopherBase</h1>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold mt-1">Dev Console</p>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        <NavLink to="/" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive ? 'sidebar-item-active text-primary font-semibold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'}`}>
          <span className={`material-symbols-outlined ${location.pathname === '/' ? 'fill-1' : ''}`}>dashboard</span>
          <span className="text-sm">Dashboard</span>
        </NavLink>

        <div className="space-y-1">
          <button
            onClick={() => setIsTablesOpen(!isTablesOpen)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium`}
          >
            <div className="flex items-center gap-3">
              <span className={`material-symbols-outlined ${location.pathname.startsWith('/tables') ? 'text-primary fill-1' : ''}`}>table_chart</span>
              <span className={`text-sm ${location.pathname.startsWith('/tables') ? 'text-primary font-semibold' : ''}`}>Tables</span>
            </div>
            <span className={`material-symbols-outlined text-sm transition-transform duration-200 ${isTablesOpen ? 'rotate-180' : ''}`}>expand_more</span>
          </button>

          {isTablesOpen && (
            <div className="ml-4 pl-4 border-l border-slate-200 dark:border-slate-800 space-y-1 mt-1">
              {tables.filter(t => t !== 'auth' && t !== '_gopherbase_config').length === 0 ? (
                <div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">No tables yet</div>
              ) : (
                tables
                  .filter(t => t !== 'auth' && t !== '_gopherbase_config')
                  .map((table) => (
                    <NavLink
                      key={table}
                      to={`/tables/${table}`}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-xs font-medium ${
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`
                      }
                    >
                      <span className="material-symbols-outlined text-sm">table</span>
                      <span className="capitalize">{table}</span>
                    </NavLink>
                  ))
              )}
            </div>
          )}
        </div>

        <NavLink to="/sql-editor" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive ? 'sidebar-item-active text-primary font-semibold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'}`}>
          <span className={`material-symbols-outlined ${location.pathname === '/sql-editor' ? 'fill-1' : ''}`}>terminal</span>
          <span className="text-sm">SQL Editor</span>
        </NavLink>
        <NavLink to="/auth" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive ? 'sidebar-item-active text-primary font-semibold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'}`}>
          <span className={`material-symbols-outlined ${location.pathname === '/auth' ? 'fill-1' : ''}`}>shield_person</span>
          <span className="text-sm">Auth</span>
        </NavLink>
        <NavLink to="/storage" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive ? 'sidebar-item-active text-primary font-semibold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'}`}>
          <span className={`material-symbols-outlined ${location.pathname === '/storage' ? 'fill-1' : ''}`}>cloud_queue</span>
          <span className="text-sm">Storage</span>
        </NavLink>
        <NavLink to="/logs" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive ? 'sidebar-item-active text-primary font-semibold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'}`}>
          <span className={`material-symbols-outlined ${location.pathname === '/logs' ? 'fill-1' : ''}`}>history_edu</span>
          <span className="text-sm">Logs</span>
        </NavLink>
      </nav>
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
        <div className="px-4 py-2 flex items-center justify-between text-xs text-slate-500">
          <span className="truncate max-w-[120px]">{user?.email}</span>
        </div>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all text-red-500 hover:bg-red-500/10 font-medium text-sm"
        >
          <span className="material-symbols-outlined text-lg">logout</span>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
