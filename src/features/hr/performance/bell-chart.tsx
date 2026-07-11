'use client';

import { Bar, BarChart, CartesianGrid, LabelList, XAxis } from 'recharts';

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';

const config: ChartConfig = { count: { label: 'Số lượng', color: 'var(--chart-1)' } };

export function BellChart({
  data
}: {
  data: { id: string; label: string; count: number }[];
}) {
  const chartData = data.map((d) => ({ rank: d.id, label: d.label, count: d.count }));
  return (
    <ChartContainer config={config} className='max-h-[300px] w-full'>
      <BarChart data={chartData}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey='rank' tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip content={<ChartTooltipContent nameKey='count' />} />
        <Bar dataKey='count' fill='var(--color-count)' radius={8}>
          <LabelList dataKey='count' position='top' fontSize={12} />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
