import PageContainer from '@/components/layout/page-container';
import { ComingSoon } from '@/features/hr/common/coming-soon';

export const metadata = { title: 'HRM: Thiết bị chấm công' };

export default function DevicesPage() {
  return (
    <PageContainer pageTitle='Thiết bị chấm công'>
      <ComingSoon />
    </PageContainer>
  );
}
