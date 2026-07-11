'use client';

import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';

import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';

const config: ChartConfig = {
  gross: { label: 'Tổng thu nhập', color: 'var(--chart-1)' },
  insurance: { label: 'BHXH', color: 'var(--chart-2)' },
  tax: { label: 'Thuế TNCN', color: 'var(--chart-3)' },
  net: { label: 'Thực nhận', color: 'var(--chart-4)' }
};

const vnd = (n: number) => n.toLocaleString('vi-VN') + ' ₫';

export function PayrollChart({
  data
}: {
  data: { period: string; gross: number; insurance: number; tax: number; net: number }[];
}) {
  return (
    <ChartContainer config={config} className='max-h-[320px] w-full'>
      <BarChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey='period' tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
        <ChartTooltip content={<ChartTooltipContent formatter={(v) => vnd(Number(v))} />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey='gross' fill='var(--color-gross)' radius={6} />
        <Bar dataKey='insurance' fill='var(--color-insurance)' radius={6} />
        <Bar dataKey='tax' fill='var(--color-tax)' radius={6} />
        <Bar dataKey='net' fill='var(--color-net)' radius={6} />
      </BarChart>
    </ChartContainer>
  );
}
