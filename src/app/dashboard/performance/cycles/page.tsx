import PageContainer from '@/components/layout/page-container';
import { ComingSoon } from '@/features/hr/common/coming-soon';

export const metadata = { title: 'HRM: Chu kỳ đánh giá' };

export default function Page() {
  return (
    <PageContainer pageTitle='Chu kỳ đánh giá'>
      <ComingSoon />
    </PageContainer>
  );
}
