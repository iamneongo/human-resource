import PageContainer from '@/components/layout/page-container';
import { Card, CardContent } from '@/components/ui/card';
import { getOrgTree } from '@/features/hr/org/actions';
import { OrgChart } from '@/features/hr/org/org-chart';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';

export const metadata = { title: 'HRM: Sơ đồ tổ chức' };

export default async function OrgChartPage() {
  const role = await getCurrentRole();
  if (!roleAtLeast(role, 'manager')) {
    return (
      <PageContainer
        pageTitle='Sơ đồ tổ chức'
        access={false}
        accessFallback={
          <div className='text-muted-foreground text-center text-lg'>
            Bạn không có quyền xem sơ đồ tổ chức.
          </div>
        }
      >
        <div />
      </PageContainer>
    );
  }

  const roots = await getOrgTree();

  return (
    <PageContainer pageTitle='Sơ đồ tổ chức'>
      <Card>
        <CardContent className='p-2 sm:p-4'>
          <OrgChart roots={roots} />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
