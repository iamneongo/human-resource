import PageContainer from '@/components/layout/page-container';
import { ComingSoon } from '@/features/hr/common/coming-soon';

export const metadata = { title: 'HRM: Kế hoạch đào tạo' };

export default function Page() {
  return (
    <PageContainer pageTitle='Kế hoạch đào tạo'>
      <ComingSoon />
    </PageContainer>
  );
}
