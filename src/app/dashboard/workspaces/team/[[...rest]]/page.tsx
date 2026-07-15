'use client';

import PageContainer from '@/components/layout/page-container';
import { teamInfoContent } from '@/config/infoconfig';
import { OrganizationProfile, useAuth } from '@clerk/nextjs';

export default function TeamPage() {
  const { orgId } = useAuth();

  return (
    <PageContainer
      pageTitle='Thành viên workspace'
      pageDescription='Dùng giao diện gốc của Clerk để mời thành viên và quản lý organization hiện tại.'
      infoContent={teamInfoContent}
      access={!!orgId}
      accessFallback={
        <div className='text-muted-foreground max-w-xl text-center text-base'>
          Tài khoản này chưa có workspace đang hoạt động. Hãy đăng nhập bằng tài khoản đã được mời
          vào tổ chức hiện tại.
        </div>
      }
    >
      {orgId ? <OrganizationProfile routing='path' path='/dashboard/workspaces/team' /> : <div />}
    </PageContainer>
  );
}
