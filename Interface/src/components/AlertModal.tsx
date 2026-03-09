import { motion, AnimatePresence } from 'motion/react';

interface AlertModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
  type?: 'success' | 'error' | 'info' | 'warning';
}

export default function AlertModal({ isOpen, title, message, onClose, type = 'info' }: AlertModalProps) {
  const getIcon = () => {
    switch (type) {
      case 'success': return 'check_circle';
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': default: return 'info';
    }
  };

  const getColorClass = () => {
    switch (type) {
      case 'success': return 'text-emerald-500 bg-emerald-500/10';
      case 'error': return 'text-red-500 bg-red-500/10';
      case 'warning': return 'text-yellow-500 bg-yellow-500/10';
      case 'info': default: return 'text-blue-500 bg-blue-500/10';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          key="alert-modal-backdrop"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
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
            className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
          >
            <div className="p-6 space-y-4 text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${getColorClass()}`}>
                <span className="material-symbols-outlined !text-3xl">{getIcon()}</span>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold dark:text-white">{title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {message}
                </p>
              </div>
              <div className="pt-4">
                <button 
                  onClick={onClose}
                  className="w-full py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                >
                  Okay
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
