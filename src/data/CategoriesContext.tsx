import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { type Category, type CategoryId, findCategoryById } from './categories';

const STORAGE_KEY = 'headsup:categories';
const REMOTE_URL = 'https://raw.githubusercontent.com/ShubhankarDas/headsup-game/main/categories.json';

type RefreshStatus = 'idle' | 'loading' | 'error';

interface CategoriesContextValue {
  categories: Category[];
  status: RefreshStatus;
  error: string | null;
  hasLoadedCache: boolean;
  refresh: () => Promise<void>;
  getCategoryById: (id: CategoryId) => Category | undefined;
}

const CategoriesContext = createContext<CategoriesContextValue | null>(null);

function isValidCategory(value: unknown): value is Category {
  if (!value || typeof value !== 'object') return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.id === 'string' &&
    typeof c.name === 'string' &&
    typeof c.icon === 'string' &&
    typeof c.bgColor === 'string' &&
    typeof c.textColor === 'string' &&
    Array.isArray(c.words) &&
    c.words.every((w) => typeof w === 'string')
  );
}

export function CategoriesProvider({ children }: PropsWithChildren) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [status, setStatus] = useState<RefreshStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedCache, setHasLoadedCache] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!stored) return;
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.every(isValidCategory)) {
          setCategories(parsed);
        }
      })
      .catch(() => {
        // Corrupt/unreadable cache — leave categories empty, user can refresh.
      })
      .finally(() => setHasLoadedCache(true));
  }, []);

  const refresh = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const response = await fetch(REMOTE_URL);
      if (!response.ok) throw new Error(`Server returned ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data) || !data.every(isValidCategory)) {
        throw new Error('Received malformed category data');
      }
      // Overwrite entirely — refresh always replaces, never merges.
      setCategories(data);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to refresh categories');
    }
  }, []);

  const getCategoryById = useCallback(
    (id: CategoryId) => findCategoryById(categories, id),
    [categories]
  );

  const value = useMemo<CategoriesContextValue>(
    () => ({ categories, status, error, hasLoadedCache, refresh, getCategoryById }),
    [categories, status, error, hasLoadedCache, refresh, getCategoryById]
  );

  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>;
}

export function useCategories(): CategoriesContextValue {
  const ctx = useContext(CategoriesContext);
  if (!ctx) throw new Error('useCategories must be used within a CategoriesProvider');
  return ctx;
}
