import PageContainer from '@/components/layout/page-container';
import { ComingSoon } from '@/features/hr/common/coming-soon';

export const metadata = { title: 'HRM: Khóa học & Nội dung' };

export default function Page() {
  return (
    <PageContainer pageTitle='Khóa học & Nội dung'>
      <ComingSoon />
    </PageContainer>
  );
}
