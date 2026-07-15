import Link from 'next/link';

import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  deleteDailyStaffingTarget,
  getDailyStaffingTracking,
  upsertDailyStaffingTarget
} from '@/features/hr/attendance/staffing-tracking';
import { StaffingTrackingFilters } from '@/features/hr/attendance/staffing-tracking-filters';
import { listShifts } from '@/features/hr/attendance/shifts';
import { ConfirmDeleteDialog } from '@/features/hr/common/confirm-delete-dialog';
import { EntityFormDialog } from '@/features/hr/common/entity-form-dialog';
import { departmentOptions } from '@/features/hr/common/lookups';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import { formatNumber, formatVND } from '@/lib/format';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';

export const metadata = { title: 'HRM: Định biên & tracking ngày' };

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getQueryValue(value: string | string[] | undefined) {
  return typeof value === 'string' ? value : Array.isArray(value) ? value[0] : '';
}

export default async function StaffingTrackingPage(props: PageProps) {
  const role = await getCurrentRole();

  if (!roleAtLeast(role, 'manager')) {
    return (
      <PageContainer
        pageTitle='Định biên & tracking ngày'
        access={false}
        accessFallback={
          <div className='text-muted-foreground text-center text-lg'>
            Bạn cần vai trò quản lý trở lên để xem định biên và theo dõi nhân sự theo ngày.
          </div>
        }
      >
        <div />
      </PageContainer>
    );
  }

  const canEdit = roleAtLeast(role, 'hr');
  const searchParams = await props.searchParams;
  const filters = {
    dateFrom: getQueryValue(searchParams?.dateFrom),
    dateTo: getQueryValue(searchParams?.dateTo),
    departmentId: getQueryValue(searchParams?.departmentId),
    shiftId: getQueryValue(searchParams?.shiftId)
  };

  const [tracking, departments, shifts] = await Promise.all([
    getDailyStaffingTracking(filters),
    departmentOptions(),
    listShifts()
  ]);

  const shiftOptions = shifts.map((shift) => ({
    value: shift.id,
    label: `${shift.code} · ${shift.name}`
  }));

  const columns: Column<(typeof tracking.rows)[number]>[] = [
    {
      header: 'Ngày',
      cell: (row) => <div className='min-w-[110px] font-medium'>{row.workDate}</div>
    },
    {
      header: 'Bộ phận',
      cell: (row) => <div className='min-w-[220px] whitespace-normal'>{row.departmentName}</div>
    },
    {
      header: 'Ca',
      cell: (row) => (
        <div className='min-w-[160px] whitespace-normal'>
          <div className='font-medium'>{row.shiftCode}</div>
          <div className='text-muted-foreground text-xs'>{row.shiftName}</div>
        </div>
      )
    },
    {
      header: 'Định biên',
      cell: (row) => (
        <div className='min-w-[88px] text-right'>{formatNumber(row.targetHeadcount)}</div>
      )
    },
    {
      header: 'Thực tế',
      cell: (row) => (
        <div className='min-w-[96px] text-right'>
          <div className='font-medium'>{formatNumber(row.actualHeadcount)}</div>
          <div className='text-muted-foreground text-xs'>
            {formatNumber(row.actualWorkdays)} công
          </div>
        </div>
      )
    },
    {
      header: 'Chênh lệch',
      cell: (row) => (
        <div className='min-w-[104px] text-right'>
          <Badge
            variant={
              row.variance === 0 ? 'outline' : row.variance > 0 ? 'secondary' : 'destructive'
            }
          >
            {row.variance > 0 ? '+' : ''}
            {formatNumber(row.variance)}
          </Badge>
        </div>
      )
    },
    {
      header: 'Tỷ lệ đáp ứng',
      cell: (row) => (
        <div className='min-w-[124px] text-right'>{formatNumber(row.coverageRate)}%</div>
      )
    },
    {
      header: 'Forecast lương',
      cell: (row) => (
        <div className='min-w-[148px] text-right font-semibold whitespace-nowrap'>
          {formatVND(row.estimatedPayrollCost)}
        </div>
      )
    },
    {
      header: 'Cảnh báo',
      cell: (row) => (
        <div className='flex min-w-[320px] flex-wrap gap-1'>
          {row.warningFlags.length > 0 ? (
            row.warningFlags.map((warning) => (
              <Badge key={warning} variant='outline' className='text-xs whitespace-normal'>
                {warning}
              </Badge>
            ))
          ) : (
            <span className='text-muted-foreground text-xs'>Không có cảnh báo</span>
          )}
        </div>
      )
    },
    ...(canEdit
      ? [
          {
            header: 'Thao tác',
            cell: (row: (typeof tracking.rows)[number]) => (
              <div className='flex min-w-[160px] justify-end gap-1'>
                <EntityFormDialog
                  mode='edit'
                  title={`Cập nhật định biên ${row.departmentName} - ${row.shiftCode}`}
                  description='Chỉnh lại định biên chuẩn cho dòng tracking này.'
                  action={upsertDailyStaffingTarget}
                  defaults={{
                    workDate: row.workDate,
                    departmentId: row.departmentId,
                    shiftId: row.shiftId,
                    targetHeadcount: String(row.targetHeadcount),
                    note: row.note ?? ''
                  }}
                  fields={[
                    { name: 'workDate', label: 'Ngày', type: 'date', required: true },
                    {
                      name: 'departmentId',
                      label: 'Bộ phận',
                      type: 'select',
                      required: true,
                      options: departments
                    },
                    {
                      name: 'shiftId',
                      label: 'Ca làm việc',
                      type: 'select',
                      required: true,
                      options: shiftOptions
                    },
                    {
                      name: 'targetHeadcount',
                      label: 'Định biên',
                      type: 'number',
                      required: true
                    },
                    {
                      name: 'note',
                      label: 'Ghi chú',
                      type: 'textarea',
                      colSpan: 2
                    }
                  ]}
                  successMessage='Đã cập nhật định biên ngày'
                />
                {row.targetId ? (
                  <ConfirmDeleteDialog
                    label={`định biên ${row.departmentName} - ${row.shiftCode} ngày ${row.workDate}`}
                    action={deleteDailyStaffingTarget.bind(null, row.targetId)}
                  />
                ) : null}
              </div>
            )
          }
        ]
      : [])
  ];

  return (
    <PageContainer
      pageTitle='Định biên & tracking ngày'
      pageHeaderAction={
        canEdit ? (
          <div data-tour='staffing-create'>
            <EntityFormDialog
              triggerLabel='Khai báo định biên'
              title='Khai báo định biên theo ngày'
              description='Dùng để nhập số người chuẩn cần có cho một bộ phận trong một ca làm việc cụ thể.'
              action={upsertDailyStaffingTarget}
              fields={[
                { name: 'workDate', label: 'Ngày', type: 'date', required: true },
                {
                  name: 'departmentId',
                  label: 'Bộ phận',
                  type: 'select',
                  required: true,
                  options: departments
                },
                {
                  name: 'shiftId',
                  label: 'Ca làm việc',
                  type: 'select',
                  required: true,
                  options: shiftOptions
                },
                {
                  name: 'targetHeadcount',
                  label: 'Định biên',
                  type: 'number',
                  required: true
                },
                {
                  name: 'note',
                  label: 'Ghi chú',
                  type: 'textarea',
                  colSpan: 2
                }
              ]}
              defaults={{
                workDate: tracking.filters.dateFrom,
                departmentId: tracking.filters.departmentId,
                shiftId: tracking.filters.shiftId,
                targetHeadcount: '0'
              }}
              successMessage='Đã lưu định biên ngày'
            />
          </div>
        ) : undefined
      }
    >
      <div className='space-y-6'>
        <div data-tour='staffing-filters'>
          <StaffingTrackingFilters
            dateFrom={tracking.filters.dateFrom}
            dateTo={tracking.filters.dateTo}
            departmentId={tracking.filters.departmentId}
            shiftId={tracking.filters.shiftId}
            departments={departments}
            shifts={shiftOptions}
          />
        </div>

        <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-5' data-tour='staffing-summary'>
          <SummaryCard
            title='Bộ phận theo dõi'
            value={formatNumber(tracking.summary.departmentsTracked)}
            helper='Có dữ liệu định biên hoặc phát sinh công thực tế'
          />
          <SummaryCard
            title='Tổng định biên'
            value={formatNumber(tracking.summary.totalTargetHeadcount)}
            helper='Số người chuẩn cần bố trí trong giai đoạn lọc'
          />
          <SummaryCard
            title='Tổng thực tế'
            value={formatNumber(tracking.summary.totalActualHeadcount)}
            helper='Số người thực có mặt từ chấm công'
          />
          <SummaryCard
            title='Thiếu / dư người'
            value={`${formatNumber(tracking.summary.shortageHeadcount)} / ${formatNumber(tracking.summary.excessHeadcount)}`}
            helper='Thiếu trước, dư sau'
          />
          <SummaryCard
            title='Forecast chi phí lương'
            value={formatVND(tracking.summary.estimatedPayrollCost)}
            helper='Chỉ để theo dõi ngày, chưa ghi vào kỳ lương'
          />
        </div>

        <div
          className='min-w-0 overflow-hidden rounded-2xl border bg-card p-4'
          data-tour='staffing-table'
        >
          <div className='flex flex-col gap-2 md:flex-row md:items-center md:justify-between'>
            <div>
              <h2 className='text-base font-semibold'>Bảng định biên theo ngày</h2>
              <p className='text-muted-foreground text-sm'>
                Nếu cùng một ngày có cả timesheet và công thủ công, hệ thống ưu tiên công thủ công
                để tính thực tế và forecast lương.
              </p>
            </div>
            <Button asChild variant='outline'>
              <Link href='/dashboard/payroll/runs'>Mở kỳ lương để preview/chốt</Link>
            </Button>
          </div>

          <div className='mt-4 min-w-0'>
            <SimpleTable
              columns={columns}
              rows={tracking.rows}
              emptyText='Chưa có dữ liệu định biên hoặc công thực tế trong phạm vi lọc. Hãy khai báo định biên hoặc kiểm tra lại dữ liệu chấm công.'
            />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

function SummaryCard({ title, value, helper }: { title: string; value: string; helper: string }) {
  return (
    <Card className='shadow-sm'>
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm font-medium'>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='text-2xl font-semibold'>{value}</div>
        <p className='text-muted-foreground mt-1 text-xs leading-5'>{helper}</p>
      </CardContent>
    </Card>
  );
}
