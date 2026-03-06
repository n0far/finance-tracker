import { createContext, useContext, useState, useEffect } from 'react';
import { listCategories } from '../api/categories';
import { useAuth } from './AuthContext';

const CategoriesContext = createContext({ categories: [], refresh: () => {} });

export function CategoriesProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [categories, setCategories] = useState([]);

  async function refresh() {
    if (!isAuthenticated) return;
    try {
      const data = await listCategories();
      setCategories(data.categories);
    } catch {
      // silently fail; pages will show their own error states
    }
  }

  useEffect(() => { refresh(); }, [isAuthenticated]); // eslint-disable-line

  return (
    <CategoriesContext.Provider value={{ categories, refresh }}>
      {children}
    </CategoriesContext.Provider>
  );
}

export function useCategories() {
  return useContext(CategoriesContext);
}
