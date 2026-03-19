import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import AlertModal from '../components/AlertModal';
import Checkbox from '../components/Checkbox';
import { useDatabase } from '../contexts/DatabaseContext';
import { API_BASE } from '../contexts/AuthContext';

type ColumnDef = {
  id: string;
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isNullable: boolean;
  defaultValue: string;
  references?: {
    table: string;
    column: string;
  };
};

type DashboardStats = {
  activeConnections: number;
  storageUsageBytes: number;
  tableCount: number;
  apiRequests24h: number;
};

type TableColumn = {
  name: string;
  dataType: string;
  isNullable: string;
  columnDefault: string | null;
  isPrimary: boolean;
  isUnique: boolean;
  references: {
    table: string;
    column: string;
    onDelete: string;
    onUpdate: string;
  } | null;
};

export default function Dashboard() {
  const { createTable, tables } = useDatabase();
  const [isCreateTableModalOpen, setIsCreateTableModalOpen] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [newTableColumns, setNewTableColumns] = useState<ColumnDef[]>([
    { id: '1', name: 'id', type: 'uuid', isPrimaryKey: true, isNullable: false, defaultValue: 'gen_random_uuid()' }
  ]);
  const [refTableColumns, setRefTableColumns] = useState<Record<string, string[]>>({});

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string>('// Loading schema...');
  const [isLoadingCode, setIsLoadingCode] = useState(true);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(() => {
      fetchStats();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (tables.length > 0) {
      generateSchemaCode();
    } else {
      setGeneratedCode('// No user tables found in the database.\n// Create a table to see the initialization code.');
      setIsLoadingCode(false);
    }
  }, [tables]);

  const generateSchemaCode = async () => {
    setIsLoadingCode(true);
    try {
      const token = localStorage.getItem('gopherbase_access_token');
      let code = `import { createClient } from "gopherbase";\n\nconst gb = createClient("${window.location.origin}", "YOUR_PUBLIC_KEY");\n\nasync function setup() {\n`;

      const filteredTables = tables.filter(t => t !== 'auth' && t !== '_gopherbase_config' && t !== '_gopherbase_logs' && t !== '_gopherbase_buckets' && t !== '_gopherbase_files');

      if (filteredTables.length === 0) {
         setGeneratedCode('// No user tables found.\n// Create a table to generate initialization code.');
         setIsLoadingCode(false);
         return;
      }

      for (const table of filteredTables) {
        const res = await fetch(`${API_BASE}/schema/${table}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const columns: TableColumn[] = await res.json();

        code += `  // Create ${table} table\n`;
        code += `  await gb.schema.create("${table}")\n`;
        
        columns.forEach((col, idx) => {
          let dataType = col.dataType.toLowerCase();
          // Handle PostgreSQL array types (e.g. "text[]", "integer[]")
          if (dataType.includes('ARRAY') || dataType.startsWith('_')) {
             dataType = dataType.replace('_', '') + '[]';
          }
          
          let line = `    .column("${col.name}", "${dataType}")`;
          if (col.isPrimary) line += '.primary()';
          if (col.isUnique) line += '.unique()';
          if (col.isNullable === 'NO') line += '.notNull()';
          if (col.columnDefault) {
            let def = col.columnDefault;
            if (def.includes('::')) {
              def = def.split('::')[0];
            }
            // Ensure strings are quoted, but don't double-quote if already quoted
            if (isNaN(Number(def)) && def !== 'true' && def !== 'false' && !def.startsWith("'") && !def.startsWith('"')) {
              def = `"${def}"`;
            }
            line += `.default(${def})`;
          }
          if (col.references) {
            line += `.references("${col.references.table}", "${col.references.column}")`;
            if (col.references.onDelete && col.references.onDelete !== 'NO ACTION') {
              line += `.onDelete("${col.references.onDelete.toLowerCase()}")`;
            }
          }
          
          if (idx === columns.length - 1) {
            line += '.execute();\n\n';
          } else {
            line += '\n';
          }
          code += line;
        });
      }

      code += `  console.log("Database initialized successfully!");\n}\n\nsetup();`;
      setGeneratedCode(code);
    } catch (err) {
      console.error('Failed to generate schema code', err);
      setGeneratedCode('// Error generating schema code. Please try again.');
    }
    setIsLoadingCode(false);
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('gopherbase_access_token');
      const res = await fetch(`${API_BASE}/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats', err);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' | 'info' | 'warning' }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setAlertConfig({ isOpen: true, title, message, type });
  };

  const handleAddColumn = () => {
    setNewTableColumns([
      ...newTableColumns,
      { id: crypto.randomUUID(), name: '', type: 'text', isPrimaryKey: false, isNullable: true, defaultValue: '' }
    ]);
  };

  const handleRemoveColumn = (id: string) => {
    setNewTableColumns(newTableColumns.filter(col => col.id !== id));
  };

  const handleColumnChange = (id: string, field: keyof ColumnDef, value: any) => {
    setNewTableColumns(newTableColumns.map(col => col.id === id ? { ...col, [field]: value } : col));
    
    if (field === 'references' && value.table && !refTableColumns[value.table]) {
      fetchRefTableColumns(value.table);
    }
  };

  const fetchRefTableColumns = async (tableName: string) => {
    try {
      const token = localStorage.getItem('gopherbase_access_token');
      const res = await fetch(`${API_BASE}/schema/${tableName}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setRefTableColumns(prev => ({
          ...prev,
          [tableName]: data.map((c: any) => c.name)
        }));
      }
    } catch (err) {
      console.error('Failed to fetch ref table columns', err);
    }
  };

  const handleCreateTable = async () => {
    try {
      const cols = newTableColumns.map(col => ({
        name: col.name,
        type: col.type,
        primary: col.isPrimaryKey ? true : false,
        nullable: col.isNullable ? true : false,
        notNull: !col.isNullable,
        default: col.defaultValue || null,
        references: col.references?.table && col.references?.column ? col.references : null
      }));
      await createTable(newTableName, cols);
      setIsCreateTableModalOpen(false);
      showAlert('Table Created', `Table ${newTableName} created successfully!`, 'success');
      setNewTableName('');
      setNewTableColumns([{ id: '1', name: 'id', type: 'uuid', isPrimaryKey: true, isNullable: false, defaultValue: 'gen_random_uuid()' }]);
      fetchStats();
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to create table', 'error');
    }
  };

  const highlight = (code: string) => {
    return code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\/\/(.*)/g, '<span class="text-slate-500">//$1</span>')
      .replace(/"([^"]*)"/g, '<span class="text-green-400">"$1"</span>')
      .replace(/\b(import|from|const|async|function|await|console|return)\b/g, '<span class="text-accent-purple">$1</span>')
      .replace(/\b(gb\.schema\.create|gb\.insert|gb\.from|gb\.query)\b/g, '<span class="text-blue-400">$1</span>')
      .replace(/\.(column|primary|unique|notNull|default|references|onDelete|execute|log|from|select)\(/g, '.<span class="text-blue-400">$1</span>(');
  };

  const dataTypes = [
    { label: 'Scalar Types', options: [
      { value: 'uuid', label: 'uuid' },
      { value: 'text', label: 'text' },
      { value: 'varchar', label: 'varchar' },
      { value: 'integer', label: 'integer' },
      { value: 'bigint', label: 'bigint' },
      { value: 'boolean', label: 'boolean' },
      { value: 'timestamp', label: 'timestamp' },
      { value: 'jsonb', label: 'jsonb' },
    ]},
    { label: 'Array Types', options: [
      { value: 'text[]', label: 'text[]' },
      { value: 'integer[]', label: 'integer[]' },
      { value: 'uuid[]', label: 'uuid[]' },
      { value: 'varchar[]', label: 'varchar[]' },
      { value: 'bigint[]', label: 'bigint[]' },
      { value: 'boolean[]', label: 'boolean[]' },
      { value: 'timestamp[]', label: 'timestamp[]' },
    ]}
  ];

  return (
    <div className="p-8 space-y-8 overflow-y-auto w-full h-full custom-scrollbar">
      {/* Page Title */}
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Project Overview</h2>
        <p className="text-slate-500 dark:text-slate-400">Health monitor and real-time database metrics for <span className="text-primary font-mono">GopherBase-cluster</span></p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stat Card 1 */}
        <div className="glass-card rounded-xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <span className="material-symbols-outlined text-6xl text-primary">hub</span>
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Active Connections</p>
          <div className="flex items-end gap-3">
            <h3 className="text-3xl font-bold dark:text-white">{stats?.activeConnections || 0}</h3>
            <span className="text-green-500 text-sm font-bold flex items-center mb-1">
              <span className="material-symbols-outlined text-sm">trending_up</span> Live
            </span>
          </div>
          <div className="mt-4 h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-primary w-[10%]"></div>
          </div>
        </div>

        {/* Stat Card 2 */}
        <div className="glass-card rounded-xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <span className="material-symbols-outlined text-6xl text-accent-purple">storage</span>
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Storage Usage</p>
          <div className="flex items-end gap-3">
            <h3 className="text-3xl font-bold dark:text-white">{formatBytes(stats?.storageUsageBytes || 0)}</h3>
          </div>
          <div className="mt-4 h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-accent-purple w-[2%]"></div>
          </div>
        </div>

        {/* Stat Card 3 */}
        <div className="glass-card rounded-xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <span className="material-symbols-outlined text-6xl text-primary">api</span>
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">API Requests (24h)</p>
          <div className="flex items-end gap-3">
            <h3 className="text-3xl font-bold dark:text-white">{stats?.apiRequests24h || 0}</h3>
          </div>
          <div className="mt-4 h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-400 w-[5%]"></div>
          </div>
        </div>
      </div>

      {/* Main Grid Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Schema Initialization Code */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">schema</span>
              Initialize Your Database
            </h3>
            <div className="flex items-center gap-3">
              <button 
                onClick={generateSchemaCode}
                className="text-xs font-bold text-slate-500 hover:text-primary transition-colors flex items-center gap-1"
              >
                <span className={`material-symbols-outlined text-sm ${isLoadingCode ? 'animate-spin' : ''}`}>refresh</span>
                Refresh
              </button>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(generatedCode);
                  showAlert('Copied!', 'Initialization code copied to clipboard', 'success');
                }}
                className="text-xs font-bold text-primary hover:underline uppercase tracking-wider flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">content_copy</span>
                Copy File
              </button>
            </div>
          </div>
          <div className="glass-card rounded-xl overflow-hidden flex flex-col h-[480px]">
            <div className="flex-1 flex font-mono text-[13px] leading-relaxed overflow-hidden">
              <div className="bg-slate-900/50 text-slate-500 text-right py-6 px-4 select-none border-r border-slate-800 flex flex-col shrink-0 min-w-[50px]">
                {generatedCode.split('\n').map((_, i) => (
                  <div key={i} className="h-6 leading-6">{i + 1}</div>
                ))}
              </div>
              <div className="flex-1 bg-slate-900/20 p-6 overflow-auto custom-scrollbar text-slate-300">
                <pre className="whitespace-pre" dangerouslySetInnerHTML={{ __html: highlight(generatedCode) }} />
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar (Performance & Quick Actions) */}
        <div className="space-y-6">
          {/* Performance Card */}
          <div className="glass-card rounded-xl p-6">
            <h3 className="text-lg font-bold mb-4 dark:text-white">Database Stats</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 dark:text-slate-400">Total Tables</span>
                <span className="font-mono text-primary font-bold">{stats?.tableCount || 0}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 dark:text-slate-400">Health</span>
                <span className="font-mono text-green-500 font-bold">Excellent</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="glass-card rounded-xl p-6">
            <h3 className="text-lg font-bold mb-4 dark:text-white">Quick Actions</h3>
            <div className="grid grid-cols-1 gap-2">
              <button 
                onClick={() => setIsCreateTableModalOpen(true)}
                className="flex items-center gap-3 w-full p-3 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-all text-sm font-semibold"
              >
                <span className="material-symbols-outlined">add_box</span>
                Create New Table
              </button>
              <button className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all text-sm font-medium">
                <span className="material-symbols-outlined">backup</span>
                Create Backup
              </button>
              <button className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all text-sm font-medium">
                <span className="material-symbols-outlined">key</span>
                API Keys
              </button>
            </div>
          </div>

          {/* Connection Health */}
          <div className="bg-gradient-to-br from-primary to-accent-purple rounded-xl p-6 text-white shadow-lg shadow-primary/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center">
                <span className="material-symbols-outlined">bolt</span>
              </div>
              <div>
                <h4 className="font-bold">System Health</h4>
                <p className="text-xs text-white/70">All clusters online</p>
              </div>
            </div>
            <div className="text-3xl font-bold mb-2">99.99%</div>
            <div className="w-full bg-black/20 rounded-full h-1.5 overflow-hidden">
              <div className="bg-white h-full w-[99.99%]"></div>
            </div>
            <button className="mt-4 w-full py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-lg text-xs font-bold transition-all uppercase tracking-widest">Status Page</button>
          </div>
        </div>
      </div>

      {/* Create Table Modal */}
      <AnimatePresence>
        {isCreateTableModalOpen && (
          <motion.div 
            key="create-table-modal"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">table_chart</span>
                  Create New Table
                </h2>
                <button 
                  onClick={() => setIsCreateTableModalOpen(false)}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined !text-xl text-slate-500">close</span>
                </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Table Name</label>
                  <input 
                    type="text" 
                    value={newTableName}
                    onChange={(e) => setNewTableName(e.target.value)}
                    placeholder="e.g., users, products, orders"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Columns</label>
                    <button 
                      onClick={handleAddColumn}
                      className="text-xs font-bold text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined !text-sm">add</span>
                      Add Column
                    </button>
                  </div>

                  <div className="space-y-3">
                    {newTableColumns.map((col) => (
                      <div key={col.id} className="flex flex-col gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 group">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4">
                            <div className="col-span-1 md:col-span-3">
                              <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
                              <input 
                                type="text" 
                                value={col.name}
                                onChange={(e) => handleColumnChange(col.id, 'name', e.target.value)}
                                placeholder="column_name"
                                className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-1 focus:ring-primary outline-none"
                              />
                            </div>
                            <div className="col-span-1 md:col-span-3">
                              <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
                              <select 
                                value={col.type}
                                onChange={(e) => handleColumnChange(col.id, 'type', e.target.value)}
                                className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-1 focus:ring-primary outline-none"
                              >
                                {dataTypes.map(group => (
                                  <optgroup key={group.label} label={group.label}>
                                    {group.options.map(opt => (
                                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                  </optgroup>
                                ))}
                              </select>
                            </div>
                            <div className="col-span-1 md:col-span-3">
                              <label className="block text-xs font-medium text-slate-500 mb-1">Default Value</label>
                              <input 
                                type="text" 
                                value={col.defaultValue}
                                onChange={(e) => handleColumnChange(col.id, 'defaultValue', e.target.value)}
                                placeholder="NULL"
                                className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-1 focus:ring-primary outline-none"
                              />
                            </div>
                            <div className="col-span-1 md:col-span-3 flex items-center gap-4 pt-6">
                              <div className="flex items-center gap-2">
                                <Checkbox 
                                  id={`pk-${col.id}`}
                                  checked={col.isPrimaryKey}
                                  onChange={(e) => handleColumnChange(col.id, 'isPrimaryKey', e.target.checked)}
                                />
                                <label htmlFor={`pk-${col.id}`} className="text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer">PK</label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox 
                                  id={`nullable-${col.id}`}
                                  checked={col.isNullable}
                                  onChange={(e) => handleColumnChange(col.id, 'isNullable', e.target.checked)}
                                />
                                <label htmlFor={`nullable-${col.id}`} className="text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer">Nullable</label>
                              </div>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleRemoveColumn(col.id)}
                            disabled={newTableColumns.length === 1}
                            className="mt-6 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="material-symbols-outlined !text-lg">delete</span>
                          </button>
                        </div>

                        {/* Foreign Key Section */}
                        <div className="flex items-center gap-4 pt-2 border-t border-slate-200 dark:border-slate-700/50">
                          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Foreign Key</span>
                          <div className="flex-1 grid grid-cols-2 gap-4">
                            <div>
                              <select 
                                value={col.references?.table || ''}
                                onChange={(e) => handleColumnChange(col.id, 'references', { ...col.references, table: e.target.value })}
                                className="w-full px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 text-xs outline-none"
                              >
                                <option value="">No reference</option>
                                {tables.map(t => (
                                  <option key={t} value={t}>{t}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <select 
                                value={col.references?.column || ''}
                                onChange={(e) => handleColumnChange(col.id, 'references', { ...col.references, column: e.target.value })}
                                className="w-full px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 text-xs outline-none"
                                disabled={!col.references?.table}
                              >
                                <option value="">Select column</option>
                                {col.references?.table && refTableColumns[col.references.table]?.map(c => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-end gap-3">
                <button 
                  onClick={() => setIsCreateTableModalOpen(false)}
                  className="px-5 py-2.5 rounded-lg font-medium text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateTable}
                  disabled={!newTableName.trim() || newTableColumns.length === 0}
                  className="px-5 py-2.5 rounded-lg font-bold bg-primary text-white hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Table
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AlertModal 
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
