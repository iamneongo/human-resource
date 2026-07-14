'use client';

import PageContainer from '@/components/layout/page-container';
import { workspacesInfoContent } from '@/config/infoconfig';
import { OrganizationList } from '@clerk/nextjs';

export default function WorkspacesPage() {
  return (
    <PageContainer
      pageTitle='Tổ chức'
      pageDescription='Tạo tổ chức mới hoặc chọn tổ chức đang có để vào trang quản lý thành viên.'
      infoContent={workspacesInfoContent}
    >
      <OrganizationList
        appearance={{
          elements: {
            organizationListBox: 'space-y-2',
            organizationPreview: 'rounded-lg border p-4 hover:bg-accent',
            organizationPreviewMainIdentifier: 'text-lg font-semibold',
            organizationPreviewSecondaryIdentifier: 'text-sm text-muted-foreground'
          }
        }}
        afterSelectOrganizationUrl='/dashboard/workspaces/team'
        afterCreateOrganizationUrl='/dashboard/workspaces/team'
      />
    </PageContainer>
  );
}
