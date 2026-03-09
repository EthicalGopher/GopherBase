import { useLocation } from 'react-router-dom';

export default function Navbar() {
  const location = useLocation();
  const pathParts = location.pathname.split('/').filter(Boolean);
  
  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-background-dark/50 backdrop-blur-md flex items-center justify-between px-8 z-30">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
          <span className="material-symbols-outlined text-lg">home</span>
          <span>/</span>
          {pathParts.length === 0 ? (
            <span className="text-slate-900 dark:text-white font-bold">Dashboard</span>
          ) : (
            pathParts.map((part, i) => (
              <span key={part} className="flex items-center gap-2">
                <span className={`${i === pathParts.length - 1 ? 'text-slate-900 dark:text-white font-bold' : ''} capitalize`}>
                  {part.replace(/-/g, ' ')}
                </span>
                {i < pathParts.length - 1 && <span>/</span>}
              </span>
            ))
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative hidden md:block">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">search</span>
          <input 
            type="text" 
            placeholder="Search anything..." 
            className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800/50 border-transparent focus:bg-white dark:focus:bg-slate-800 border dark:border-slate-700 rounded-full text-sm w-64 transition-all outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative">
          <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">notifications</span>
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-background-dark"></span>
        </button>
        <div className="w-px h-6 bg-slate-200 dark:border-slate-800 mx-2"></div>
        <button className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-accent-purple flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-primary/20">
            GB
          </div>
        </button>
      </div>
    </header>
  );
}
