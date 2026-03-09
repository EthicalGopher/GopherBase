export default function Settings() {
  return (
    <div className="p-8 space-y-8 overflow-y-auto max-w-7xl mx-auto w-full h-full custom-scrollbar">
      <div className="flex flex-col gap-1">
        <h1 className="text-slate-900 dark:text-white text-4xl font-black tracking-tight">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 text-base">Manage your account and project settings.</p>
      </div>
      <div className="glass-card rounded-xl p-6">
        <p className="text-slate-500 dark:text-slate-400">Settings content goes here.</p>
      </div>
    </div>
  );
}
