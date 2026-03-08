import { useState, useEffect, createContext } from 'react'
import './App.css'

const API_BASE = 'http://localhost:8080/rest/v1'

interface User {
  id: string
  email: string
  [key: string]: unknown
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

interface TableColumn {
  name: string
  dataType: string
  isNullable: string
  columnDefault: string | null
}

interface Row {
  [key: string]: unknown
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [authLoading, setAuthLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [tables, setTables] = useState<string[]>([])
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [columns, setColumns] = useState<TableColumn[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [showCreateTable, setShowCreateTable] = useState(false)
  const [showInsertRow, setShowInsertRow] = useState(false)
  const [dataLoading, setDataLoading] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (user) {
      fetchTables()
    }
  }, [user])

  useEffect(() => {
    if (selectedTable) {
      fetchTableSchema()
      fetchTableData()
    }
  }, [selectedTable])

  const checkAuth = async () => {
    const token = localStorage.getItem('gopherbase_access_token')
    if (token) {
      try {
        const res = await fetch(`${API_BASE}/auth/user`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) {
          const userData = await res.json()
          setUser(userData as User)
        } else {
          const refreshToken = localStorage.getItem('gopherbase_refresh_token')
          if (refreshToken) {
            const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refresh_token: refreshToken })
            })
            if (refreshRes.ok) {
              const data = await refreshRes.json()
              localStorage.setItem('gopherbase_access_token', data.access_token)
              localStorage.setItem('gopherbase_refresh_token', data.refresh_token)
              const userRes = await fetch(`${API_BASE}/auth/user`, {
                headers: { 'Authorization': `Bearer ${data.access_token}` }
              })
              if (userRes.ok) {
                const userData = await userRes.json()
                setUser(userData as User)
              }
            } else {
              localStorage.removeItem('gopherbase_access_token')
              localStorage.removeItem('gopherbase_refresh_token')
            }
          }
        }
      } catch {
        localStorage.removeItem('gopherbase_access_token')
        localStorage.removeItem('gopherbase_refresh_token')
      }
    }
    setLoading(false)
  }

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Sign in failed')
        return
      }
      localStorage.setItem('gopherbase_access_token', data.access_token)
      localStorage.setItem('gopherbase_refresh_token', data.refresh_token)
      setUser(data.user as User)
      setShowAuthModal(false)
      setEmail('')
      setPassword('')
    } catch {
      setError('Sign in failed')
    }
    setAuthLoading(false)
  }

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Sign up failed')
        return
      }
      localStorage.setItem('gopherbase_access_token', data.access_token)
      localStorage.setItem('gopherbase_refresh_token', data.refresh_token)
      setUser(data.user as User)
      setShowAuthModal(false)
      setEmail('')
      setPassword('')
    } catch {
      setError('Sign up failed')
    }
    setAuthLoading(false)
  }

  const signOut = () => {
    const token = localStorage.getItem('gopherbase_access_token')
    if (token) {
      fetch(`${API_BASE}/auth/signout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
    }
    localStorage.removeItem('gopherbase_access_token')
    localStorage.removeItem('gopherbase_refresh_token')
    setUser(null)
    setTables([])
    setSelectedTable(null)
    setColumns([])
    setRows([])
  }

  const fetchTables = async () => {
    try {
      const token = localStorage.getItem('gopherbase_access_token')
      const res = await fetch(`${API_BASE}/schema/tables`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (Array.isArray(data)) {
        setTables(data)
      } else if (data.error) {
        setError(data.error)
        setTables([])
      }
    } catch {
      setError('Failed to fetch tables')
      setTables([])
    }
  }

  const fetchTableSchema = async () => {
    if (!selectedTable) return
    try {
      const token = localStorage.getItem('gopherbase_access_token')
      const res = await fetch(`${API_BASE}/schema/${selectedTable}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (Array.isArray(data)) {
        setColumns(data)
      } else if (data.error) {
        setError(data.error)
        setColumns([])
      }
    } catch {
      setError('Failed to fetch table schema')
      setColumns([])
    }
  }

  const fetchTableData = async () => {
    if (!selectedTable) return
    setDataLoading(true)
    try {
      const token = localStorage.getItem('gopherbase_access_token')
      const res = await fetch(`${API_BASE}/select/${selectedTable}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (Array.isArray(data)) {
        setRows(data)
      } else if (data.error) {
        setError(data.error)
        setRows([])
      }
    } catch {
      setError('Failed to fetch table data')
      setRows([])
    }
    setDataLoading(false)
  }

  const handleCreateTable = async (tableName: string, cols: TableColumn[]) => {
    try {
      const token = localStorage.getItem('gopherbase_access_token')
      const columnsPayload = cols.map(col => ({
        name: col.name,
        type: col.dataType.toUpperCase(),
        notNull: col.isNullable === 'NO',
        primary: col.name === 'id'
      }))
      await fetch(`${API_BASE}/schema/create/${tableName}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: tableName, columns: columnsPayload })
      })
      setShowCreateTable(false)
      fetchTables()
    } catch {
      setError('Failed to create table')
    }
  }

  const handleInsertRow = async (data: Record<string, unknown>) => {
    if (!selectedTable) return
    try {
      const token = localStorage.getItem('gopherbase_access_token')
      await fetch(`${API_BASE}/insert/${selectedTable}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ data })
      })
      setShowInsertRow(false)
      fetchTableData()
    } catch {
      setError('Failed to insert row')
    }
  }

  const handleDeleteRow = async (row: Row) => {
    if (!selectedTable || columns.length === 0) return
    const primaryKey = columns.find(c => c.name === 'id')
    if (!primaryKey) {
      setError('No primary key found')
      return
    }
    const keyValue = row[primaryKey.name]
    if (keyValue === undefined) return
    try {
      const token = localStorage.getItem('gopherbase_access_token')
      await fetch(`${API_BASE}/delete/${selectedTable}`, {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ [primaryKey.name]: keyValue })
      })
      fetchTableData()
    } catch {
      setError('Failed to delete row')
    }
  }

  const handleDropTable = async (tableName: string) => {
    if (!confirm(`Delete table "${tableName}"? This cannot be undone.`)) return
    try {
      const token = localStorage.getItem('gopherbase_access_token')
      await fetch(`${API_BASE}/schema/drop/${tableName}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (selectedTable === tableName) {
        setSelectedTable(null)
        setColumns([])
        setRows([])
      }
      fetchTables()
    } catch {
      setError('Failed to drop table')
    }
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <h1>GopherBase</h1>
          <p className="auth-subtitle">Database Management Interface</p>
          
          <button 
            className="btn-primary large" 
            onClick={() => { setShowAuthModal(true); setAuthMode('signin') }}
          >
            Sign In
          </button>
          <button 
            className="btn-secondary large" 
            onClick={() => { setShowAuthModal(true); setAuthMode('signup') }}
          >
            Sign Up
          </button>
        </div>

        {showAuthModal && (
          <div className="modal-overlay" onClick={() => setShowAuthModal(false)}>
            <div className="modal auth-modal" onClick={e => e.stopPropagation()}>
              <h2>{authMode === 'signin' ? 'Sign In' : 'Sign Up'}</h2>
              {error && <div className="error-message">{error}</div>}
              <form onSubmit={authMode === 'signin' ? signIn : signUp}>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowAuthModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={authLoading}>
                    {authLoading ? 'Loading...' : (authMode === 'signin' ? 'Sign In' : 'Sign Up')}
                  </button>
                </div>
              </form>
              <p className="auth-switch">
                {authMode === 'signin' ? "Don't have an account? " : "Already have an account? "}
                <span onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}>
                  {authMode === 'signin' ? 'Sign Up' : 'Sign In'}
                </span>
              </p>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, loading: false, signIn: async () => {}, signUp: async () => {}, signOut }}>
      <div className="app">
        <aside className="sidebar">
          <div className="sidebar-header">
            <h2>GopherBase</h2>
            <div className="user-info">
              <span className="user-email">{user.email}</span>
              <button className="btn-danger btn-small" onClick={signOut}>Sign Out</button>
            </div>
            <button className="btn-primary" onClick={() => setShowCreateTable(true)}>
              + New Table
            </button>
          </div>
          <div className="table-list">
            {(tables || []).map(table => (
              <div
                key={table}
                className={`table-item ${selectedTable === table ? 'active' : ''}`}
                onClick={() => setSelectedTable(table)}
              >
                <span className="table-icon">⊞</span>
                <span className="table-name">{table}</span>
                <button
                  className="btn-icon"
                  onClick={(e) => { e.stopPropagation(); handleDropTable(table) }}
                  title="Drop table"
                >
                  ×
                </button>
              </div>
            ))}
            {tables.length === 0 && (
              <div className="empty-state">No tables yet</div>
            )}
          </div>
        </aside>

        <main className="main-content">
          {error && (
            <div className="error-banner">
              {error}
              <button onClick={() => setError(null)}>×</button>
            </div>
          )}

          {selectedTable ? (
            <div className="table-view">
              <div className="table-header">
                <h1>{selectedTable}</h1>
                <button className="btn-primary" onClick={() => setShowInsertRow(true)}>
                  + Insert Row
                </button>
              </div>

              <div className="schema-info">
                <h3>Columns</h3>
                <div className="columns-grid">
                  {(columns || []).map(col => (
                    <div key={col.name} className="column-badge">
                      <span className="col-name">{col.name}</span>
                      <span className="col-type">{col.dataType}</span>
                      {col.isNullable === 'NO' && <span className="col-notnull">NOT NULL</span>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="data-section">
                <h3>Data ({rows.length} rows)</h3>
                {dataLoading ? (
                  <div className="loading">Loading...</div>
                ) : rows.length > 0 ? (
                  <div className="table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          {(columns || []).map(col => (
                            <th key={col.name}>{col.name}</th>
                          ))}
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(rows || []).map((row, idx) => (
                          <tr key={idx}>
                            {(columns || []).map(col => (
                              <td key={col.name}>{String(row[col.name] ?? '')}</td>
                            ))}
                            <td>
                              <button
                                className="btn-danger"
                                onClick={() => handleDeleteRow(row)}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-data">No data in this table</div>
                )}
              </div>
            </div>
          ) : (
            <div className="welcome">
              <h1>Welcome, {user.email}</h1>
              <p>Select a table from the sidebar or create a new one to get started.</p>
              <button className="btn-primary large" onClick={() => setShowCreateTable(true)}>
                Create Your First Table
              </button>
            </div>
          )}
        </main>

        {showCreateTable && (
          <CreateTableModal
            onClose={() => setShowCreateTable(false)}
            onSubmit={handleCreateTable}
          />
        )}

        {showInsertRow && (
          <InsertRowModal
            columns={columns}
            onClose={() => setShowInsertRow(false)}
            onSubmit={handleInsertRow}
          />
        )}
      </div>
    </AuthContext.Provider>
  )
}

function CreateTableModal({ onClose, onSubmit }: {
  onClose: () => void
  onSubmit: (name: string, cols: TableColumn[]) => void
}) {
  const [tableName, setTableName] = useState('')
  const [cols, setCols] = useState<TableColumn[]>([
    { name: 'id', dataType: 'SERIAL', isNullable: 'NO', columnDefault: null }
  ])

  const addColumn = () => {
    setCols([...cols, { name: '', dataType: 'VARCHAR', isNullable: 'YES', columnDefault: null }])
  }

  const updateColumn = (index: number, field: keyof TableColumn, value: string) => {
    const newCols = [...cols]
    newCols[index] = { ...newCols[index], [field]: value }
    setCols(newCols)
  }

  const removeColumn = (index: number) => {
    setCols(cols.filter((_, i) => i !== index))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!tableName.trim()) return
    onSubmit(tableName, cols)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>Create New Table</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Table Name</label>
            <input
              type="text"
              value={tableName}
              onChange={e => setTableName(e.target.value)}
              placeholder="e.g., users"
              required
            />
          </div>

          <div className="form-group">
            <label>Columns</label>
            {cols.map((col, idx) => (
              <div key={idx} className="column-row">
                <input
                  type="text"
                  value={col.name}
                  onChange={e => updateColumn(idx, 'name', e.target.value)}
                  placeholder="Column name"
                  required
                />
                <select
                  value={col.dataType}
                  onChange={e => updateColumn(idx, 'dataType', e.target.value)}
                >
                  <option value="SERIAL">SERIAL</option>
                  <option value="INTEGER">INTEGER</option>
                  <option value="BIGINT">BIGINT</option>
                  <option value="VARCHAR">VARCHAR</option>
                  <option value="TEXT">TEXT</option>
                  <option value="BOOLEAN">BOOLEAN</option>
                  <option value="TIMESTAMP">TIMESTAMP</option>
                  <option value="DATE">DATE</option>
                  <option value="JSONB">JSONB</option>
                  <option value="FLOAT">FLOAT</option>
                  <option value="DECIMAL">DECIMAL</option>
                </select>
                <select
                  value={col.isNullable}
                  onChange={e => updateColumn(idx, 'isNullable', e.target.value)}
                >
                  <option value="YES">Nullable</option>
                  <option value="NO">Not Null</option>
                </select>
                {idx > 0 && (
                  <button type="button" className="btn-icon" onClick={() => removeColumn(idx)}>×</button>
                )}
              </div>
            ))}
            <button type="button" className="btn-secondary" onClick={addColumn}>
              + Add Column
            </button>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">Create Table</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function InsertRowModal({ columns, onClose, onSubmit }: {
  columns: TableColumn[]
  onClose: () => void
  onSubmit: (data: Record<string, unknown>) => void
}) {
  const [formData, setFormData] = useState<Record<string, string>>({})

  const editableCols = columns.filter(c => c.dataType.toUpperCase() !== 'SERIAL')

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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>Insert Row</h2>
        <form onSubmit={handleSubmit}>
          {editableCols.map(col => (
            <div key={col.name} className="form-group">
              <label>{col.name} <span className="col-type">{col.dataType}</span></label>
              <input
                type="text"
                value={formData[col.name] || ''}
                onChange={e => setFormData({ ...formData, [col.name]: e.target.value })}
                placeholder={col.isNullable === 'YES' ? 'NULL' : ''}
              />
            </div>
          ))}
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">Insert</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default App
