'use client';

import Image from 'next/image';
import Link from 'next/link';

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from '@/components/ui/sidebar';

export function AppBrand() {
  const { state } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size='lg' asChild>
          <Link href='/dashboard/overview'>
            <div className='bg-sidebar-primary/8 ring-sidebar-primary/12 flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg ring-1'>
              <Image
                src='/brand/app-logo.png'
                alt='Nhân sự HRM'
                width={24}
                height={24}
                className='size-6 object-contain'
                priority
              />
            </div>
            <div
              className={`grid flex-1 text-left text-sm leading-tight transition-all duration-200 ease-in-out ${
                state === 'collapsed'
                  ? 'invisible max-w-0 overflow-hidden opacity-0'
                  : 'visible max-w-full opacity-100'
              }`}
            >
              <span className='truncate font-semibold'>Nhân sự HRM</span>
              <span className='text-muted-foreground truncate text-xs'>
                Hệ thống quản lý nguồn nhân lực
              </span>
            </div>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
