import PageContainer from '@/components/layout/page-container';
import { ComingSoon } from '@/features/hr/common/coming-soon';

export const metadata = { title: 'HRM: Nhu cầu đào tạo (TNA)' };

export default function Page() {
  return (
    <PageContainer pageTitle='Nhu cầu đào tạo (TNA)'>
      <ComingSoon />
    </PageContainer>
  );
}
