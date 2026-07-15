'use client';

import type { ColumnDef, PaginationState, Updater } from '@tanstack/react-table';
import { getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Icons } from '@/components/icons';
import { DataTable } from '@/components/ui/table/data-table';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

import {
  clearAttendanceBoardRow,
  saveAttendanceBoardRow,
  toggleAttendanceWeekLock,
  type AttendanceBoardCell,
  type AttendanceBoardData
} from './board';

type AttendanceBoardProps = AttendanceBoardData & {
  canEdit: boolean;
};

type DraftRow = AttendanceBoardData['employees'][number];

const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function formatDateLabel(date: string, index: number) {
  const [, month, day] = date.split('-');
  return `${WEEKDAY_LABELS[index]} ${day}/${month}`;
}

function getWeekTitle(weekStart: string, weekEnd: string) {
  const [, startMonth, startDay] = weekStart.split('-');
  const [, endMonth, endDay] = weekEnd.split('-');
  return `${startDay}/${startMonth} - ${endDay}/${endMonth}`;
}

function shiftWeek(weekStart: string, deltaDays: number) {
  const date = new Date(`${weekStart}T00:00:00`);
  date.setDate(date.getDate() + deltaDays);
  return date.toISOString().slice(0, 10);
}

function copyCell(cell?: AttendanceBoardCell): AttendanceBoardCell {
  return {
    morning: Boolean(cell?.morning),
    afternoon: Boolean(cell?.afternoon),
    source: cell?.source ?? 'empty',
    conflicts: [...(cell?.conflicts ?? [])],
    note: cell?.note ?? null
  };
}

function copyRow(row: DraftRow): DraftRow {
  return {
    ...row,
    cells: Object.fromEntries(
      Object.entries(row.cells).map(([date, cell]) => [date, copyCell(cell)])
    )
  };
}

function countShiftParts(cells: Record<string, AttendanceBoardCell>) {
  return Object.values(cells).reduce(
    (sum, cell) => sum + Number(cell.morning) + Number(cell.afternoon),
    0
  );
}

