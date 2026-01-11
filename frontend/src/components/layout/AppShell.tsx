'use client';

import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { PageProvider, usePageContext } from '@/context/PageContext';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
}

function TopBar() {
  const { title, breadcrumbs, toolbarContent, rightActions } = usePageContext();

  return (
    <header className="flex h-14 shrink-0 items-center border-b border-border bg-background px-4">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <SidebarTrigger className="-ml-1" />
        <div className="mx-2 h-4 w-px bg-border" />

        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 ? (
          <nav className="flex items-center gap-1 text-sm">
            {breadcrumbs.map((crumb, index) => (
              <div key={index} className="flex items-center gap-1">
                {index > 0 && <ChevronRight className="size-3.5 text-muted-foreground" />}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="font-medium text-foreground">{crumb.label}</span>
                )}
              </div>
            ))}
          </nav>
        ) : (
          <h1 className="text-sm font-medium">{title || 'Dashboard'}</h1>
        )}

        {/* Toolbar Content (e.g., slide navigation) */}
        {toolbarContent && (
          <>
            <div className="mx-3 h-4 w-px bg-border" />
            {toolbarContent}
          </>
        )}
      </div>

      {/* Right Actions */}
      {rightActions && <div className="flex items-center gap-2 ml-4">{rightActions}</div>}
    </header>
  );
}

function AppContent({ children }: { children: React.ReactNode }) {
  return (
    <SidebarInset className="h-full">
      <TopBar />
      <main className="flex-1 overflow-hidden">{children}</main>
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
