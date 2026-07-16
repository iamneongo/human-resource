'use client';

import type { CSSProperties } from 'react';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis
} from 'recharts';

import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    ? `${(n / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} trđ`
    : `${n.toLocaleString('vi-VN')} đ`;

function safeChartNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

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
  const statusTotal = statusData.reduce((sum, item) => sum + item.value, 0);
  const statusRadialData = statusData.map((item) => ({
    ...item,
    score: statusTotal > 0 ? Number(((item.value / statusTotal) * 100).toFixed(1)) : 0,
    fill: `url(#statusGradient-${item.status})`
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
          <CardTitle>Cơ cấu theo phòng ban</CardTitle>
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
        <CardHeader className='items-center pb-0 text-center'>
          <CardTitle>Trạng thái nhân sự</CardTitle>
        </CardHeader>
        <CardContent className='pb-2'>
          {statusData.length ? (
            <ChartContainer
              config={statusConfig}
              className='mx-auto aspect-square max-h-[300px] w-full'
            >
              <RadialBarChart
                data={statusRadialData}
                innerRadius={34}
                outerRadius={112}
                barSize={22}
              >
                <defs>
                  {statusData.map((item) => (
                    <linearGradient
                      key={item.status}
                      id={`statusGradient-${item.status}`}
                      x1='0'
                      y1='0'
                      x2='1'
                      y2='0'
                    >
                      <stop
                        offset='0%'
                        stopColor={`var(--color-${item.status})`}
                        stopOpacity={0.5}
                      />
                      <stop
                        offset='100%'
                        stopColor={`var(--color-${item.status})`}
                        stopOpacity={1}
                      />
                    </linearGradient>
                  ))}
                  <filter id='statusGlow' x='-15%' y='-15%' width='130%' height='130%'>
                    <feGaussianBlur stdDeviation='3' result='blur' />
                    <feComposite in='SourceGraphic' in2='blur' operator='over' />
                  </filter>
                </defs>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      className='min-w-44 gap-2.5'
                      nameKey='status'
                      formatter={(value, name, item) => {
                        const rawValue = safeChartNumber(
                          (item?.payload as { value?: number } | undefined)?.value
                        );
                        const score = safeChartNumber(value);

                        return (
                          <div className='flex w-full items-center justify-between gap-2'>
                            <div className='flex items-center gap-1.5'>
                              <div
                                className='h-2.5 w-2.5 shrink-0 rounded-xs bg-(--color-bg)'
                                style={
                                  {
                                    '--color-bg': `var(--color-${name})`
                                  } as CSSProperties
                                }
                              />
                              <span className='text-muted-foreground'>
                                {statusConfig[name as keyof typeof statusConfig]?.label || name}
                              </span>
                            </div>
                            <div className='text-right'>
                              <div className='text-foreground font-semibold tabular-nums'>
                                {rawValue.toLocaleString('vi-VN')}
                              </div>
                              <div className='text-muted-foreground text-[11px]'>
                                {score.toFixed(1)}%
                              </div>
                            </div>
                          </div>
                        );
                      }}
                    />
                  }
                />
                <PolarAngleAxis type='number' domain={[0, 100]} angleAxisId={0} tick={false} />
                <RadialBar
                  dataKey='score'
                  background
                  cornerRadius={10}
                  filter='url(#statusGlow)'
                  label={{
                    position: 'insideStart',
                    fill: '#fff',
                    fontSize: 11,
                    fontWeight: 600,
                    formatter: (_value: unknown, entry?: { value?: number }) =>
                      safeChartNumber(entry?.value).toLocaleString('vi-VN')
                  }}
                />
              </RadialBarChart>
            </ChartContainer>
          ) : (
            <EmptyChart />
          )}
        </CardContent>
      </Card>

      <Card className='overflow-hidden border-border/70 bg-gradient-to-br from-sky-500/5 via-background to-background lg:col-span-2'>
        <CardHeader className='flex flex-row items-start justify-between gap-3'>
          <CardTitle>Cơ cấu giới tính</CardTitle>
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
          <CardTitle>Loại hợp đồng</CardTitle>
          {chartBadge('Cơ cấu hợp đồng')}
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
                <Bar dataKey='value' fill='url(#contractBarGradient)' radius={8} />
              </BarChart>
            </ChartContainer>
          ) : (
            <EmptyChart />
          )}
        </CardContent>
      </Card>

      <Card className='overflow-hidden border-border/70 bg-gradient-to-br from-slate-500/5 via-background to-background lg:col-span-3'>
        <CardHeader className='flex flex-row items-start justify-between gap-3'>
          <CardTitle>Tăng trưởng nhân sự</CardTitle>
          {chartBadge('Theo năm')}
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
          <CardTitle>Quỹ lương theo kỳ</CardTitle>
          {chartBadge('Xu hướng lương')}
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
