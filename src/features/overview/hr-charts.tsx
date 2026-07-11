'use client';

import { Area, AreaChart, Bar, BarChart, CartesianGrid, LabelList, Pie, PieChart, XAxis } from 'recharts';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';

import type { HrDashboardData } from './hr-dashboard';

const PALETTE = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)'
];

const vnd = (n: number) => n.toLocaleString('vi-VN') + ' ₫';

export function HrCharts({ data }: { data: HrDashboardData }) {
  const deptData = data.byDept.map((d, i) => ({
    ...d,
    fill: PALETTE[i % PALETTE.length]
  }));
  const deptConfig: ChartConfig = { value: { label: 'Nhân sự' } };

  const statusData = data.byStatus.map((s, i) => ({
    ...s,
    fill: PALETTE[i % PALETTE.length]
  }));
  const statusConfig: ChartConfig = { value: { label: 'Số lượng' } };

  const payrollConfig: ChartConfig = {
    gross: { label: 'Tổng thu nhập', color: 'var(--chart-1)' },
    net: { label: 'Thực nhận', color: 'var(--chart-2)' }
  };

  return (
    <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
      {/* Cơ cấu theo phòng ban - donut */}
      <Card className='flex flex-col'>
        <CardHeader className='items-center pb-0'>
          <CardTitle>Cơ cấu nhân sự theo phòng ban</CardTitle>
          <CardDescription>Phân bổ số nhân viên</CardDescription>
        </CardHeader>
        <CardContent className='flex flex-1 items-center justify-center pb-4'>
          {deptData.length ? (
            <ChartContainer
              config={deptConfig}
              className='mx-auto aspect-square max-h-[260px]'
            >
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey='name' hideLabel />} />
                <Pie data={deptData} dataKey='value' nameKey='name' innerRadius={45} paddingAngle={3} cornerRadius={6}>
                  <LabelList dataKey='value' stroke='none' fontSize={12} fill='var(--background)' />
                </Pie>
              </PieChart>
            </ChartContainer>
          ) : (
            <EmptyChart />
          )}
        </CardContent>
      </Card>

      {/* Trạng thái - bar */}
      <Card className='flex flex-col'>
        <CardHeader>
          <CardTitle>Nhân sự theo trạng thái</CardTitle>
          <CardDescription>Đang làm việc, thử việc, nghỉ...</CardDescription>
        </CardHeader>
        <CardContent className='pb-4'>
          {statusData.length ? (
            <ChartContainer config={statusConfig} className='max-h-[260px] w-full'>
              <BarChart data={statusData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey='label' tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey='value' radius={8} />
              </BarChart>
            </ChartContainer>
          ) : (
            <EmptyChart />
          )}
        </CardContent>
      </Card>

      {/* Quỹ lương theo kỳ - area */}
      <Card className='flex flex-col lg:col-span-2'>
        <CardHeader>
          <CardTitle>Quỹ lương theo kỳ</CardTitle>
          <CardDescription>Tổng thu nhập và thực nhận qua các kỳ lương</CardDescription>
        </CardHeader>
        <CardContent className='pb-4'>
          {data.payrollByPeriod.length ? (
            <ChartContainer config={payrollConfig} className='max-h-[280px] w-full'>
              <AreaChart data={data.payrollByPeriod}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey='period' tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                <ChartTooltip content={<ChartTooltipContent formatter={(v) => vnd(Number(v))} />} />
                <Area dataKey='gross' type='natural' fill='var(--color-gross)' fillOpacity={0.25} stroke='var(--color-gross)' stackId='a' />
                <Area dataKey='net' type='natural' fill='var(--color-net)' fillOpacity={0.4} stroke='var(--color-net)' stackId='b' />
              </AreaChart>
            </ChartContainer>
          ) : (
            <EmptyChart />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className='text-muted-foreground flex h-[220px] w-full items-center justify-center text-sm'>
      Chưa có dữ liệu để hiển thị.
    </div>
  );
}
