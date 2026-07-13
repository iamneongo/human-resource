import PageContainer from '@/components/layout/page-container';
import { ComingSoon } from '@/features/hr/common/coming-soon';

export const metadata = { title: 'HRM: Ghi danh học viên' };

export default function Page() {
  return (
    <PageContainer pageTitle='Ghi danh học viên'>
      <ComingSoon />
    </PageContainer>
  );
}
