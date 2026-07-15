import { and, count, eq, max, or, sql } from 'drizzle-orm';

import PageContainer from '@/components/layout/page-container';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/db';
import {
  contracts,
  departments,
  employees,
  manualAttendanceEntries,
  timesheets
} from '@/db/schema';
import { HrCharts } from '@/features/overview/hr-charts';
import { hrDashboardData } from '@/features/overview/hr-dashboard';

function formatWorkDateLabel(value: string | null): string {
  if (!value) return 'chưa có dữ liệu công';

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('vi-VN').format(date);
}

async function getSummary() {
  try {
    const [emp, dept, activeContracts, latestTimesheetDate, latestManualDate] = await Promise.all([
      db.select({ v: count() }).from(employees),
      db.select({ v: count() }).from(departments),
      db.select({ v: count() }).from(contracts).where(eq(contracts.status, 'active')),
      db.select({ workDate: max(timesheets.workDate) }).from(timesheets),
      db.select({ workDate: max(manualAttendanceEntries.workDate) }).from(manualAttendanceEntries)
    ]);

    const latestWorkDate =
      [latestTimesheetDate[0]?.workDate ?? null, latestManualDate[0]?.workDate ?? null]
        .filter((value): value is string => Boolean(value))
        .sort((left, right) => left.localeCompare(right))
        .at(-1) ?? null;

    let latestPresence = 0;

    if (latestWorkDate) {
      const [manualRows, timesheetRows] = await Promise.all([
        db
          .selectDistinct({ employeeId: manualAttendanceEntries.employeeId })
          .from(manualAttendanceEntries)
          .where(
            and(
              eq(manualAttendanceEntries.workDate, latestWorkDate),
              or(
                eq(manualAttendanceEntries.morning, true),
                eq(manualAttendanceEntries.afternoon, true)
              )
            )
          ),
        db
          .selectDistinct({ employeeId: timesheets.employeeId })
          .from(timesheets)
          .where(
            and(
              eq(timesheets.workDate, latestWorkDate),
              eq(timesheets.status, 'present'),
              sql`${timesheets.workedHours} IS NULL OR ${timesheets.workedHours} > 0`
            )
          )
      ]);

      latestPresence = new Set([
        ...manualRows.map((row) => row.employeeId),
        ...timesheetRows.map((row) => row.employeeId)
      ]).size;
    }

    return {
      total: Number(emp[0]?.v ?? 0),
      departments: Number(dept[0]?.v ?? 0),
      latestPresence,
      latestWorkDate,
      contracts: Number(activeContracts[0]?.v ?? 0)
    };
  } catch {
    return {
      total: 0,
      departments: 0,
      latestPresence: 0,
      latestWorkDate: null,
      contracts: 0
    };
  }
}

export default async function OverViewLayout() {
  const [summary, chartData] = await Promise.all([getSummary(), hrDashboardData()]);
  const cards = [
    {
      label: 'Tổng nhân sự',
      value: summary.total,
      hint: 'Toàn bộ hồ sơ nhân viên'
    },
    {
      label: 'Có mặt ngày gần nhất',
      value: summary.latestPresence,
      hint: `Chấm công ngày ${formatWorkDateLabel(summary.latestWorkDate)}`
    },
    {
      label: 'Phòng ban',
      value: summary.departments,
      hint: 'Số phòng ban trong cơ cấu'
    },
    {
      label: 'Hợp đồng hiệu lực',
      value: summary.contracts,
      hint: 'Hợp đồng còn hiệu lực'
    }
  ];

  return (
    <PageContainer>
      <div className='flex flex-1 flex-col space-y-2'>
        <div className='flex items-center justify-between'>
          <h2 className='text-2xl font-bold tracking-tight'>Xin chào, chào mừng trở lại</h2>
        </div>

        <div className='*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs md:grid-cols-2 lg:grid-cols-4'>
          {cards.map((card) => (
            <Card key={card.label} className='@container/card'>
              <CardHeader>
                <CardDescription>{card.label}</CardDescription>
                <CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>
                  {card.value.toLocaleString('vi-VN')}
                </CardTitle>
              </CardHeader>
              <CardFooter className='text-muted-foreground text-sm'>{card.hint}</CardFooter>
            </Card>
          ))}
        </div>
        <HrCharts data={chartData} />
      </div>
    </PageContainer>
  );
}
