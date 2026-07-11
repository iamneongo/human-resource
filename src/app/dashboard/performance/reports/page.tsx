import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BellChart } from '@/features/hr/performance/bell-chart';
import { performanceDistribution } from '@/features/hr/performance/reports';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';

export const metadata = { title: 'HRM: Báo cáo hiệu suất' };

export default async function PerformanceReportsPage() {
  const role = await getCurrentRole();
  if (!roleAtLeast(role, 'manager')) {
    return <PageContainer pageTitle='Báo cáo hiệu suất' access={false}><div /></PageContainer>;
  }
  const { total, bands } = await performanceDistribution();

  return (
    <PageContainer
      pageTitle='Báo cáo hiệu suất'
      pageDescription='Phân bố kết quả đánh giá (Bell-curve) theo xếp loại A/B/C/D.'
    >
      <p className='text-muted-foreground mb-4 text-sm'>
        Tổng số đánh giá đã chốt: <span className='font-semibold'>{total}</span>
      </p>
      <Card className='mb-6'>
        <CardHeader>
          <CardTitle className='text-base'>Phân bố xếp loại (Bell-curve)</CardTitle>
        </CardHeader>
        <CardContent>
          <BellChart data={bands} />
        </CardContent>
      </Card>

      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        {bands.map((b) => (
          <Card key={b.id}>
            <CardHeader className='pb-2'>
              <CardTitle className='text-muted-foreground text-sm font-medium'>
                {b.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{b.count}</div>
              <div className='bg-muted mt-2 h-2 w-full overflow-hidden rounded'>
                <div
                  className='bg-primary h-full'
                  style={{ width: `${b.percent}%` }}
                />
              </div>
              <div className='text-muted-foreground mt-1 text-xs'>{b.percent}%</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
