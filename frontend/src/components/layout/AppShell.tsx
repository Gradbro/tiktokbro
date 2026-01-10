'use client';

import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { PageProvider, usePageTitle } from '@/context/PageContext';
import { Separator } from '@/components/ui/separator';

interface AppShellProps {
  children: React.ReactNode;
}

function TopBar() {
  const { title } = usePageTitle();

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <div className="mx-2 h-4 w-px bg-border" />
      <h1 className="text-sm font-medium">{title || 'Dashboard'}</h1>
    </header>
  );
}

function AppContent({ children }: { children: React.ReactNode }) {
  return (
    <SidebarInset>
      <TopBar />
      <main className="flex flex-1 flex-col overflow-auto p-4">{children}</main>
    </SidebarInset>
  );
}

export function AppShell({ children }: AppShellProps) {
  return (
    <PageProvider>
      <SidebarProvider>
        <AppSidebar />
        <AppContent>{children}</AppContent>
      </SidebarProvider>
    </PageProvider>
  );
}
