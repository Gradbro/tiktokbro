'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface PageContextValue {
  title: string;
  setTitle: (title: string) => void;
}

const PageContext = createContext<PageContextValue | null>(null);

export function PageProvider({ children }: { children: ReactNode }) {
  const [title, setTitleState] = useState('');

  const setTitle = useCallback((newTitle: string) => {
    setTitleState(newTitle);
  }, []);

  return <PageContext.Provider value={{ title, setTitle }}>{children}</PageContext.Provider>;
}

export function usePageTitle() {
  const context = useContext(PageContext);
  if (!context) {
    throw new Error('usePageTitle must be used within a PageProvider');
  }
  return context;
}

export function useSetPageTitle(title: string) {
  const { setTitle } = usePageTitle();

  // Set title on mount
  if (typeof window !== 'undefined') {
    setTitle(title);
  }

  return null;
}
