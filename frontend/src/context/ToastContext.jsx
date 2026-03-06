import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext({ addToast: () => {} });

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const remove = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
        {toasts.map(t => (
          <div
            key={t.id}
            onClick={() => remove(t.id)}
            className={`px-4 py-3 rounded-lg shadow-lg text-white text-sm cursor-pointer max-w-sm flex items-start gap-2 ${
              t.type === 'error' ? 'bg-red-600' :
              t.type === 'success' ? 'bg-green-600' :
              t.type === 'warning' ? 'bg-yellow-500' : 'bg-gray-800'
            }`}
          >
            <span className="flex-1">{t.message}</span>
            <span className="text-white/70 text-xs mt-0.5">✕</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
