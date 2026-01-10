'use client';

import { useEffect } from 'react';
import { usePageTitle } from '@/context/PageContext';

interface PageTitleProps {
  title: string;
}

export function PageTitle({ title }: PageTitleProps) {
  const { setTitle } = usePageTitle();

  useEffect(() => {
    setTitle(title);
    return () => setTitle('');
  }, [title, setTitle]);

  return null;
}
