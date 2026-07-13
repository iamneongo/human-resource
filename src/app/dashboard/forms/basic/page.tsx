import PageContainer from '@/components/layout/page-container';
import DemoForm from '@/components/forms/demo-form';

export const metadata = {
  title: 'Dashboard: Basic Form'
};

export default function Page() {
  return (
    <PageContainer pageTitle='Basic Form'>
      <DemoForm />
    </PageContainer>
  );
}
