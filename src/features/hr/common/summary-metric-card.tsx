import type * as React from 'react';

import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const TONE_CLASSNAMES = {
  primary: 'from-primary/5',
  sky: 'from-sky-500/5',
  cyan: 'from-cyan-500/5',
  emerald: 'from-emerald-500/5',
  amber: 'from-amber-500/5',
  rose: 'from-rose-500/5',
  slate: 'from-slate-500/5'
} as const;

type SummaryMetricCardTone = keyof typeof TONE_CLASSNAMES;

interface SummaryMetricCardProps {
  label: string;
  value: React.ReactNode;
  helper?: React.ReactNode;
  tone?: SummaryMetricCardTone;
  className?: string;
  valueClassName?: string;
}

export function SummaryMetricCard({
  label,
  value,
  helper,
  tone = 'primary',
  className,
  valueClassName
}: SummaryMetricCardProps) {
  return (
    <Card
      className={cn(
        '@container/card overflow-hidden border-border/70 bg-gradient-to-t to-card shadow-xs',
        TONE_CLASSNAMES[tone],
        className
      )}
    >
      <CardHeader className='gap-2'>
        <CardDescription>{label}</CardDescription>
        <CardTitle
          className={cn(
            'text-2xl font-semibold tabular-nums @[250px]/card:text-3xl',
            valueClassName
          )}
        >
          {value}
        </CardTitle>
      </CardHeader>
      {helper ? (
        <CardFooter className='text-muted-foreground items-start text-sm'>{helper}</CardFooter>
      ) : null}
    </Card>
  );
}
