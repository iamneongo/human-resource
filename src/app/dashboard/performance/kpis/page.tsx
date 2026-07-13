import PageContainer from '@/components/layout/page-container';
import { ComingSoon } from '@/features/hr/common/coming-soon';

export const metadata = { title: 'HRM: KPI / OKR' };

export default function Page() {
  return (
    <PageContainer pageTitle='KPI / OKR'>
      <ComingSoon />
    </PageContainer>
  );
}
