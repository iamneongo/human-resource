'use client';

import PageContainer from '@/components/layout/page-container';
import { teamInfoContent } from '@/config/infoconfig';
import { OrganizationProfile } from '@clerk/nextjs';

export default function TeamPage() {
  return (
    <PageContainer
      pageTitle='Thành viên tổ chức'
      pageDescription='Bạn có thể mời thành viên mới bằng email ngay trong mục Members của Clerk Organization Profile.'
      infoContent={teamInfoContent}
    >
      <OrganizationProfile />
    </PageContainer>
  );
}
