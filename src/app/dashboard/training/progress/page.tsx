import PageContainer from '@/components/layout/page-container';
import { ComingSoon } from '@/features/hr/common/coming-soon';

export const metadata = { title: 'HRM: Theo dõi học tập' };

export default function Page() {
  return (
    <PageContainer pageTitle='Theo dõi học tập'>
      <ComingSoon />
    </PageContainer>
  );
}
