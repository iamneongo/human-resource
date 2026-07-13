import PageContainer from '@/components/layout/page-container';
import { ImportClient } from '@/features/hr/import/import-client';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';

export const metadata = { title: 'HRM: Import nhân viên' };

export default async function ImportPage() {
  const role = await getCurrentRole();
  if (!roleAtLeast(role, 'hr')) {
    return (
      <PageContainer
        pageTitle='Import nhân viên'
        access={false}
        accessFallback={
          <div className='text-muted-foreground text-center text-lg'>
            Chỉ HR/Admin được import dữ liệu.
          </div>
        }
      >
        <div />
      </PageContainer>
    );
  }
  return (
    <PageContainer pageTitle='Import nhân viên từ Excel / CSV'>
      <ImportClient />
    </PageContainer>
  );
}
