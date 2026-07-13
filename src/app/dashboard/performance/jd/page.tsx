import PageContainer from '@/components/layout/page-container';
import { ComingSoon } from '@/features/hr/common/coming-soon';

export const metadata = { title: 'HRM: Mô tả công việc (JD)' };

export default function Page() {
  return (
    <PageContainer pageTitle='Mô tả công việc (JD)'>
      <ComingSoon />
    </PageContainer>
  );
}
