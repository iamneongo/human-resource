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

import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
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

const COOL_SCALE = ['#1d4ed8', '#2563eb', '#0891b2', '#0f766e', '#475569'];

const COOL_MONO = ['#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#2563eb'];

const vndShort = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr₫`
    : `${n.toLocaleString('vi-VN')} ₫`;

function chartBadge(label: string) {
  return (
    <Badge variant='outline' className='gap-1.5 border-border/60 bg-background/70 font-normal'>
      <Icons.sparkles className='size-3.5 text-primary' />
      {label}
    </Badge>
  );
}

function EmptyChart() {
  return (
    <div className='text-muted-foreground flex h-[220px] w-full items-center justify-center text-sm'>
      Chưa có dữ liệu để hiển thị.
    </div>
  );
}

function CenterLabel({
  value,
  helper,
  viewBox
}: {
  value: number;
  helper: string;
  viewBox?: { cx?: number; cy?: number };
}) {
  if (!viewBox || typeof viewBox.cx !== 'number') return null;
  const { cx, cy = 0 } = viewBox;
  return (
    <text x={cx} y={cy} textAnchor='middle' dominantBaseline='middle'>
      <tspan x={cx} y={cy - 2} className='fill-foreground text-2xl font-semibold'>
        {value.toLocaleString('vi-VN')}
      </tspan>
      <tspan x={cx} y={cy + 18} className='fill-muted-foreground text-[11px]'>
        {helper}
      </tspan>
    </text>
  );
}

export function HrCharts({ data }: { data: HrDashboardData }) {
  const deptData = data.byDept.map((item, index) => ({
    ...item,
    fill: COOL_MONO[index % COOL_MONO.length]
  }));
  const deptTotal = deptData.reduce((sum, item) => sum + item.value, 0);
  const deptConfig: ChartConfig = { value: { label: 'Nhân sự' } };

  const statusData = data.byStatus.map((item, index) => ({
    ...item,
    fill: COOL_SCALE[index % COOL_SCALE.length]
  }));
  const statusConfig: ChartConfig = Object.fromEntries(
    statusData.map((item) => [
      item.status,
      {
        label: item.label,
        color: item.fill
      }
    ])
  );

  const genderData = data.byGender.map((item, index) => ({
    ...item,
    fill: COOL_MONO[(index + 1) % COOL_MONO.length]
  }));
  const genderTotal = genderData.reduce((sum, item) => sum + item.value, 0);
  const genderConfig: ChartConfig = Object.fromEntries(
    genderData.map((item) => [
      item.gender,
      {
        label: item.label,
        color: item.fill
      }
    ])
  );

  const contractData = data.byContractType.map((item, index) => ({
    ...item,
    fill: COOL_SCALE[index % COOL_SCALE.length]
  }));
  const contractConfig: ChartConfig = { value: { label: 'Hợp đồng' } };

  const headcountConfig: ChartConfig = {
    total: { label: 'Tổng nhân sự', color: '#1d4ed8' },
    hires: { label: 'Tuyển mới', color: '#0891b2' }
  };

  const payrollConfig: ChartConfig = {
    gross: { label: 'Tổng thu nhập', color: '#2563eb' },
    net: { label: 'Thực nhận', color: '#0f766e' }
  };

  return (
    <div className='grid grid-cols-1 gap-4 lg:grid-cols-6'>
      <Card className='overflow-hidden border-border/70 bg-gradient-to-br from-primary/5 via-background to-background lg:col-span-2'>
        <CardHeader className='flex flex-row items-start justify-between gap-3'>
          <div className='space-y-1'>
            <CardTitle>Cơ cấu theo phòng ban</CardTitle>
            <CardDescription>Donut đơn sắc theo tone thương hiệu</CardDescription>
          </div>
          {chartBadge(`${deptData.length} nhóm`)}
        </CardHeader>
        <CardContent className='pb-3'>
          {deptData.length ? (
            <ChartContainer
              config={deptConfig}
              className='mx-auto aspect-square max-h-[250px] w-full'
            >
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey='name' hideLabel />} />
                <Pie
                  data={deptData}
                  dataKey='value'
                  nameKey='name'
                  innerRadius={62}
                  outerRadius={92}
                  paddingAngle={3}
                  cornerRadius={8}
                  stroke='var(--background)'
                  strokeWidth={2}
                >
                  {deptData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                  <Label content={<CenterLabel value={deptTotal} helper='nhân sự' />} />
                </Pie>
              </PieChart>
            </ChartContainer>
          ) : (
            <EmptyChart />
          )}
        </CardContent>
      </Card>

      <Card className='overflow-hidden border-border/70 bg-gradient-to-br from-cyan-500/5 via-background to-background lg:col-span-2'>
        <CardHeader className='flex flex-row items-start justify-between gap-3'>
          <div className='space-y-1'>
            <CardTitle>Trạng thái nhân sự</CardTitle>
            <CardDescription>Thanh ngang tối giản, đọc nhanh theo nhóm</CardDescription>
          </div>
          {chartBadge('Live headcount')}
        </CardHeader>
        <CardContent className='pb-4'>
          {statusData.length ? (
            <ChartContainer config={statusConfig} className='h-[250px] w-full'>
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
                  width={104}
                  fontSize={12}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent nameKey='label' hideLabel />}
                />
                <Bar dataKey='value' radius={8}>
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

      <Card className='overflow-hidden border-border/70 bg-gradient-to-br from-sky-500/5 via-background to-background lg:col-span-2'>
        <CardHeader className='flex flex-row items-start justify-between gap-3'>
          <div className='space-y-1'>
            <CardTitle>Cơ cấu giới tính</CardTitle>
            <CardDescription>Phân bổ tổng quan theo nhóm nhân sự</CardDescription>
          </div>
          {chartBadge(`${genderTotal} hồ sơ`)}
        </CardHeader>
        <CardContent className='pb-3'>
          {genderData.length ? (
            <ChartContainer
              config={genderConfig}
              className='mx-auto aspect-square max-h-[250px] w-full'
            >
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey='label' hideLabel />} />
                <Pie
                  data={genderData}
                  dataKey='value'
                  nameKey='label'
                  innerRadius={62}
                  outerRadius={92}
                  paddingAngle={3}
                  cornerRadius={8}
                  stroke='var(--background)'
                  strokeWidth={2}
                >
                  {genderData.map((entry) => (
                    <Cell key={entry.gender} fill={entry.fill} />
                  ))}
                  <Label content={<CenterLabel value={genderTotal} helper='nhân sự' />} />
                </Pie>
                <ChartLegend
                  content={<ChartLegendContent nameKey='label' />}
                  className='flex-wrap gap-3 pt-0'
                />
              </PieChart>
            </ChartContainer>
          ) : (
            <EmptyChart />
          )}
        </CardContent>
      </Card>

      <Card className='overflow-hidden border-border/70 bg-gradient-to-br from-primary/5 via-background to-background lg:col-span-3'>
        <CardHeader className='flex flex-row items-start justify-between gap-3'>
          <div className='space-y-1'>
            <CardTitle>Loại hợp đồng</CardTitle>
            <CardDescription>Biểu đồ thanh ngang theo hợp đồng hiệu lực</CardDescription>
          </div>
          {chartBadge('Contract mix')}
        </CardHeader>
        <CardContent className='pb-4'>
          {contractData.length ? (
            <ChartContainer config={contractConfig} className='h-[270px] w-full'>
              <BarChart
                accessibilityLayer
                data={contractData}
                layout='vertical'
                margin={{ left: 4, right: 32 }}
              >
                <defs>
                  <linearGradient id='contractBarGradient' x1='0' y1='0' x2='1' y2='0'>
                    <stop offset='0%' stopColor='#bfdbfe' />
                    <stop offset='100%' stopColor='#2563eb' />
                  </linearGradient>
                </defs>
                <CartesianGrid horizontal={false} strokeDasharray='3 3' />
                <XAxis type='number' dataKey='value' hide />
                <YAxis
                  dataKey='label'
                  type='category'
                  tickLine={false}
                  axisLine={false}
                  width={160}
                  fontSize={12}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent nameKey='label' hideLabel />}
                />
                <Bar dataKey='value' fill='url(#contractBarGradient)' radius={8}>
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

      <Card className='overflow-hidden border-border/70 bg-gradient-to-br from-slate-500/5 via-background to-background lg:col-span-3'>
        <CardHeader className='flex flex-row items-start justify-between gap-3'>
          <div className='space-y-1'>
            <CardTitle>Tăng trưởng nhân sự</CardTitle>
            <CardDescription>Đường chính cho headcount, đường phụ cho tuyển mới</CardDescription>
          </div>
          {chartBadge('Year over year')}
        </CardHeader>
        <CardContent className='pb-4'>
          {data.headcountByYear.length ? (
            <ChartContainer config={headcountConfig} className='h-[270px] w-full'>
              <LineChart
                accessibilityLayer
                data={data.headcountByYear}
                margin={{ left: 4, right: 12 }}
              >
                <defs>
                  <linearGradient id='headcountGlow' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='0%' stopColor='#1d4ed8' stopOpacity={0.18} />
                    <stop offset='100%' stopColor='#1d4ed8' stopOpacity={0} />
                  </linearGradient>
                </defs>
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
                <Area
                  type='monotone'
                  dataKey='total'
                  fill='url(#headcountGlow)'
                  stroke='none'
                  isAnimationActive={false}
                />
                <Line
                  dataKey='total'
                  type='monotone'
                  stroke='var(--color-total)'
                  strokeWidth={3}
                  dot={{ r: 0 }}
                  activeDot={{ r: 5, fill: 'var(--color-total)' }}
                />
                <Line
                  dataKey='hires'
                  type='monotone'
                  stroke='var(--color-hires)'
                  strokeWidth={2}
                  strokeDasharray='5 5'
                  dot={{ r: 3, fill: 'var(--color-hires)' }}
                />
              </LineChart>
            </ChartContainer>
          ) : (
            <EmptyChart />
          )}
        </CardContent>
      </Card>

      <Card className='overflow-hidden border-border/70 bg-gradient-to-br from-primary/5 via-background to-background lg:col-span-6'>
        <CardHeader className='flex flex-row items-start justify-between gap-3'>
          <div className='space-y-1'>
            <CardTitle>Quỹ lương theo kỳ</CardTitle>
            <CardDescription>Hai lớp area mềm theo đúng tone xanh của hệ thống</CardDescription>
          </div>
          {chartBadge('Payroll trend')}
        </CardHeader>
        <CardContent className='pb-4'>
          {data.payrollByPeriod.length ? (
            <ChartContainer config={payrollConfig} className='h-[320px] w-full'>
              <AreaChart
                accessibilityLayer
                data={data.payrollByPeriod}
                margin={{ left: 12, right: 12 }}
              >
                <defs>
                  <linearGradient id='grossFill' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='0%' stopColor='#2563eb' stopOpacity={0.34} />
                    <stop offset='100%' stopColor='#2563eb' stopOpacity={0.04} />
                  </linearGradient>
                  <linearGradient id='netFill' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='0%' stopColor='#0f766e' stopOpacity={0.26} />
                    <stop offset='100%' stopColor='#0f766e' stopOpacity={0.03} />
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
                  tickFormatter={(value) => vndShort(Number(value))}
                />
                <ChartTooltip
                  content={<ChartTooltipContent formatter={(value) => vndShort(Number(value))} />}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Area
                  dataKey='gross'
                  type='monotone'
                  fill='url(#grossFill)'
                  stroke='var(--color-gross)'
                  strokeWidth={2.5}
                />
                <Area
                  dataKey='net'
                  type='monotone'
                  fill='url(#netFill)'
                  stroke='var(--color-net)'
                  strokeWidth={2.5}
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
