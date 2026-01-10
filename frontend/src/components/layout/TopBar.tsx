'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { usePageTitle } from '@/context/PageContext';

export function TopBar() {
  const { title } = usePageTitle();

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/80 backdrop-blur-sm px-4">
      <SidebarTrigger className="size-7" />
      {title && (
        <>
          <Separator orientation="vertical" className="!h-4 !self-auto" />
          <h1 className="text-sm font-medium text-foreground">{title}</h1>
        </>
      )}
    </header>
  );
}
