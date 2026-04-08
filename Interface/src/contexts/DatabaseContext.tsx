import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { gb } from '../lib/gopherbase';
import type { AlterTableRequest } from 'gopherbase/schema-builder';

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
  alterTable: (tableName: string, payload: AlterTableRequest) => Promise<void>;
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
      const data = await gb.schema.listTables();
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
    const schema = gb.schema.create(tableName);
    
    for (const col of cols) {
      const type = (col.type || col.dataType || 'VARCHAR').toUpperCase();
      const colBuilder = schema.column(col.name, type);
      
      if (col.primary || col.isPrimary) colBuilder.primary();
      if (col.unique || col.isUnique) colBuilder.unique();
      if (col.notNull || col.isNullable === 'NO') colBuilder.notNull();
      if (col.default || col.columnDefault) colBuilder.default(col.default || col.columnDefault);
      
      if (col.references && col.references.table) {
        const ref = colBuilder.references(col.references.table, col.references.column);
        if (col.references.onDelete) ref.onDelete(col.references.onDelete as any);
        if (col.references.onUpdate) ref.onUpdate(col.references.onUpdate as any);
      }
    }

    await schema.execute();
    await fetchTables();
  };

  const alterTable = async (tableName: string, payload: AlterTableRequest) => {
    await gb.schema.alterTable(tableName, payload);
    await fetchTables();
  };

  const dropTable = async (tableName: string) => {
    await gb.schema.dropTable(tableName);
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
