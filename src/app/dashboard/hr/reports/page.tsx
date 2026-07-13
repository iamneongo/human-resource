import PageContainer from '@/components/layout/page-container';
import { ComingSoon } from '@/features/hr/common/coming-soon';

export const metadata = { title: 'HRM: Báo cáo nhân sự' };

export default function HrReportsPage() {
  return (
    <PageContainer pageTitle='Báo cáo nhân sự'>
      <ComingSoon />
    </PageContainer>
  );
}
