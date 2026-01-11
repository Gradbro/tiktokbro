'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Images, Video, Sparkles, Clapperboard, LayoutTemplate } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarRail,
} from '@/components/ui/sidebar';
import { UserMenu } from './UserMenu';
import { ProductSettingsDialog } from './ProductSettingsDialog';

const items = [
  {
    title: 'Slideshows',
    url: '/slideshows',
    icon: Images,
  },
  {
    title: 'Templates',
    url: '/templates',
    icon: LayoutTemplate,
  },
  {
    title: 'AI Avatars',
    url: '/avatar',
    icon: Video,
    badge: 'Soon',
  },
  {
    title: 'UGC Reactions',
    url: '/reactions',
    icon: Clapperboard,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                render={<Link href="/" />}
                className="hover:bg-transparent active:bg-transparent"
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Sparkles className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">ShortsBro</span>
                  <span className="truncate text-xs text-muted-foreground">Creator Studio</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Create</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      render={<Link href={item.url} />}
                      isActive={
                        pathname === item.url ||
                        pathname.startsWith(item.url + '/') ||
                        (item.url === '/slideshows' && pathname === '/')
                      }
                      tooltip={item.title}
                    >
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                      {item.badge && (
                        <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                          {item.badge}
                        </span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <UserMenu onOpenSettings={() => setSettingsOpen(true)} />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <ProductSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
