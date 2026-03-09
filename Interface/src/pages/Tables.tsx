import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import AlertModal from '../components/AlertModal';
import Checkbox from '../components/Checkbox';
import { useDatabase } from '../contexts/DatabaseContext';
import { API_BASE } from '../contexts/AuthContext';

export default function Tables() {
  const { tableName } = useParams<{ tableName: string }>();
  const navigate = useNavigate();
  const { dropTable } = useDatabase();
  
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDropModalOpen, setIsDropModalOpen] = useState(false);
  const [isInsertModalOpen, setIsInsertModalOpen] = useState(false);
  
  const [columns, setColumns] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' | 'info' | 'warning' }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setAlertConfig({ isOpen: true, title, message, type });
  };

  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (tableName) {
      fetchTableSchema();
      fetchTableData();
      setSelectedRows({});
      setSelectedRow(null);
      setIsSidebarOpen(false);
    }
  }, [tableName]);

  const fetchTableSchema = async () => {
    if (!tableName) return;
    try {
      const token = localStorage.getItem('gopherbase_access_token');
      const res = await fetch(`${API_BASE}/schema/${tableName}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setColumns(data);
      } else {
        setColumns([]);
      }
    } catch {
      setColumns([]);
      showAlert('Error', 'Failed to fetch table schema', 'error');
    }
  };

  const fetchTableData = async () => {
    if (!tableName) return;
    setLoadingData(true);
    try {
      const token = localStorage.getItem('gopherbase_access_token');
      const res = await fetch(`${API_BASE}/select/${tableName}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setRows(data);
      } else {
        setRows([]);
      }
    } catch {
      setRows([]);
      showAlert('Error', 'Failed to fetch table data', 'error');
    }
    setLoadingData(false);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      // Find primary key column
      const pkCol = columns.find(c => c.isPrimary) || columns[0];
      if (pkCol) {
        const newSelected: Record<string, boolean> = {};
        rows.forEach(r => {
          newSelected[String(r[pkCol.name])] = true;
        });
        setSelectedRows(newSelected);
      }
    } else {
      setSelectedRows({});
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const newSet = { ...selectedRows };
    if (checked) {
      newSet[id] = true;
    } else {
      delete newSet[id];
    }
    setSelectedRows(newSet);
  };

  const handleDeleteSelected = async () => {
    if (!tableName) return;
    const pkCol = columns.find(c => c.isPrimary) || columns[0];
    if (!pkCol) {
      showAlert('Error', 'No primary key found for deletion', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('gopherbase_access_token');
      for (const id of Object.keys(selectedRows)) {
        await fetch(`${API_BASE}/delete/${tableName}`, {
          method: 'DELETE',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          // Send the value correctly typed if it's a number
          body: JSON.stringify({ [pkCol.name]: isNaN(Number(id)) ? id : Number(id) })
        });
      }
      setSelectedRows({});
      showAlert('Rows Deleted', `Deleted selected rows successfully.`, 'success');
      fetchTableData();
    } catch (err) {
      showAlert('Error', 'Failed to delete some rows', 'error');
    }
  };

  const handleConfirmDrop = async () => {
    if (!tableName) return;
    try {
      await dropTable(tableName);
      showAlert('Table Dropped', `Table ${tableName} dropped successfully!`, 'success');
      setIsDropModalOpen(false);
      navigate('/');
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to drop table', 'error');
    }
  };

  const handleInsertRow = async (data: Record<string, unknown>) => {
    if (!tableName) return;
    try {
      const token = localStorage.getItem('gopherbase_access_token');
      await fetch(`${API_BASE}/insert/${tableName}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ data })
      });
      setIsInsertModalOpen(false);
      fetchTableData();
      showAlert('Row Inserted', 'New row inserted successfully.', 'success');
    } catch (err) {
      showAlert('Error', 'Failed to insert row', 'error');
    }
  };

  const getRowId = (row: any) => {
    const pkCol = columns.find(c => c.isPrimary) || columns[0];
    return pkCol ? String(row[pkCol.name]) : String(Math.random());
  };

  if (!tableName) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-slate-500">
          <span className="material-symbols-outlined text-4xl mb-4">table</span>
          <p>Select a table from the sidebar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full">
      <div className="flex-1 flex flex-col min-w-0 relative overflow-hidden">
        {/* Glass Background Accents */}
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[30%] h-[30%] bg-primary/5 blur-[100px] rounded-full"></div>

        {/* Filter Bar */}
        <div className="px-6 py-4 flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 z-10">
          <div className="flex items-center gap-2 mr-4">
            <span className="material-symbols-outlined text-primary">table_chart</span>
            <h2 className="text-sm font-bold capitalize">{tableName}</h2>
          </div>
          
          {Object.keys(selectedRows).length > 0 ? (
            <div className="flex-1 flex items-center gap-3">
              <span className="text-sm font-medium text-primary bg-primary/10 px-2 py-1 rounded-md">{Object.keys(selectedRows).length} selected</span>
              <button 
                onClick={handleDeleteSelected}
                className="flex items-center gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-200 dark:border-red-500/30 transition-colors"
              >
                <span className="material-symbols-outlined !text-base">delete</span>
                Delete Selected
              </button>
            </div>
          ) : (
            <>
              <div className="relative flex-1 max-w-md">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 !text-lg">search</span>
                <input className="w-full bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-lg pl-10 text-sm focus:ring-primary focus:border-primary" placeholder="Filter rows..." type="text" />
              </div>
              <button className="flex items-center gap-2 text-slate-500 hover:text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-transparent">
                <span className="material-symbols-outlined !text-base">filter_list</span>
                Filter
              </button>
              <button className="flex items-center gap-2 text-slate-500 hover:text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-transparent">
                <span className="material-symbols-outlined !text-base">sort</span>
                Sort
              </button>
              <button 
                onClick={() => {
                  setSelectedRow(null);
                  setIsSidebarOpen(true);
                }}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-transparent"
              >
                <span className="material-symbols-outlined !text-base">schema</span>
                Schema
              </button>
              <button 
                onClick={() => setIsInsertModalOpen(true)}
                className="flex items-center gap-2 bg-primary text-white hover:bg-primary/90 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-lg shadow-primary/20"
              >
                <span className="material-symbols-outlined !text-base">add</span>
                Insert Row
              </button>
            </>
          )}
          
          <div className="flex-1"></div>
          <p className="text-xs text-slate-500 font-medium">Showing {rows.length > 0 ? 1 : 0}-{Math.min(50, rows.length)} of {rows.length} rows</p>
        </div>

        {/* Spreadsheet Grid */}
        <div className="flex-1 overflow-auto custom-scrollbar z-10">
          {loadingData ? (
            <div className="flex h-full items-center justify-center text-slate-500">
               <span className="material-symbols-outlined animate-spin text-4xl">progress_activity</span>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4 border-r border-slate-200 dark:border-slate-800 w-12 text-center">
                    <Checkbox 
                      checked={Object.keys(selectedRows).length === rows.length && rows.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  {columns.map(col => (
                    <th key={col.name} className="px-6 py-4 border-r border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        {col.isPrimary && <span className="material-symbols-outlined !text-sm text-primary">key</span>}
                        {col.name}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="font-mono text-[13px] text-slate-600 dark:text-slate-300">
                {rows.map((row, idx) => {
                  const rowId = getRowId(row);
                  return (
                    <tr
                      key={idx}
                      onClick={() => {
                        setSelectedRow(row);
                        setIsSidebarOpen(true);
                      }}
                      className={`row-hover border-b border-slate-200 dark:border-slate-800 transition-colors group cursor-pointer ${
                        selectedRow && getRowId(selectedRow) === rowId ? 'bg-primary/5 dark:bg-primary/10' : idx % 2 === 1 ? 'bg-slate-100/30 dark:bg-slate-800/20' : ''
                      }`}
                    >
                      <td className="px-6 py-3 border-r border-slate-200 dark:border-slate-800 text-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox 
                          checked={!!selectedRows[rowId]}
                          onChange={(e) => handleSelectRow(rowId, e.target.checked)}
                        />
                      </td>
                      {columns.map(col => (
                        <td key={col.name} className={`px-6 py-3 border-r border-slate-200 dark:border-slate-800 ${col.isPrimary ? 'text-primary font-medium' : ''}`}>
                          {row[col.name] === null ? <span className="text-slate-400 italic">NULL</span> : String(row[col.name])}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={columns.length + 1} className="px-6 py-8 text-center text-slate-500">
                      No data found in this table.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Pagination */}
        <footer className="h-12 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 bg-slate-50 dark:bg-slate-900/50 z-10">
          <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
            <span className="flex items-center gap-1">
              Rows per page:
              <select className="bg-transparent border-none p-0 text-xs focus:ring-0 cursor-pointer text-slate-400">
                <option>50</option>
                <option>100</option>
              </select>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-slate-500">{rows.length > 0 ? 1 : 0}-{Math.min(50, rows.length)} of {rows.length}</span>
            <div className="flex items-center gap-1">
              <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400">
                <span className="material-symbols-outlined !text-lg">chevron_left</span>
              </button>
              <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400">
                <span className="material-symbols-outlined !text-lg">chevron_right</span>
              </button>
            </div>
          </div>
        </footer>
      </div>

      {/* Right Sidebar (Schema or Row Details) */}
      {isSidebarOpen && (
        <aside className="w-80 flex flex-col border-l border-slate-200 dark:border-slate-800 bg-background-light dark:bg-background-dark/50 glass-panel z-20">
          {selectedRow ? (
            <>
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h2 className="font-bold text-sm tracking-tight flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary !text-xl">list_alt</span>
                  Row Details
                </h2>
                <button onClick={() => setIsSidebarOpen(false)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors">
                  <span className="material-symbols-outlined !text-lg text-slate-500">close</span>
                </button>
              </div>

            <div className="flex-1 overflow-auto custom-scrollbar p-6 space-y-6">
              <div className="space-y-4">
                {Object.entries(selectedRow).map(([key, value]: [string, any]) => (
                  <div key={key} className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">{key}</label>
                    <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 font-mono text-xs break-all">
                      {String(value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <button className="w-full py-2.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-sm">edit</span>
                Edit Row
              </button>
              <button 
                onClick={async () => {
                  try {
                    const pkCol = columns.find(c => c.isPrimary) || columns[0];
                    const id = pkCol ? selectedRow[pkCol.name] : null;
                    if (id !== null) {
                      const token = localStorage.getItem('gopherbase_access_token');
                      await fetch(`${API_BASE}/delete/${tableName}`, {
                        method: 'DELETE',
                        headers: { 
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ [pkCol.name]: id })
                      });
                      fetchTableData();
                      setSelectedRow(null);
                      setIsSidebarOpen(false);
                      showAlert('Row Deleted', 'Row deleted successfully.', 'success');
                    }
                  } catch (err) {
                    showAlert('Error', 'Failed to delete row', 'error');
                  }
                }}
                className="w-full py-2.5 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
                Delete Row
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="font-bold text-sm tracking-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-primary !text-xl">schema</span>
                Schema: {tableName}
              </h2>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
                >
                  <span className="material-symbols-outlined !text-lg text-slate-500">close</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar p-6 space-y-6">
              {/* Column Types Section */}
              <div>
                <h3 className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-4">Columns &amp; Types</h3>
                <div className="space-y-3">
                  {columns.map((col) => (
                    <div key={col.name} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined !text-lg text-primary">
                          {col.isPrimary ? 'key' : col.dataType === 'TEXT' || col.dataType === 'VARCHAR' ? 'text_fields' : col.dataType === 'TIMESTAMP' ? 'schedule' : 'list'}
                        </span>
                        <span className="text-xs font-mono font-medium">{col.name}</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono border border-slate-700">{col.dataType || col.type}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats Summary */}
              <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
                <h3 className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-4">Table Stats</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <p className="text-[10px] text-slate-500 mb-1">Row Count</p>
                    <p className="text-lg font-bold">{rows.length}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6">
              <button 
                onClick={() => setIsDropModalOpen(true)}
                className="w-full py-2.5 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 text-xs font-bold transition-all"
              >
                Drop Table: {tableName}
              </button>
            </div>
          </>
        )}
        </aside>
      )}

      {/* Modals */}
      <AnimatePresence>
        {isDropModalOpen && (
          <motion.div 
            key="drop-modal-backdrop"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDropModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            >
              <div className="p-6 space-y-4 text-center">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-red-500 !text-3xl">warning</span>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold">Drop Table: {tableName}?</h3>
                  <p className="text-sm text-slate-500">
                    This action is permanent and will delete all data in <span className="font-mono text-red-400 font-bold">{tableName}</span>.
                  </p>
                </div>
                <div className="pt-4 flex gap-3">
                  <button 
                    onClick={() => setIsDropModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleConfirmDrop}
                    className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                  >
                    Confirm Drop
                  </button>
                </div>
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

      <AnimatePresence>
        {isInsertModalOpen && (
          <InsertRowModal
            columns={columns}
            onClose={() => setIsInsertModalOpen(false)}
            onSubmit={handleInsertRow}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function InsertRowModal({ columns, onClose, onSubmit }: {
  columns: any[]
  onClose: () => void
  onSubmit: (data: Record<string, unknown>) => void
}) {
  const [formData, setFormData] = useState<Record<string, string>>({})

  // Exclude primary keys or auto-incrementing columns from edit if they are generated by default (for simplicity, we'll exclude SERIAL. We can just keep it simple).
  const editableCols = columns.filter(c => c.dataType?.toUpperCase() !== 'SERIAL' && c.type?.toUpperCase() !== 'SERIAL')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(formData)) {
      if (value !== '') {
        if (value === 'true') data[key] = true
        else if (value === 'false') data[key] = false
        else if (!isNaN(Number(value)) && value !== '') data[key] = Number(value)
        else data[key] = value
      }
    }
    onSubmit(data)
  }

  return (
    <motion.div 
      key="insert-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col max-h-[80vh]"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">add_box</span>
            Insert Row
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors">
            <span className="material-symbols-outlined text-slate-500">close</span>
          </button>
        </div>
        
        <div className="overflow-y-auto custom-scrollbar flex-1 -mx-6 px-6 py-2">
          <form id="insert-form" onSubmit={handleSubmit} className="space-y-4">
            {editableCols.map(col => (
              <div key={col.name} className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {col.name} <span className="text-[10px] uppercase ml-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">{col.dataType || col.type}</span>
                </label>
                <input
                  type="text"
                  value={formData[col.name] || ''}
                  onChange={e => setFormData({ ...formData, [col.name]: e.target.value })}
                  placeholder={col.isNullable === 'YES' ? 'NULL' : ''}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                />
              </div>
            ))}
          </form>
        </div>

        <div className="flex gap-3 pt-6 border-t border-slate-200 dark:border-slate-800 mt-4">
          <button type="button" className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={onClose}>Cancel</button>
          <button type="submit" form="insert-form" className="flex-1 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">Insert</button>
        </div>
      </motion.div>
    </motion.div>
  )
}
