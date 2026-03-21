import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { API_BASE, useAuth, safeJson } from './AuthContext';

interface TableColumn {
  name: string;
  type?: string;
  dataType?: string;
  isNullable?: string;
  default?: string | null;
  columnDefault?: string | null;
  isPrimary?: boolean;
  isUnique?: boolean;
  notNull?: boolean;
  primary?: boolean;
  unique?: boolean;
  references?: {
    table: string;
    column: string;
    onDelete?: string;
    onUpdate?: string;
  } | null;
}

interface DatabaseContextType {
  tables: string[];
  fetchTables: () => Promise<void>;
  createTable: (tableName: string, cols: TableColumn[]) => Promise<void>;
  alterTable: (tableName: string, payload: { 
    add?: TableColumn[], 
    drop?: string[], 
    rename?: { old: string, new: string }[] 
  }) => Promise<void>;
  dropTable: (tableName: string) => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextType | null>(null);

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tables, setTables] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchTables();
    } else {
      setTables([]);
    }
  }, [user]);

  const fetchTables = async () => {
    try {
      const token = localStorage.getItem('gopherbase_access_token');
      if (!token) return;
      
      const res = await fetch(`${API_BASE}/schema/tables`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await safeJson(res);
      if (Array.isArray(data)) {
        setTables(data);
      } else {
        setTables([]);
      }
    } catch {
      setTables([]);
    }
  };

  const createTable = async (tableName: string, cols: TableColumn[]) => {
    const token = localStorage.getItem('gopherbase_access_token');
    const columnsPayload = cols.map(col => ({
      name: col.name,
      type: (col.type || col.dataType || 'VARCHAR').toUpperCase(),
      notNull: col.notNull ?? col.isNullable === 'NO',
      primary: col.primary ?? col.isPrimary,
      unique: col.unique ?? col.isUnique,
      default: col.default ?? col.columnDefault,
      references: (col.references && col.references.table) ? col.references : null
    }));

    const res = await fetch(`${API_BASE}/schema/create/${tableName}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name: tableName, columns: columnsPayload })
    });

    if (!res.ok) {
      const data = await safeJson(res);
      throw new Error(data.error || 'Failed to create table');
    }

    await fetchTables();
  };

  const alterTable = async (tableName: string, payload: { 
    add?: TableColumn[], 
    drop?: string[], 
    rename?: { old: string, new: string }[] 
  }) => {
    const token = localStorage.getItem('gopherbase_access_token');
    
    const formattedPayload = {
      add: payload.add?.map(col => ({
        name: col.name,
        type: (col.type || col.dataType || 'VARCHAR').toUpperCase(),
        notNull: col.notNull ?? col.isNullable === 'NO',
        primary: col.primary ?? col.isPrimary,
        unique: col.unique ?? col.isUnique,
        default: col.default ?? col.columnDefault,
        references: (col.references && col.references.table) ? col.references : null
      })),
      drop: payload.drop,
      rename: payload.rename
    };

    const res = await fetch(`${API_BASE}/schema/alter/${tableName}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(formattedPayload)
    });

    if (!res.ok) {
      const data = await safeJson(res);
      throw new Error(data.error || 'Failed to alter table');
    }

    await fetchTables();
  };

  const dropTable = async (tableName: string) => {
    const token = localStorage.getItem('gopherbase_access_token');
    const res = await fetch(`${API_BASE}/schema/drop/${tableName}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!res.ok) {
      const data = await safeJson(res);
      throw new Error(data.error || 'Failed to drop table');
    }
    
    await fetchTables();
  };

  return (
    <DatabaseContext.Provider value={{ tables, fetchTables, createTable, alterTable, dropTable }}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
}
