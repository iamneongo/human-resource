'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis
} from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
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

const vnd = (n: number) =>
  n >= 1_000_000
    ? (n / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' tr₫'
    : n.toLocaleString('vi-VN') + ' ₫';

export function HrCharts({ data }: { data: HrDashboardData }) {
  // Phòng ban (nhóm động) — tô màu xoay vòng theo bảng màu của theme
  const deptData = data.byDept.map((d, i) => ({
    ...d,
    fill: PALETTE[i % PALETTE.length]
  }));
  const deptTotal = deptData.reduce((s, d) => s + d.value, 0);
  const deptConfig: ChartConfig = { value: { label: 'Nhân sự' } };

  // Trạng thái — màu điều khiển qua config (chuẩn shadcn: var(--color-<key>))
  const statusConfig: ChartConfig = {
    value: { label: 'Số lượng' },
    active: { label: 'Đang làm việc', color: 'var(--chart-1)' },
    probation: { label: 'Thử việc', color: 'var(--chart-2)' },
    on_leave: { label: 'Nghỉ phép', color: 'var(--chart-3)' },
    terminated: { label: 'Đã nghỉ', color: 'var(--chart-4)' }
  };
  const statusData = data.byStatus.map((s) => ({
    ...s,
    fill: `var(--color-${s.status})`
  }));

  // Giới tính
  const genderConfig: ChartConfig = {
    value: { label: 'Nhân sự' },
    male: { label: 'Nam', color: 'var(--chart-1)' },
    female: { label: 'Nữ', color: 'var(--chart-4)' },
    other: { label: 'Khác', color: 'var(--chart-3)' }
  };
  const genderData = data.byGender.map((g) => ({
    ...g,
    fill: `var(--color-${g.gender})`
  }));
  const genderTotal = genderData.reduce((s, g) => s + g.value, 0);

  // Loại hợp đồng
  const contractConfig: ChartConfig = { value: { label: 'Hợp đồng' } };
  const contractData = data.byContractType.map((c, i) => ({
    ...c,
    fill: PALETTE[i % PALETTE.length]
  }));

  const headcountConfig: ChartConfig = {
    total: { label: 'Tổng nhân sự', color: 'var(--chart-1)' },
    hires: { label: 'Tuyển mới', color: 'var(--chart-2)' }
  };

  const payrollConfig: ChartConfig = {
    gross: { label: 'Tổng thu nhập', color: 'var(--chart-1)' },
    net: { label: 'Thực nhận', color: 'var(--chart-2)' }
  };

  return (
    <div className='grid grid-cols-1 gap-4 lg:grid-cols-6'>
      {/* Cơ cấu theo phòng ban - donut có tổng ở giữa */}
      <Card className='flex flex-col lg:col-span-2'>
        <CardHeader className='items-center pb-0'>
          <CardTitle>Cơ cấu theo phòng ban</CardTitle>
          <CardDescription>Phân bổ nhân sự</CardDescription>
        </CardHeader>
        <CardContent className='flex flex-1 items-center justify-center pb-2'>
          {deptData.length ? (
            <ChartContainer
              config={deptConfig}
              className='mx-auto aspect-square max-h-[240px] w-full'
            >
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey='name' hideLabel />} />
                <Pie
                  data={deptData}
                  dataKey='value'
                  nameKey='name'
                  innerRadius={58}
                  outerRadius={90}
                  paddingAngle={2}
                  stroke='var(--background)'
                  strokeWidth={2}
                >
                  <Label content={<CenterLabel value={deptTotal} />} />
                </Pie>
              </PieChart>
            </ChartContainer>
          ) : (
            <EmptyChart />
          )}
        </CardContent>
      </Card>

      {/* Trạng thái - bar ngang, gọn và dễ đọc */}
      <Card className='flex flex-col lg:col-span-2'>
        <CardHeader>
          <CardTitle>Theo trạng thái</CardTitle>
          <CardDescription>Đang làm, thử việc, nghỉ...</CardDescription>
        </CardHeader>
        <CardContent className='flex-1 pb-4'>
          {statusData.length ? (
            <ChartContainer config={statusConfig} className='h-[240px] w-full'>
              <BarChart
                accessibilityLayer
                data={statusData}
                layout='vertical'
                margin={{ left: 4, right: 32 }}
              >
                <CartesianGrid horizontal={false} strokeDasharray='3 3' />
                <XAxis type='number' dataKey='value' hide />
                <YAxis
                  dataKey='label'
                  type='category'
                  tickLine={false}
                  axisLine={false}
                  width={96}
                  fontSize={12}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent nameKey='label' hideLabel />}
                />
                <Bar dataKey='value' radius={6}>
                  {statusData.map((entry) => (
                    <Cell key={entry.status} fill={entry.fill} />
                  ))}
                  <LabelList
                    dataKey='value'
                    position='right'
                    offset={8}
                    className='fill-foreground'
                    fontSize={12}
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
          ) : (
            <EmptyChart />
          )}
        </CardContent>
      </Card>

      {/* Giới tính - donut nhỏ + legend */}
      <Card className='flex flex-col lg:col-span-2'>
        <CardHeader className='items-center pb-0'>
          <CardTitle>Cơ cấu giới tính</CardTitle>
          <CardDescription>Tỷ lệ Nam / Nữ</CardDescription>
        </CardHeader>
        <CardContent className='flex flex-1 items-center justify-center pb-2'>
          {genderData.length ? (
            <ChartContainer
              config={genderConfig}
              className='mx-auto aspect-square max-h-[240px] w-full'
            >
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey='label' hideLabel />} />
                <Pie
                  data={genderData}
                  dataKey='value'
                  nameKey='label'
                  innerRadius={58}
                  outerRadius={90}
                  paddingAngle={2}
                  stroke='var(--background)'
                  strokeWidth={2}
                >
                  <Label content={<CenterLabel value={genderTotal} />} />
                </Pie>
                <ChartLegend
                  content={<ChartLegendContent nameKey='label' />}
                  className='-translate-y-2 flex-wrap gap-2'
                />
              </PieChart>
            </ChartContainer>
          ) : (
            <EmptyChart />
          )}
        </CardContent>
      </Card>

      {/* Loại hợp đồng - bar ngang */}
      <Card className='flex flex-col lg:col-span-3'>
        <CardHeader>
          <CardTitle>Cơ cấu loại hợp đồng</CardTitle>
          <CardDescription>Hợp đồng còn hiệu lực theo loại</CardDescription>
        </CardHeader>
        <CardContent className='flex-1 pb-4'>
          {contractData.length ? (
            <ChartContainer config={contractConfig} className='h-[260px] w-full'>
              <BarChart
                accessibilityLayer
                data={contractData}
                layout='vertical'
                margin={{ left: 4, right: 32 }}
              >
                <CartesianGrid horizontal={false} strokeDasharray='3 3' />
                <XAxis type='number' dataKey='value' hide />
                <YAxis
                  dataKey='label'
                  type='category'
                  tickLine={false}
                  axisLine={false}
                  width={150}
                  fontSize={12}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent nameKey='label' hideLabel />}
                />
                <Bar dataKey='value' radius={6}>
                  {contractData.map((entry) => (
                    <Cell key={entry.type} fill={entry.fill} />
                  ))}
                  <LabelList
                    dataKey='value'
                    position='right'
                    offset={8}
                    className='fill-foreground'
                    fontSize={12}
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
          ) : (
            <EmptyChart />
          )}
        </CardContent>
      </Card>

      {/* Tăng trưởng nhân sự theo năm */}
      <Card className='flex flex-col lg:col-span-3'>
        <CardHeader>
          <CardTitle>Tăng trưởng nhân sự</CardTitle>
          <CardDescription>Tuyển mới & tổng nhân sự cộng dồn theo năm</CardDescription>
        </CardHeader>
        <CardContent className='flex-1 pb-4'>
          {data.headcountByYear.length ? (
            <ChartContainer config={headcountConfig} className='h-[260px] w-full'>
              <LineChart
                accessibilityLayer
                data={data.headcountByYear}
                margin={{ left: 4, right: 12 }}
              >
                <CartesianGrid vertical={false} strokeDasharray='3 3' />
                <XAxis
                  dataKey='year'
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={11}
                />
                <YAxis tickLine={false} axisLine={false} width={32} fontSize={11} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line
                  dataKey='total'
                  type='monotone'
                  stroke='var(--color-total)'
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: 'var(--color-total)' }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  dataKey='hires'
                  type='monotone'
                  stroke='var(--color-hires)'
                  strokeWidth={2}
                  strokeDasharray='4 4'
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          ) : (
            <EmptyChart />
          )}
        </CardContent>
      </Card>

      {/* Quỹ lương theo kỳ - area gradient */}
      <Card className='flex flex-col lg:col-span-6'>
        <CardHeader>
          <CardTitle>Quỹ lương theo kỳ</CardTitle>
          <CardDescription>Tổng thu nhập và thực nhận qua các kỳ lương</CardDescription>
        </CardHeader>
        <CardContent className='pb-4'>
          {data.payrollByPeriod.length ? (
            <ChartContainer config={payrollConfig} className='h-[300px] w-full'>
              <AreaChart
                accessibilityLayer
                data={data.payrollByPeriod}
                margin={{ left: 12, right: 12 }}
              >
                <defs>
                  <linearGradient id='fillGross' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='5%' stopColor='var(--color-gross)' stopOpacity={0.8} />
                    <stop offset='95%' stopColor='var(--color-gross)' stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id='fillNet' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='5%' stopColor='var(--color-net)' stopOpacity={0.8} />
                    <stop offset='95%' stopColor='var(--color-net)' stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray='3 3' />
                <XAxis
                  dataKey='period'
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={11}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  fontSize={11}
                  tickFormatter={(v) => vnd(Number(v))}
                />
                <ChartTooltip content={<ChartTooltipContent formatter={(v) => vnd(Number(v))} />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Area
                  dataKey='gross'
                  type='monotone'
                  fill='url(#fillGross)'
                  stroke='var(--color-gross)'
                  strokeWidth={2}
                />
                <Area
                  dataKey='net'
                  type='monotone'
                  fill='url(#fillNet)'
                  stroke='var(--color-net)'
                  strokeWidth={2}
                />
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

function CenterLabel({
  value,
  viewBox
}: {
  value: number;
  viewBox?: { cx?: number; cy?: number };
}) {
  if (!viewBox || typeof viewBox.cx !== 'number') return null;
  const { cx, cy = 0 } = viewBox;
  return (
    <text x={cx} y={cy} textAnchor='middle' dominantBaseline='middle'>
      <tspan x={cx} y={cy} className='fill-foreground text-2xl font-bold'>
        {value.toLocaleString('vi-VN')}
      </tspan>
      <tspan x={cx} y={cy + 20} className='fill-muted-foreground text-xs'>
        nhân sự
      </tspan>
    </text>
  );
}

function EmptyChart() {
  return (
    <div className='text-muted-foreground flex h-[220px] w-full items-center justify-center text-sm'>
      Chưa có dữ liệu để hiển thị.
    </div>
  );
}
