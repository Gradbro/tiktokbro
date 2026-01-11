'use client';

import { createContext, useContext, useState, useCallback, ReactNode, ReactElement } from 'react';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageContextValue {
  title: string;
  setTitle: (title: string) => void;
  breadcrumbs: Breadcrumb[];
  setBreadcrumbs: (breadcrumbs: Breadcrumb[]) => void;
  toolbarContent: ReactElement | null;
  setToolbarContent: (content: ReactElement | null) => void;
  rightActions: ReactElement | null;
  setRightActions: (content: ReactElement | null) => void;
}

const PageContext = createContext<PageContextValue | null>(null);

export function PageProvider({ children }: { children: ReactNode }) {
  const [title, setTitleState] = useState('');
  const [breadcrumbs, setBreadcrumbsState] = useState<Breadcrumb[]>([]);
  const [toolbarContent, setToolbarContentState] = useState<ReactElement | null>(null);
  const [rightActions, setRightActionsState] = useState<ReactElement | null>(null);

  const setTitle = useCallback((newTitle: string) => {
    setTitleState(newTitle);
  }, []);

  const setBreadcrumbs = useCallback((newBreadcrumbs: Breadcrumb[]) => {
    setBreadcrumbsState(newBreadcrumbs);
  }, []);

  const setToolbarContent = useCallback((content: ReactElement | null) => {
    setToolbarContentState(content);
  }, []);

  const setRightActions = useCallback((content: ReactElement | null) => {
    setRightActionsState(content);
  }, []);

  return (
    <PageContext.Provider
      value={{
        title,
        setTitle,
        breadcrumbs,
        setBreadcrumbs,
        toolbarContent,
        setToolbarContent,
        rightActions,
        setRightActions,
      }}
    >
      {children}
    </PageContext.Provider>
  );
}

export function usePageContext() {
  const context = useContext(PageContext);
  if (!context) {
    throw new Error('usePageContext must be used within a PageProvider');
  }
  return context;
}

export function usePageTitle() {
  const context = usePageContext();
  return { title: context.title, setTitle: context.setTitle };
}

export function useSetPageTitle(title: string) {
  const { setTitle } = usePageTitle();

  // Set title on mount
  if (typeof window !== 'undefined') {
    setTitle(title);
  }

  return null;
}
