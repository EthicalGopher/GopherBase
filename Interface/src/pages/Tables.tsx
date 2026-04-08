import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import AlertModal from '../components/AlertModal';
import Checkbox from '../components/Checkbox';
import { useDatabase } from '../contexts/DatabaseContext';
import { gb } from '../lib/gopherbase';
import type { TableColumn } from 'gopherbase/schema-builder';

export default function Tables() {
  const { tableName } = useParams<{ tableName: string }>();
  const { alterTable, tables } = useDatabase();
  const [columns, setColumns] = useState<TableColumn[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddRowModalOpen, setIsAddRowModalOpen] = useState(false);
  const [newRowData, setNewRowData] = useState<Record<string, any>>({});
  const [isEditRowModalOpen, setIsEditRowModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<any>(null);
  const [editRowData, setEditRowData] = useState<Record<string, any>>({});
  
  const [isEditSchemaModalOpen, setIsEditSchemaModalOpen] = useState(false);
  const [editSchemaColumns, setEditSchemaColumns] = useState<any[]>([]);
  const [refTableColumns, setRefTableColumns] = useState<Record<string, string[]>>({});

  const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' | 'info' | 'warning' }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setAlertConfig({ isOpen: true, title, message, type });
  };

  useEffect(() => {
    if (tableName) {
      fetchTableSchema();
      fetchTableData();
    } else {
      setIsLoading(false);
    }
  }, [tableName]);

  const fetchTableSchema = async () => {
    setIsLoading(true);
    try {
      const data = await gb.schema.getTableSchema(tableName!);
      if (Array.isArray(data)) {
        setColumns(data);
      } else {
        setColumns([]);
      }
    } catch (err) {
      console.error('Failed to fetch table schema', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTableData = async () => {
    try {
      const data = await gb.from(tableName!).select().execute();
      if (Array.isArray(data)) {
        setRows(data);
      } else {
        setRows([]);
      }
    } catch (err) {
      console.error('Failed to fetch table data', err);
    }
  };

  const handleDeleteRow = async (row: any) => {
    if (!confirm('Are you sure you want to delete this row?')) return;

    try {
      const primaryKeyCol = columns.find(c => c.isPrimary);
      if (!primaryKeyCol) throw new Error('No primary key found for this table');

      await gb.from(tableName!).match({ [primaryKeyCol.name]: row[primaryKeyCol.name] }).delete().execute();

      fetchTableData();
      showAlert('Success', 'Row deleted successfully', 'success');
    } catch (err: any) {
      showAlert('Error', err.message, 'error');
    }
  };

  const handleAddRow = async () => {
    try {
      await gb.from(tableName!).insert(newRowData).execute();

      setIsAddRowModalOpen(false);
      setNewRowData({});
      fetchTableData();
      showAlert('Success', 'Row added successfully', 'success');
    } catch (err: any) {
      showAlert('Error', err.message, 'error');
    }
  };

  const handleOpenEditRow = (row: any) => {
    setEditingRow(row);
    setEditRowData({ ...row });
    setIsEditRowModalOpen(true);
  };

  const handleEditRow = async () => {
    if (!tableName || !editingRow) return;
    try {
      const primaryKeyCol = columns.find(c => c.isPrimary);
      if (!primaryKeyCol) throw new Error('No primary key found for this table');

      await gb.from(tableName).match({ [primaryKeyCol.name]: editingRow[primaryKeyCol.name] }).update(editRowData).execute();

      setIsEditRowModalOpen(false);
      setEditingRow(null);
      setEditRowData({});
      fetchTableData();
      showAlert('Success', 'Row updated successfully', 'success');
    } catch (err: any) {
      showAlert('Error', err.message, 'error');
    }
  };

  const handleOpenEditSchema = () => {
    setEditSchemaColumns(columns.map(c => ({
      id: crypto.randomUUID(),
      name: c.name,
      oldName: c.name,
      type: c.dataType,
      isPrimaryKey: c.isPrimary,
      isNullable: c.isNullable === 'YES',
      defaultValue: c.columnDefault || '',
      references: c.references ? { table: c.references.table, column: c.references.column } : null,
      isExisting: true
    })));
    setIsEditSchemaModalOpen(true);
  };

  const handleAddColumn = () => {
    setEditSchemaColumns([
      ...editSchemaColumns,
      { id: crypto.randomUUID(), name: '', type: 'text', isPrimaryKey: false, isNullable: true, defaultValue: '', isExisting: false }
    ]);
  };

  const handleRemoveColumn = (id: string) => {
    setEditSchemaColumns(editSchemaColumns.filter(col => col.id !== id));
  };

  const handleColumnChange = (id: string, field: string, value: any) => {
    setEditSchemaColumns(editSchemaColumns.map(col => col.id === id ? { ...col, [field]: value } : col));
    
    if (field === 'references' && value?.table && !refTableColumns[value.table]) {
      fetchRefTableColumns(value.table);
    }
  };

  const fetchRefTableColumns = async (tableName: string) => {
    try {
      const data = await gb.schema.getTableSchema(tableName);
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

  const handleSaveSchema = async () => {
    if (!tableName) return;
    try {
      const drop = columns
        .filter(c => !editSchemaColumns.find(ec => ec.isExisting && ec.oldName === c.name))
        .map(c => c.name);

      const add = editSchemaColumns
        .filter(ec => !ec.isExisting)
        .map(ec => ({
          name: ec.name,
          type: ec.type,
          primary: ec.isPrimaryKey,
          nullable: ec.isNullable,
          default: ec.defaultValue || null,
          references: ec.references?.table ? ec.references : null
        }));

      const rename = editSchemaColumns
        .filter(ec => ec.isExisting && ec.name !== ec.oldName)
        .map(ec => ({ old: ec.oldName, new: ec.name }));

      if (drop.length === 0 && add.length === 0 && rename.length === 0) {
        setIsEditSchemaModalOpen(false);
        return;
      }

      await alterTable(tableName, { add, drop, rename });
      setIsEditSchemaModalOpen(false);
      showAlert('Success', 'Schema updated successfully', 'success');
      fetchTableSchema();
      fetchTableData();
    } catch (err: any) {
      showAlert('Error', err.message, 'error');
    }
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

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium animate-pulse">Loading data...</p>
        </div>
      </div>
    );
  }

  if (!tableName) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-900/20">
        <div className="text-center space-y-4 max-w-md p-8">
          <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-4xl text-indigo-500">table_chart</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Select a table</h2>
          <p className="text-slate-500 dark:text-slate-400">Choose a table from the sidebar to view and manage its data, or create a new one from the dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-900">
      {/* Table Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary">table_chart</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{tableName}</h2>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{rows.length} rows • {columns.length} columns</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleOpenEditSchema}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-semibold transition-all"
          >
            <span className="material-symbols-outlined !text-lg">view_column</span>
            Edit Schema
          </button>
          <button 
            onClick={() => setIsAddRowModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-bold transition-all shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined !text-lg">add</span>
            Add Row
          </button>
        </div>
      </div>

      {/* Table Body */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full border-collapse min-w-full">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
              <th className="w-12 p-4"></th>
              {columns.map(col => (
                <th key={col.name} className="p-4 text-left group">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white whitespace-nowrap">{col.name}</span>
                    <span className="text-[10px] font-medium text-slate-400 uppercase">{col.dataType}</span>
                    {col.isPrimary && (
                      <span className="material-symbols-outlined text-amber-500 !text-xs" title="Primary Key">key</span>
                    )}
                  </div>
                </th>
              ))}
              <th className="w-20 p-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 2} className="p-12 text-center">
                  <div className="flex flex-col items-center gap-3 opacity-40">
                    <span className="material-symbols-outlined text-5xl">folder_off</span>
                    <p className="text-sm font-medium">No data found in this table</p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={idx} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="p-4 text-center">
                    <span className="text-[10px] font-mono text-slate-400">{idx + 1}</span>
                  </td>
                  {columns.map(col => (
                    <td key={col.name} className="p-4">
                      <div className="text-sm text-slate-600 dark:text-slate-300 truncate max-w-xs font-mono">
                        {row[col.name] === null ? (
                          <span className="text-slate-400 italic">NULL</span>
                        ) : typeof row[col.name] === 'object' ? (
                          JSON.stringify(row[col.name])
                        ) : String(row[col.name])}
                      </div>
                    </td>
                  ))}
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleOpenEditRow(row)}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-slate-500"
                      >
                        <span className="material-symbols-outlined !text-lg">edit</span>
                      </button>
                      <button 
                        onClick={() => handleDeleteRow(row)}
                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md text-slate-500 hover:text-red-500"
                      >
                        <span className="material-symbols-outlined !text-lg">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Row Modal */}
      <AnimatePresence>
        {isAddRowModalOpen && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-bold">Add New Row</h3>
                <button onClick={() => setIsAddRowModalOpen(false)}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {columns.map(col => (
                  <div key={col.name}>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {col.name} <span className="text-[10px] text-slate-400 font-mono">({col.dataType})</span>
                    </label>
                    <input 
                      type="text"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                      placeholder={col.isPrimary ? 'Auto-generated' : 'Enter value...'}
                      value={newRowData[col.name] || ''}
                      onChange={(e) => setNewRowData({ ...newRowData, [col.name]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
              <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
                <button 
                  onClick={() => setIsAddRowModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddRow}
                  className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20"
                >
                  Insert Row
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Row Modal */}
      <AnimatePresence>
        {isEditRowModalOpen && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-bold">Edit Row</h3>
                <button onClick={() => setIsEditRowModalOpen(false)}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {columns.map(col => (
                  <div key={col.name}>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {col.name} <span className="text-[10px] text-slate-400 font-mono">({col.dataType})</span>
                    </label>
                    <input 
                      type="text"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                      placeholder={col.isPrimary ? 'Auto-generated' : 'Enter value...'}
                      value={editRowData[col.name] === null ? '' : (editRowData[col.name] === undefined ? '' : String(editRowData[col.name]))}
                      onChange={(e) => setEditRowData({ ...editRowData, [col.name]: e.target.value })}
                      disabled={col.isPrimary}
                    />
                  </div>
                ))}
              </div>
              <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
                <button 
                  onClick={() => setIsEditRowModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleEditRow}
                  className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Schema Modal */}
      <AnimatePresence>
        {isEditSchemaModalOpen && (
          <motion.div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">view_column</span>
                  Edit Schema: {tableName}
                </h2>
                <button 
                  onClick={() => setIsEditSchemaModalOpen(false)}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined !text-xl text-slate-500">close</span>
                </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
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
                  {editSchemaColumns.map((col) => (
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
                              disabled={col.isExisting}
                              onChange={(e) => handleColumnChange(col.id, 'type', e.target.value)}
                              className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-1 focus:ring-primary outline-none disabled:opacity-50"
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
                              disabled={col.isExisting}
                              onChange={(e) => handleColumnChange(col.id, 'defaultValue', e.target.value)}
                              placeholder="NULL"
                              className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-1 focus:ring-primary outline-none disabled:opacity-50"
                            />
                          </div>
                          <div className="col-span-1 md:col-span-3 flex items-center gap-4 pt-6">
                            <div className="flex items-center gap-2">
                              <Checkbox 
                                id={`pk-${col.id}`}
                                checked={col.isPrimaryKey}
                                disabled={col.isExisting}
                                onChange={(e) => handleColumnChange(col.id, 'isPrimaryKey', e.target.checked)}
                              />
                              <label htmlFor={`pk-${col.id}`} className={`text-xs font-medium cursor-pointer ${col.isExisting ? 'text-slate-400' : 'text-slate-600 dark:text-slate-400'}`}>PK</label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Checkbox 
                                id={`nullable-${col.id}`}
                                checked={col.isNullable}
                                disabled={col.isExisting}
                                onChange={(e) => handleColumnChange(col.id, 'isNullable', e.target.checked)}
                              />
                              <label htmlFor={`nullable-${col.id}`} className={`text-xs font-medium cursor-pointer ${col.isExisting ? 'text-slate-400' : 'text-slate-600 dark:text-slate-400'}`}>Nullable</label>
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleRemoveColumn(col.id)}
                          className="mt-6 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
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
                              disabled={col.isExisting}
                              onChange={(e) => handleColumnChange(col.id, 'references', { ...col.references, table: e.target.value })}
                              className="w-full px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 text-xs outline-none disabled:opacity-50"
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
                              disabled={col.isExisting || !col.references?.table}
                              onChange={(e) => handleColumnChange(col.id, 'references', { ...col.references, column: e.target.value })}
                              className="w-full px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 text-xs outline-none disabled:opacity-50"
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

              <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-end gap-3">
                <button 
                  onClick={() => setIsEditSchemaModalOpen(false)}
                  className="px-5 py-2.5 rounded-lg font-medium text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveSchema}
                  className="px-5 py-2.5 rounded-lg font-bold bg-primary text-white hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                  Save Schema
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
