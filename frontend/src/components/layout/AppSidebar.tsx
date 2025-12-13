'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Image01Icon,
  Video01Icon,
  SparklesIcon,
} from '@hugeicons/core-free-icons';
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
} from '@/components/ui/sidebar';

const navigation = [
  {
    name: 'Slideshows',
    href: '/slideshows',
    icon: Image01Icon,
  },
  {
    name: 'AI Avatar',
    href: '/avatar',
    icon: Video01Icon,
    badge: 'Soon',
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
            <HugeiconsIcon icon={SparklesIcon} className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">TikTokBro</span>
            <span className="text-xs text-muted-foreground">Creator Studio</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Create</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
                const isActive =
                  pathname.startsWith(item.href) ||
                  (item.href === '/slideshows' && pathname === '/');

                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      isActive={isActive}
                      render={<Link href={item.href} />}
                    >
                      <HugeiconsIcon icon={item.icon} />
                      <span>{item.name}</span>
                      {item.badge && (
                        <span className="ml-auto px-1.5 py-0.5 text-[10px] font-medium rounded bg-muted text-muted-foreground">
                          {item.badge}
                        </span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="px-2 py-2 text-xs text-muted-foreground">
          v1.0.0
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
