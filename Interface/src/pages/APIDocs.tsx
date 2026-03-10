import { useState } from 'react';
import { useDatabase } from '../contexts/DatabaseContext';

export default function APIDocs() {
  const { tables } = useDatabase();
  const [selectedTable, setSelectedTable] = useState<string>(tables[0] || 'your_table_name');

  const filteredTables = tables.filter(t => 
    t !== 'auth' && 
    t !== '_gopherbase_config' && 
    t !== '_gopherbase_logs' && 
    t !== '_gopherbase_files' && 
    t !== '_gopherbase_buckets'
  );

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const SnippetBlock = ({ title, description, code, type = 'ts' }: { title: string, description: string, code: string, type?: string }) => (
    <div className="space-y-4 pt-8 first:pt-0 border-t border-slate-200 dark:border-slate-800 first:border-0">
      <h2 className="text-xl font-bold dark:text-white">{title}</h2>
      <p className="text-sm text-slate-600 dark:text-slate-400 max-w-3xl">
        {description}
      </p>
      <div className="relative group">
        <div className="absolute top-4 right-4 flex gap-2">
          <button 
            onClick={() => copyToClipboard(code)}
            className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-lg text-white transition-all opacity-0 group-hover:opacity-100"
            title="Copy Code"
          >
            <span className="material-symbols-outlined text-sm">content_copy</span>
          </button>
        </div>
        <pre className="bg-slate-900 rounded-xl p-6 text-slate-300 font-mono text-sm overflow-x-auto shadow-xl">
          <code className={`language-${type}`}>{code}</code>
        </pre>
      </div>
    </div>
  );

  return (
    <div className="p-8 space-y-8 overflow-y-auto w-full h-full custom-scrollbar max-w-5xl mx-auto pb-24">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">GopherBase SDK Documentation</h1>
        <p className="text-slate-500 dark:text-slate-400">Detailed reference guide for the official Javascript/TypeScript client</p>
      </div>

      <div className="bg-primary/5 border border-primary/10 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-primary mb-1">Package Installation</h3>
          <code className="text-sm font-mono font-bold dark:text-white">npm install gopherbase</code>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Contextualize Examples</label>
          <select 
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value)}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="your_table_name">-- Choose a table --</option>
            {filteredTables.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-12">
        <section className="space-y-8">
          <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <span className="material-symbols-outlined text-primary text-3xl">power</span>
            <h2 className="text-2xl font-black dark:text-white">Initialization</h2>
          </div>
          
          <SnippetBlock
            title="Create Client"
            description="Import the createClient function and initialize it with your server URL and public/anon key."
            code={`import { createClient } from "gopherbase";\n\n// Initialize the client\nconst gb = createClient("http://localhost:8080", "YOUR_PUBLIC_KEY");`}
          />
        </section>

        <section className="space-y-8">
          <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4 mt-12">
            <span className="material-symbols-outlined text-primary text-3xl">shield_person</span>
            <h2 className="text-2xl font-black dark:text-white">Authentication</h2>
          </div>

          <SnippetBlock
            title="Sign Up"
            description="Register a new user using their email and password. This returns an AuthToken containing the access and refresh tokens."
            code={`const token = await gb.auth.signUp("user@example.com", "secure-password");\nconsole.log("Access Token:", token.access_token);`}
          />

          <SnippetBlock
            title="Sign In"
            description="Authenticate an existing user. Sets the session tokens internally for subsequent requests."
            code={`const token = await gb.auth.signIn("user@example.com", "secure-password");`}
          />

          <SnippetBlock
            title="Get Current User"
            description="Retrieve the profile data of the currently authenticated user."
            code={`const user = await gb.auth.getUser();\nconsole.log("User ID:", user.id);\nconsole.log("Email:", user.email);`}
          />

          <SnippetBlock
            title="Sign Out"
            description="Invalidate the current session and clear local tokens."
            code={`await gb.auth.signOut();`}
          />
          
          <SnippetBlock
            title="Session Management"
            description="Manually set or refresh session tokens."
            code={`// Manually set an existing session\ngb.auth.setSession("ACCESS_TOKEN", "REFRESH_TOKEN");\n\n// Refresh the current session\nconst newToken = await gb.auth.refreshSession();`}
          />
        </section>

        <section className="space-y-8">
          <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4 mt-12">
            <span className="material-symbols-outlined text-primary text-3xl">database</span>
            <h2 className="text-2xl font-black dark:text-white">Database Querying</h2>
          </div>

          <SnippetBlock
            title="Fetch All Records"
            description={`Retrieve all records from ${selectedTable}. You can specify columns or use "*" for all.`}
            code={`const data = await gb\n  .from("${selectedTable}")\n  .select("*")\n  .execute();\n\nconsole.log(data);`}
          />

          <SnippetBlock
            title="Select Specific Columns"
            description="Reduce payload size by selecting only the columns you need."
            code={`const data = await gb\n  .from("${selectedTable}")\n  .select("id, name, created_at")\n  .execute();`}
          />

          <SnippetBlock
            title="Filter Results"
            description="Apply filters to your query. You can chain multiple filters (they act as AND conditions in the URL builder)."
            code={`const data = await gb\n  .from("${selectedTable}")\n  .select("*")\n  .filter("status=eq.active")\n  .filter("age=gt.18")\n  .execute();`}
          />

          <SnippetBlock
            title="Insert Data"
            description={`Insert a new row into ${selectedTable}.`}
            code={`const response = await gb.insert("${selectedTable}", {\n  title: "New Post",\n  content: "This is the post content",\n  is_published: true\n});`}
          />
        </section>

        <section className="space-y-8">
          <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4 mt-12">
            <span className="material-symbols-outlined text-primary text-3xl">schema</span>
            <h2 className="text-2xl font-black dark:text-white">Schema Management</h2>
          </div>

          <SnippetBlock
            title="Create Table Builder"
            description="Use the fluent SchemaBuilder API to programmatically define and create new tables."
            code={`await gb.schema\n  .create("employees")\n  .column("id", "uuid").primary().default("gen_random_uuid()")\n  .column("department_id", "integer").references("departments", "id").onDelete("cascade")\n  .column("email", "varchar").length(255).unique().notNull()\n  .column("age", "integer").unsigned().check("age >= 18")\n  .column("is_active", "boolean").default(true)\n  .execute();`}
          />

          <SnippetBlock
            title="Drop Table"
            description="Permanently delete a table and all its data."
            code={`await gb.schema.drop("employees");`}
          />
        </section>
      </div>
    </div>
  );
}
