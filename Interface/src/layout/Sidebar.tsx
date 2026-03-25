import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useDatabase } from '../contexts/DatabaseContext';
import { useAuth } from '../contexts/AuthContext';
import AlertModal from '../components/AlertModal';

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isTablesOpen, setIsTablesOpen] = useState(true);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const { tables, dropTable } = useDatabase();
  const { signOut, user } = useAuth();

  const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' | 'info' | 'warning' }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const handleDropTable = async (tableName: string) => {
    setOpenMenu(null);
    if (!confirm(`Are you sure you want to drop table "${tableName}"? This action cannot be undone.`)) return;
    
    try {
      await dropTable(tableName);
      if (location.pathname === `/tables/${tableName}`) {
        navigate('/tables');
      }
      setAlertConfig({ isOpen: true, title: 'Success', message: `Table "${tableName}" dropped successfully`, type: 'success' });
    } catch (err: any) {
      setAlertConfig({ isOpen: true, title: 'Error', message: err.message, type: 'error' });
    }
  };

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
                  .filter(t => t !== 'auth' && t !== '_gopherbase_config' && t != '_gopherbase_logs' && t != `_gopherbase_files` && t!= `_gopherbase_buckets`)
                  .map((table) => (
                    <div key={table} className="relative group">
                      <NavLink
                        to={`/tables/${table}`}
                        className={({ isActive }) =>
                          `flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-all text-xs font-medium ${
                            isActive
                              ? 'bg-primary/10 text-primary'
                              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`
                        }
                      >
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-sm">table</span>
                          <span className="capitalize">{table}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setOpenMenu(openMenu === table ? null : table);
                          }}
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <span className="material-symbols-outlined text-sm">more_vert</span>
                        </button>
                      </NavLink>
                      <AnimatePresence>
                        {openMenu === table && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 z-50 min-w-[120px]"
                          >
                            <button
                              onClick={() => handleDropTable(table)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                              Drop Table
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))
              )}
            </div>
          )}
        </div>

        <NavLink to="/sql-editor" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive ? 'sidebar-item-active text-primary font-semibold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'}`}>
          <span className={`material-symbols-outlined ${location.pathname === '/sql-editor' ? 'fill-1' : ''}`}>terminal</span>
          <span className="text-sm">SQL Editor</span>
        </NavLink>
        <NavLink to="/ai-assistant" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive ? 'sidebar-item-active text-primary font-semibold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'}`}>
          <span className={`material-symbols-outlined ${location.pathname === '/ai-assistant' ? 'fill-1' : ''}`}>smart_toy</span>
          <span className="text-sm">AI Assistant</span>
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
        <NavLink to="/api-docs" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive ? 'sidebar-item-active text-primary font-semibold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'}`}>
          <span className={`material-symbols-outlined ${location.pathname === '/api-docs' ? 'fill-1' : ''}`}>api</span>
          <span className="text-sm">API Docs</span>
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive ? 'sidebar-item-active text-primary font-semibold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'}`}>
          <span className={`material-symbols-outlined ${location.pathname === '/settings' ? 'fill-1' : ''}`}>settings</span>
          <span className="text-sm">Settings</span>
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
      <AlertModal
        isOpen={alertConfig.isOpen}
        onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
      />
    </aside>
  );
}
