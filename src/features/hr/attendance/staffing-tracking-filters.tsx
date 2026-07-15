'use client';

import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Combobox, type ComboOption } from '@/features/hr/common/combobox';

export function StaffingTrackingFilters({
  dateFrom,
  dateTo,
  departmentId,
  shiftId,
  departments,
  shifts
}: {
  dateFrom: string;
  dateTo: string;
  departmentId: string;
  shiftId: string;
  departments: ComboOption[];
  shifts: ComboOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [localDateFrom, setLocalDateFrom] = React.useState(dateFrom);
  const [localDateTo, setLocalDateTo] = React.useState(dateTo);
  const [localDepartmentId, setLocalDepartmentId] = React.useState(departmentId);
  const [localShiftId, setLocalShiftId] = React.useState(shiftId);

  React.useEffect(() => {
    setLocalDateFrom(dateFrom);
    setLocalDateTo(dateTo);
    setLocalDepartmentId(departmentId);
    setLocalShiftId(shiftId);
  }, [dateFrom, dateTo, departmentId, shiftId]);

  function applyFilters() {
    const params = new URLSearchParams();

    if (localDateFrom) params.set('dateFrom', localDateFrom);
    if (localDateTo) params.set('dateTo', localDateTo);
    if (localDepartmentId) params.set('departmentId', localDepartmentId);
    if (localShiftId) params.set('shiftId', localShiftId);

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function resetFilters() {
    router.push(pathname);
  }

  return (
    <div className='grid gap-3 rounded-2xl border bg-card p-4 md:grid-cols-[1fr_1fr_1fr_1fr_auto] md:items-end'>
      <div className='space-y-1.5'>
        <Label htmlFor='dateFrom'>Từ ngày</Label>
        <Input
          id='dateFrom'
          type='date'
          value={localDateFrom}
          onChange={(event) => setLocalDateFrom(event.target.value)}
        />
      </div>

      <div className='space-y-1.5'>
        <Label htmlFor='dateTo'>Đến ngày</Label>
        <Input
          id='dateTo'
          type='date'
          value={localDateTo}
          onChange={(event) => setLocalDateTo(event.target.value)}
        />
      </div>

      <div className='space-y-1.5'>
        <Label>Bộ phận</Label>
        <Combobox
          options={departments}
          value={localDepartmentId}
          onChange={setLocalDepartmentId}
          placeholder='Tất cả bộ phận'
          searchPlaceholder='Tìm bộ phận...'
          emptyText='Không tìm thấy bộ phận.'
        />
      </div>

      <div className='space-y-1.5'>
        <Label>Ca làm việc</Label>
        <Combobox
          options={shifts}
          value={localShiftId}
          onChange={setLocalShiftId}
          placeholder='Tất cả ca'
          searchPlaceholder='Tìm ca làm việc...'
          emptyText='Không tìm thấy ca.'
        />
      </div>

      <div className='flex gap-2'>
        <Button type='button' onClick={applyFilters}>
          Lọc dữ liệu
        </Button>
        <Button type='button' variant='outline' onClick={resetFilters}>
          Mặc định
        </Button>
      </div>
    </div>
  );
}
