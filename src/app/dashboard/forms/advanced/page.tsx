import PageContainer from '@/components/layout/page-container';
import AdvancedFormPatterns from '@/features/forms/components/advanced-form-patterns';

export const metadata = {
  title: 'Dashboard: Advanced Form Patterns'
};

export default function Page() {
  return (
    <PageContainer pageTitle='Advanced Form Patterns'>
      <AdvancedFormPatterns />
    </PageContainer>
  );
}
