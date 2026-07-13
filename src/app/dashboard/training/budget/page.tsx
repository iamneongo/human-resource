import PageContainer from '@/components/layout/page-container';
import { ComingSoon } from '@/features/hr/common/coming-soon';

export const metadata = { title: 'HRM: Ngân sách đào tạo' };

export default function Page() {
  return (
    <PageContainer pageTitle='Ngân sách đào tạo'>
      <ComingSoon />
    </PageContainer>
  );
}
