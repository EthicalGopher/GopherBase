import { useState, useEffect } from 'react';
import { gb } from '../lib/gopherbase';

interface TableColumn {
  name: string;
  dataType: string;
}

interface AuthUser {
  [key: string]: any;
}

export default function Auth() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [columns, setColumns] = useState<TableColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Schema to get all columns
      const schemaData = await gb.schema.getTableSchema('auth');
      
      // Filter out password columns
      const filteredCols = (schemaData as any[]).map(col => ({
        name: col.name,
        dataType: col.dataType
      })).filter(
        col => !col.name.toLowerCase().includes('password')
      );
      setColumns(filteredCols);

      // 2. Fetch User Data
      const usersData = await gb.from('auth').select().execute();
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load authentication data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto w-full h-full overflow-y-auto custom-scrollbar flex flex-col gap-8">
      {/* Content Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-slate-900 dark:text-white text-4xl font-black tracking-tight">Authentication</h2>
          <p className="text-slate-500 dark:text-slate-400 text-base">Manage your users, authentication providers, and access control policies.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center justify-center rounded-lg h-10 px-5 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white text-sm font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors border border-slate-300 dark:border-slate-700">
            <span className="material-symbols-outlined mr-2 text-lg">settings</span>
            Settings
          </button>
          <button className="flex items-center justify-center rounded-lg h-10 px-5 bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/10">
            <span className="material-symbols-outlined mr-2 text-lg">person_add</span>
            Invite User
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="flex gap-8">
          <a href="#" className="border-b-2 border-primary text-primary pb-4 px-1 text-sm font-bold tracking-wide">Users</a>
          <a href="#" className="border-b-2 border-transparent text-slate-500 dark:text-slate-400 pb-4 px-1 text-sm font-bold tracking-wide hover:text-slate-900 dark:hover:text-slate-200 transition-colors">Providers</a>
          <a href="#" className="border-b-2 border-transparent text-slate-500 dark:text-slate-400 pb-4 px-1 text-sm font-bold tracking-wide hover:text-slate-900 dark:hover:text-slate-200 transition-colors">Policies</a>
          <a href="#" className="border-b-2 border-transparent text-slate-500 dark:text-slate-400 pb-4 px-1 text-sm font-bold tracking-wide hover:text-slate-900 dark:hover:text-slate-200 transition-colors">Templates</a>
        </nav>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* User List Table Section */}
      <div className="bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                {columns.map(col => (
                  <th key={col.name} className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {col.name.replace(/_/g, ' ')}
                  </th>
                ))}
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-6 py-8 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined animate-spin">progress_activity</span>
                      <span className="text-sm">Loading users...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-6 py-8 text-center text-slate-500 text-sm">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user, idx) => (
                  <tr key={user.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    {columns.map(col => (
                      <td key={col.name} className="px-6 py-4">
                        {col.name === 'email' ? (
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase">
                              {user.email?.substring(0, 2) || '??'}
                            </div>
                            <span className="text-sm font-medium text-slate-900 dark:text-slate-200">{user[col.name]}</span>
                          </div>
                        ) : (
                          <span className={`text-sm ${col.name === 'id' ? 'font-mono text-xs text-slate-500' : 'text-slate-600 dark:text-slate-400'}`}>
                            {col.dataType?.includes('timestamp') 
                              ? new Date(user[col.name]).toLocaleString()
                              : String(user[col.name] ?? '')}
                          </span>
                        )}
                      </td>
                    ))}
                    <td className="px-6 py-4 text-right">
                      <button className="text-slate-400 hover:text-primary transition-colors">
                        <span className="material-symbols-outlined">more_horiz</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
            Showing {users.length} users
          </span>
          <div className="flex gap-2">
            <button className="p-1 rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-50" disabled>
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <button className="p-1 rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800">
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 flex flex-col gap-2">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Total Users</span>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-black text-slate-900 dark:text-white">{users.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
