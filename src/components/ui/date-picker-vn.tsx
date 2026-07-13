'use client';

import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import { format, parse, isValid, setMonth, setYear } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from '@radix-ui/react-icons';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

const MONTHS_VN = [
  'Tháng 1',
  'Tháng 2',
  'Tháng 3',
  'Tháng 4',
  'Tháng 5',
  'Tháng 6',
  'Tháng 7',
  'Tháng 8',
  'Tháng 9',
  'Tháng 10',
  'Tháng 11',
  'Tháng 12'
];

function CaptionVN({
  displayMonth,
  onMonthChange,
  startYear,
  endYear
}: {
  displayMonth: Date;
  onMonthChange: (m: Date) => void;
  startYear: number;
  endYear: number;
}) {
  const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);

  return (
    <div className='flex items-center justify-between px-1 py-1'>
      <button
        type='button'
        className='rounded p-1 hover:bg-accent'
        onClick={() => {
          const prev = new Date(displayMonth);
          prev.setMonth(prev.getMonth() - 1);
          onMonthChange(prev);
        }}
      >
        <ChevronLeftIcon className='h-4 w-4' />
      </button>

      <div className='flex gap-1'>
        <Select
          value={String(displayMonth.getMonth())}
          onValueChange={(v) => onMonthChange(setMonth(displayMonth, Number(v)))}
        >
          <SelectTrigger className='h-7 w-[110px] text-xs'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent position='popper' side='bottom' className='z-[9999]'>
            {MONTHS_VN.map((name, i) => (
              <SelectItem key={i} value={String(i)} className='text-xs'>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={String(displayMonth.getFullYear())}
          onValueChange={(v) => onMonthChange(setYear(displayMonth, Number(v)))}
        >
          <SelectTrigger className='h-7 w-[72px] text-xs'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent position='popper' side='bottom' className='z-[9999] max-h-60'>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)} className='text-xs'>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <button
        type='button'
        className='rounded p-1 hover:bg-accent'
        onClick={() => {
          const next = new Date(displayMonth);
          next.setMonth(next.getMonth() + 1);
          onMonthChange(next);
        }}
      >
        <ChevronRightIcon className='h-4 w-4' />
      </button>
    </div>
  );
}

/**
 * DatePickerVN — Calendar popup với caption tháng/năm dùng <select> native.
 * value / onChange dùng chuỗi YYYY-MM-DD.
 */
export function DatePickerVN({
  value,
  onChange,
  placeholder = 'Chọn ngày',
  disabled = false,
  className,
  startYear = 1960,
  endYear = 2050
}: {
  value?: string;
  onChange?: (date: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  startYear?: number;
  endYear?: number;
}) {
  const [open, setOpen] = React.useState(false);

  const selected = React.useMemo(() => {
    if (!value) return undefined;
    const d = parse(value, 'yyyy-MM-dd', new Date());
    return isValid(d) ? d : undefined;
  }, [value]);

  const [month, setMonthState] = React.useState<Date>(selected ?? new Date());

  React.useEffect(() => {
    if (selected) setMonthState(selected);
  }, [selected]);

  function handleSelect(date: Date | undefined) {
    if (date) {
      onChange?.(format(date, 'yyyy-MM-dd'));
      setOpen(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='outline'
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !selected && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className='mr-2 h-4 w-4 shrink-0' />
          {selected ? format(selected, 'dd/MM/yyyy') : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-auto p-0' align='start'>
        <DayPicker
          mode='single'
          selected={selected}
          onSelect={handleSelect}
          month={month}
          onMonthChange={setMonthState}
          locale={vi}
          showOutsideDays
          className='p-3'
          classNames={{
            months: 'flex flex-col',
            month: 'flex flex-col gap-4',
            month_caption: 'hidden',
            nav: 'hidden',
            month_grid: 'w-full border-collapse',
            weekdays: 'flex',
            weekday: 'text-muted-foreground w-8 text-center text-[0.8rem] font-normal',
            week: 'flex w-full mt-2',
            day: 'relative p-0 text-center text-sm',
            day_button: cn(
              'inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-normal',
              'hover:bg-accent hover:text-accent-foreground',
              'aria-selected:bg-primary aria-selected:text-primary-foreground aria-selected:hover:bg-primary'
            ),
            selected: 'rounded-md bg-primary text-primary-foreground',
            today: 'rounded-md bg-accent text-accent-foreground',
            outside: 'text-muted-foreground opacity-50',
            disabled: 'text-muted-foreground opacity-50'
          }}
          components={{
            MonthCaption: ({ calendarMonth }) => (
              <CaptionVN
                displayMonth={calendarMonth.date}
                onMonthChange={setMonthState}
                startYear={startYear}
                endYear={endYear}
              />
            )
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