export function AttendanceBoard({
  weekStart,
  weekEnd,
  weekDates,
  shifts,
  employees,
  page,
  perPage,
  totalEmployees,
  pageCount,
  searchQuery,
  lock,
  canEdit
}: AttendanceBoardProps) {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [anchorDate, setAnchorDate] = useState(weekStart);
  const [rows, setRows] = useState(() => employees.map(copyRow));
  const [pendingSaveId, setPendingSaveId] = useState<string | null>(null);
  const [pendingClearId, setPendingClearId] = useState<string | null>(null);
  const [pendingLock, setPendingLock] = useState(false);
  const [isRouting, startRouting] = useTransition();
  const [isSaving, startSaving] = useTransition();

  useEffect(() => {
    setRows(employees.map(copyRow));
  }, [employees]);

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  const shiftMap = useMemo(() => new Map(shifts.map((shift) => [shift.id, shift])), [shifts]);

  const totals = useMemo(() => {
    const employeesCount = rows.length;
    const shiftParts = rows.reduce((sum, row) => sum + countShiftParts(row.cells), 0);
    const conflictCount = rows.reduce((sum, row) => sum + row.conflictCount, 0);
    return {
      employeesCount,
      workdays: shiftParts / 2,
      conflictCount
    };
  }, [rows]);

  function replaceQuery(updates: Record<string, string | null>) {
    startRouting(() => {
      const params = new URLSearchParams(window.location.search);

      for (const [key, value] of Object.entries(updates)) {
        if (!value) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }

      router.replace(`/dashboard/attendance/timesheets?${params.toString()}`);
    });
  }

  useEffect(() => {
    const nextSearch = searchInput.trim();
    const currentSearch = searchQuery.trim();
    if (nextSearch === currentSearch) return;

    const timeout = window.setTimeout(() => {
      replaceQuery({
        search: nextSearch || null,
        page: '1'
      });
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [searchInput, searchQuery]);

  function navigateToWeek(nextWeekStart: string) {
    replaceQuery({
      weekStart: nextWeekStart,
      page: '1'
    });
  }

  function updateCell(
    employeeId: string,
    date: string,
    key: keyof AttendanceBoardCell,
    value: boolean
  ) {
    setRows((current) =>
      current.map((row) =>
        row.id === employeeId
          ? {
              ...row,
              cells: {
                ...row.cells,
                [date]: {
                  ...copyCell(row.cells[date]),
                  [key]: value
                }
              }
            }
          : row
      )
    );
  }

  function updateShift(employeeId: string, shiftId: string) {
    const selectedShift = shiftMap.get(shiftId);
    setRows((current) =>
      current.map((row) =>
        row.id === employeeId
          ? {
              ...row,
              shiftId,
              shiftCode: selectedShift?.code ?? null,
              shiftName: selectedShift?.name ?? null,
              standardHours: selectedShift?.standardHours ?? row.standardHours
            }
          : row
      )
    );
  }

  function handleSave(row: DraftRow) {
    startSaving(async () => {
      setPendingSaveId(row.id);
      const result = await saveAttendanceBoardRow({
        weekStart,
        employeeId: row.id,
        shiftId: row.shiftId,
        cells: row.cells
      });
      setPendingSaveId(null);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(`Đã lưu chấm công cho ${row.fullName}.`);
      router.refresh();
    });
  }

  function handleClear(row: DraftRow) {
    startSaving(async () => {
      setPendingClearId(row.id);
      const result = await clearAttendanceBoardRow(weekStart, row.id);
      setPendingClearId(null);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setRows((current) =>
        current.map((item) =>
          item.id === row.id
            ? {
                ...item,
                cells: Object.fromEntries(
                  weekDates.map((date) => [
                    date,
                    {
                      morning: false,
                      afternoon: false,
                      source: 'empty',
                      conflicts: item.cells[date]?.conflicts ?? [],
                      note: null
                    }
                  ])
                )
              }
            : item
        )
      );
      toast.success(`Đã xóa chấm công tuần của ${row.fullName}.`);
      router.refresh();
    });
  }

  function handleToggleLock(nextLocked: boolean) {
    startSaving(async () => {
      setPendingLock(true);
      const result = await toggleAttendanceWeekLock(weekStart, nextLocked);
      setPendingLock(false);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(nextLocked ? 'Đã khóa tuần công.' : 'Đã mở khóa tuần công.');
      router.refresh();
    });
  }

  const columns = useMemo<ColumnDef<DraftRow>[]>(
    () => [
      {
        id: 'employee',
        accessorFn: (row) => `${row.employeeCode} ${row.fullName}`,
        header: ({ column }) => <DataTableColumnHeader column={column} title='Nhân viên' />,
        cell: ({ row }) => {
          const record = row.original;
          return (
            <div className='min-w-[200px]'>
              <div className='font-medium'>{record.fullName}</div>
              <div className='text-muted-foreground text-xs'>{record.employeeCode}</div>
              {record.conflictCount > 0 ? (
                <div className='mt-1 text-xs text-amber-600'>
                  {record.conflictCount} cảnh báo dữ liệu
                </div>
              ) : null}
            </div>
          );
        },
        size: 240
      },
      {
        id: 'department',
        accessorFn: (row) => row.departmentName ?? '',
        header: ({ column }) => <DataTableColumnHeader column={column} title='Phòng ban' />,
        cell: ({ row }) => (
          <span className='text-muted-foreground'>{row.original.departmentName ?? '—'}</span>
        ),
        size: 180
      },
      {
        id: 'position',
        accessorFn: (row) => row.positionTitle ?? '',
        header: ({ column }) => <DataTableColumnHeader column={column} title='Chức vụ' />,
        cell: ({ row }) => (
          <span className='text-muted-foreground'>{row.original.positionTitle ?? '—'}</span>
        ),
        size: 180
      },
      {
        id: 'shift',
        accessorFn: (row) => row.shiftCode ?? row.shiftName ?? '',
        header: ({ column }) => <DataTableColumnHeader column={column} title='Ca' />,
        cell: ({ row }) => {
          const record = row.original;
          return (
            <Select
              value={record.shiftId ?? undefined}
              onValueChange={(value) => updateShift(record.id, value)}
              disabled={!canEdit || shifts.length === 0 || lock.isLocked}
            >
              <SelectTrigger
                className='h-9 w-[180px]'
                aria-label={`Chọn ca cho ${record.fullName}`}
              >
                <SelectValue placeholder='Chọn ca' />
              </SelectTrigger>
              <SelectContent>
                {shifts.map((shift) => (
                  <SelectItem key={shift.id} value={shift.id}>
                    {shift.code} · {shift.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        },
        size: 210,
        enableSorting: false
      },
      ...weekDates.map<ColumnDef<DraftRow>>((date, index) => ({
        id: date,
        accessorFn: (row) => countShiftParts({ [date]: row.cells[date] }),
        header: () => <div className='text-center'>{formatDateLabel(date, index)}</div>,
        cell: ({ row }) => {
          const record = row.original;
          const cell = copyCell(record.cells[date]);
          return (
            <div className='flex min-w-[72px] flex-col items-center gap-1'>
              <Button
                type='button'
                size='sm'
                variant={cell.morning ? 'default' : 'outline'}
                onClick={() => updateCell(record.id, date, 'morning', !cell.morning)}
                disabled={!canEdit || lock.isLocked}
                aria-label={`Bật tắt ca sáng ngày ${date} của ${record.fullName}`}
                className={cn('h-7 w-14 px-0 text-xs', cell.morning && 'shadow-none')}
              >
                S
              </Button>
              <Button
                type='button'
                size='sm'
                variant={cell.afternoon ? 'default' : 'outline'}
                onClick={() => updateCell(record.id, date, 'afternoon', !cell.afternoon)}
                disabled={!canEdit || lock.isLocked}
                aria-label={`Bật tắt ca chiều ngày ${date} của ${record.fullName}`}
                className={cn('h-7 w-14 px-0 text-xs', cell.afternoon && 'shadow-none')}
              >
                C
              </Button>
              {cell.source === 'manual' ? (
                <span className='text-[10px] text-blue-600'>Manual</span>
              ) : null}
              {cell.conflicts.length > 0 ? (
                <span
                  className='text-center text-[10px] leading-3 text-amber-600'
                  title={cell.conflicts.join('\n')}
                >
                  {cell.conflicts.length} cảnh báo
                </span>
              ) : null}
            </div>
          );
        },
        size: 96,
        enableSorting: false
      })),
      {
        id: 'total',
        accessorFn: (row) => countShiftParts(row.cells) / 2,
        header: ({ column }) => <DataTableColumnHeader column={column} title='Tổng' />,
        cell: ({ row }) => {
          const shiftParts = countShiftParts(row.original.cells);
          return (
            <div className='min-w-[96px] text-right'>
              <div className='font-semibold'>{(shiftParts / 2).toFixed(1)} công</div>
              <div className='text-muted-foreground text-xs'>{shiftParts} nửa ca</div>
            </div>
          );
        },
        size: 110
      },
      {
        id: 'standardHours',
        accessorFn: (row) => (row.standardHours * countShiftParts(row.cells)) / 2,
        header: ({ column }) => <DataTableColumnHeader column={column} title='Giờ chuẩn' />,
        cell: ({ row }) => {
          const record = row.original;
          const workedHours = ((record.standardHours * countShiftParts(record.cells)) / 2).toFixed(
            1
          );
          return (
            <div className='min-w-[120px] text-right'>
              <div className='font-semibold'>{workedHours}h</div>
              <div className='text-muted-foreground text-xs'>
                {record.shiftCode ?? '—'} · {record.standardHours}h/ngày
              </div>
            </div>
          );
        },
        size: 140
      },
      {
        id: 'actions',
        accessorFn: (row) => row.id,
        header: () => <div className='text-right'>Thao tác</div>,
        cell: ({ row }) => {
          const record = row.original;
          const isSavingRow = pendingSaveId === record.id && isSaving;
          const isClearingRow = pendingClearId === record.id && isSaving;

          return (
            <div className='flex min-w-[210px] justify-end gap-2'>
              <Button
                type='button'
                size='sm'
                variant='outline'
                onClick={() => handleClear(record)}
                isLoading={isClearingRow}
                disabled={!canEdit || isSavingRow || lock.isLocked}
                aria-label={`Xóa chấm công tuần của ${record.fullName}`}
              >
                <Icons.trash className='h-4 w-4' />
                Xóa tuần
              </Button>
              <Button
                type='button'
                size='sm'
                onClick={() => handleSave(record)}
                isLoading={isSavingRow}
                disabled={!canEdit || isClearingRow || lock.isLocked}
                aria-label={`Lưu chấm công tuần của ${record.fullName}`}
              >
                <Icons.check className='h-4 w-4' />
                Lưu
              </Button>
            </div>
          );
        },
        size: 220,
        enableSorting: false
      }
    ],
    [canEdit, isSaving, lock.isLocked, pendingClearId, pendingSaveId, shifts, weekDates]
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: {
      columnPinning: {
        left: ['employee', 'department', 'position', 'shift'],
        right: ['actions']
      },
      pagination: {
        pageIndex: page - 1,
        pageSize: perPage
      }
    },
    onPaginationChange: (updaterOrValue: Updater<PaginationState>) => {
      const nextPagination =
        typeof updaterOrValue === 'function'
          ? updaterOrValue({
              pageIndex: page - 1,
              pageSize: perPage
            })
          : updaterOrValue;

      replaceQuery({
        page: String(nextPagination.pageIndex + 1),
        perPage: String(nextPagination.pageSize)
      });
    },
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount,
    rowCount: totalEmployees
  });

  return (
    <div className='space-y-4'>
      <div className='grid gap-3 md:grid-cols-4'>
        <div className='rounded-xl border bg-card p-4'>
          <div className='text-muted-foreground text-xs uppercase tracking-wide'>
            Tuần chấm công
          </div>
          <div className='mt-2 text-xl font-semibold'>{getWeekTitle(weekStart, weekEnd)}</div>
          <div className='text-muted-foreground mt-1 text-sm'>{weekStart}</div>
        </div>
        <div className='rounded-xl border bg-card p-4'>
          <div className='text-muted-foreground text-xs uppercase tracking-wide'>
            Nhân sự hiển thị
          </div>
          <div className='mt-2 text-xl font-semibold'>
            {totals.employeesCount}/{totalEmployees}
          </div>
          <div className='text-muted-foreground mt-1 text-sm'>
            Page {page}/{pageCount} theo bộ lọc hiện tại
          </div>
        </div>
        <div className='rounded-xl border bg-card p-4'>
          <div className='text-muted-foreground text-xs uppercase tracking-wide'>
            Tổng công trang này
          </div>
          <div className='mt-2 text-xl font-semibold'>{totals.workdays.toFixed(1)} công</div>
          <div className='text-muted-foreground mt-1 text-sm'>Tính theo số nửa ca đã chọn</div>
        </div>
        <div className='rounded-xl border bg-card p-4'>
          <div className='text-muted-foreground text-xs uppercase tracking-wide'>
            Cảnh báo xung đột
          </div>
          <div className='mt-2 text-xl font-semibold'>{totals.conflictCount}</div>
          <div className='text-muted-foreground mt-1 text-sm'>
            Timesheet, nghỉ phép, OT đã duyệt
          </div>
        </div>
      </div>

      <div className='flex flex-col gap-3 rounded-xl border bg-card p-4'>
        <div className='flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between'>
          <div className='grid gap-3 md:grid-cols-[auto_auto_220px]'>
            <div className='flex items-center gap-2'>
              <Button
                type='button'
                variant='outline'
                onClick={() => navigateToWeek(shiftWeek(weekStart, -7))}
                disabled={isRouting}
              >
                <Icons.chevronLeft className='h-4 w-4' />
                Tuần trước
              </Button>
              <Button
                type='button'
                variant='outline'
                onClick={() => navigateToWeek(shiftWeek(weekStart, 7))}
                disabled={isRouting}
              >
                Tuần sau
                <Icons.chevronRight className='h-4 w-4' />
              </Button>
            </div>

            <div className='space-y-1'>
              <div className='text-muted-foreground text-xs font-medium'>
                Chọn ngày bất kỳ trong tuần
              </div>
              <Input
                type='date'
                value={anchorDate}
                onChange={(event) => setAnchorDate(event.target.value)}
                className='h-9 w-full min-w-44'
              />
            </div>

            <div className='flex items-end'>
              <Button
                type='button'
                onClick={() => navigateToWeek(anchorDate)}
                disabled={isRouting || !anchorDate}
              >
                <Icons.calendar className='h-4 w-4' />
                Xem tuần này
              </Button>
            </div>
          </div>

          <div className='grid gap-2 md:grid-cols-[260px_auto] md:items-end'>
            <div className='space-y-1'>
              <div className='text-muted-foreground text-xs font-medium'>Tìm nhân viên</div>
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder='Mã NV, họ tên, phòng ban...'
                className='h-9'
              />
            </div>
            <Badge
              variant={lock.isLocked ? 'secondary' : canEdit ? 'default' : 'outline'}
              className='h-9 rounded-md px-3 text-sm'
            >
              {lock.isLocked ? 'Đã khóa tuần công' : canEdit ? 'Có quyền cập nhật' : 'Chỉ xem'}
            </Badge>
          </div>
        </div>

        <div className='text-muted-foreground text-sm'>
          Chấm công theo lưới sáng/chiều. Màn này hiện chỉ tải đúng trang nhân sự đang xem để giảm
          thời gian tải; dữ liệu công thủ công vẫn override timesheet của cùng ngày như cũ.
        </div>

        {lock.message ? (
          <div className='rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800'>
            {lock.message}
          </div>
        ) : null}

        {canEdit ? (
          <div className='flex justify-end'>
            <Button
              type='button'
              variant={lock.isLocked ? 'outline' : 'default'}
              disabled={pendingLock || lock.lockedByPayroll}
              onClick={() => handleToggleLock(!lock.isLocked)}
            >
              {pendingLock ? '...' : lock.isLocked ? 'Mở khóa tuần' : 'Khóa tuần'}
            </Button>
          </div>
        ) : null}
      </div>

      <div className='rounded-xl border bg-card p-4'>
        <DataTable table={table} emptyText='Không có nhân sự phù hợp với bộ lọc hiện tại.' />
      </div>
    </div>
  );
}
