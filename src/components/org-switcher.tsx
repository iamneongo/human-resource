'use client';

import { useEffect } from 'react';
import { useAuth, useOrganizationList } from '@clerk/nextjs';
import { Icons } from '@/components/icons';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from '@/components/ui/sidebar';

export function OrgSwitcher() {
  const { state } = useSidebar();
  const router = useRouter();
  const { isLoaded, setActive, userMemberships } = useOrganizationList({
    userMemberships: {
      infinite: true,
      keepPreviousData: false
    }
  });
  const { orgId } = useAuth();

  useEffect(() => {
    if (userMemberships?.revalidate) {
      void userMemberships.revalidate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only revalidate when org changes
  }, [orgId]);

  useEffect(() => {
    if (!isLoaded || orgId || !setActive) {
      return;
    }

    const firstMembership = userMemberships?.data?.[0];
    if (!firstMembership) {
      return;
    }

    void setActive({ organization: firstMembership.organization.id });
  }, [isLoaded, orgId, setActive, userMemberships?.data]);

  if (!isLoaded) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size='lg' disabled>
            <div className='bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg'>
              <Icons.galleryVerticalEnd className='size-4' />
            </div>
            <div
              className={`grid flex-1 text-left text-sm leading-tight transition-all duration-200 ease-in-out ${
                state === 'collapsed'
                  ? 'invisible max-w-0 overflow-hidden opacity-0'
                  : 'visible max-w-full opacity-100'
              }`}
            >
              <span className='truncate font-medium'>Đang tải workspace...</span>
              <span className='text-muted-foreground truncate text-xs'>Clerk organization</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  if (!userMemberships?.data || userMemberships.data.length === 0) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size='lg'
            onClick={() => router.push('/dashboard/workspaces/team')}
            className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
          >
            <div className='bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg'>
              <Icons.workspace className='size-4' />
            </div>
            <div
              className={`grid flex-1 text-left text-sm leading-tight transition-all duration-200 ease-in-out ${
                state === 'collapsed'
                  ? 'invisible max-w-0 overflow-hidden opacity-0'
                  : 'visible max-w-full opacity-100'
              }`}
            >
              <span className='truncate font-medium'>Chưa có workspace</span>
              <span className='text-muted-foreground truncate text-xs'>
                Chờ được thêm vào tổ chức
              </span>
            </div>
            <Icons.chevronRight
              className={`ml-auto transition-all duration-200 ease-in-out ${
                state === 'collapsed'
                  ? 'invisible max-w-0 opacity-0'
                  : 'visible max-w-full opacity-100'
              }`}
            />
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  const activeOrganization = userMemberships.data.find(
    (membership) => membership.organization.id === orgId
  )?.organization;
  const displayOrganization = activeOrganization || userMemberships.data[0]?.organization;

  if (!displayOrganization) {
    return null;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size='lg'
          onClick={() => router.push('/dashboard/workspaces/team')}
          className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
        >
          <div className='bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg'>
            {displayOrganization.hasImage && displayOrganization.imageUrl ? (
              <Image
                src={displayOrganization.imageUrl}
                alt={displayOrganization.name}
                width={32}
                height={32}
                className='size-full object-cover'
              />
            ) : (
              <Icons.galleryVerticalEnd className='size-4' />
            )}
          </div>
          <div
            className={`grid flex-1 text-left text-sm leading-tight transition-all duration-200 ease-in-out ${
              state === 'collapsed'
                ? 'invisible max-w-0 overflow-hidden opacity-0'
                : 'visible max-w-full opacity-100'
            }`}
          >
            <span className='truncate font-medium'>{displayOrganization.name}</span>
            <span className='text-muted-foreground truncate text-xs'>Workspace hiện tại</span>
          </div>
          <Icons.chevronRight
            className={`ml-auto transition-all duration-200 ease-in-out ${
              state === 'collapsed'
                ? 'invisible max-w-0 opacity-0'
                : 'visible max-w-full opacity-100'
            }`}
          />
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
