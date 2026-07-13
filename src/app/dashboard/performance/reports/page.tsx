import PageContainer from '@/components/layout/page-container';
import { ComingSoon } from '@/features/hr/common/coming-soon';

export const metadata = { title: 'HRM: Báo cáo hiệu suất' };

export default function Page() {
  return (
    <PageContainer pageTitle='Báo cáo hiệu suất'>
      <ComingSoon />
    </PageContainer>
  );
}
