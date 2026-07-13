import PageContainer from '@/components/layout/page-container';
import { ComingSoon } from '@/features/hr/common/coming-soon';

export const metadata = { title: 'HRM: Thôi việc (Offboarding)' };

export default function OffboardingPage() {
  return (
    <PageContainer pageTitle='Thôi việc (Offboarding)'>
      <ComingSoon />
    </PageContainer>
  );
}
