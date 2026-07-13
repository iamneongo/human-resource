'use client';

import PageContainer from '@/components/layout/page-container';
import { OrganizationProfile } from '@clerk/nextjs';
import { teamInfoContent } from '@/config/infoconfig';

export default function TeamPage() {
  return (
    <PageContainer pageTitle='Team Management' infoContent={teamInfoContent}>
      <OrganizationProfile />
    </PageContainer>
  );
}
