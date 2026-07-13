import { count, eq } from 'drizzle-orm';

import PageContainer from '@/components/layout/page-container';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { db } from '@/db';
import { contracts, departments, employees } from '@/db/schema';
import { HrCharts } from '@/features/overview/hr-charts';
import { hrDashboardData } from '@/features/overview/hr-dashboard';

async function getSummary() {
  try {
    const [emp, dept, activeEmp, activeContracts] = await Promise.all([
      db.select({ v: count() }).from(employees),
      db.select({ v: count() }).from(departments),
      db.select({ v: count() }).from(employees).where(eq(employees.status, 'active')),
      db.select({ v: count() }).from(contracts).where(eq(contracts.status, 'active'))
    ]);
    return {
      total: Number(emp[0]?.v ?? 0),
      departments: Number(dept[0]?.v ?? 0),
      active: Number(activeEmp[0]?.v ?? 0),
      contracts: Number(activeContracts[0]?.v ?? 0)
    };
  } catch {
    return { total: 0, departments: 0, active: 0, contracts: 0 };
  }
}

export default async function OverViewLayout() {
  const [s, chartData] = await Promise.all([getSummary(), hrDashboardData()]);
  const cards = [
    { label: 'Tổng nhân sự', value: s.total, hint: 'Toàn bộ hồ sơ nhân viên' },
    { label: 'Đang làm việc', value: s.active, hint: 'Nhân viên trạng thái hoạt động' },
    { label: 'Phòng ban', value: s.departments, hint: 'Số phòng ban trong cơ cấu' },
    { label: 'Hợp đồng hiệu lực', value: s.contracts, hint: 'Hợp đồng còn hiệu lực' }
  ];
  return (
    <PageContainer>
      <div className='flex flex-1 flex-col space-y-2'>
        <div className='flex items-center justify-between'>
          <h2 className='text-2xl font-bold tracking-tight'>Xin chào, chào mừng trở lại 👋</h2>
        </div>

        <div className='*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs md:grid-cols-2 lg:grid-cols-4'>
          {cards.map((c) => (
            <Card key={c.label} className='@container/card'>
              <CardHeader>
                <CardDescription>{c.label}</CardDescription>
                <CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>
                  {c.value.toLocaleString('vi-VN')}
                </CardTitle>
              </CardHeader>
              <CardFooter className='text-muted-foreground text-sm'>{c.hint}</CardFooter>
            </Card>
          ))}
        </div>
        <HrCharts data={chartData} />
      </div>
    </PageContainer>
  );
}
