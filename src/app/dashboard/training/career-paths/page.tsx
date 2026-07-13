import PageContainer from '@/components/layout/page-container';
import { ComingSoon } from '@/features/hr/common/coming-soon';

export const metadata = { title: 'HRM: Lộ trình nghề nghiệp' };

export default function Page() {
  return (
    <PageContainer pageTitle='Lộ trình nghề nghiệp'>
      <ComingSoon />
    </PageContainer>
  );
}
