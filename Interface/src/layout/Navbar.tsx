import { useLocation, Link } from 'react-router-dom';

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
        <Link
          to="/settings"
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
          title="Settings"
        >
          <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">settings</span>
        </Link>
      </div>
    </header>
  );
}
