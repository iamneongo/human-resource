import Link from 'next/link';

import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { ConfirmDeleteDialog } from '@/features/hr/common/confirm-delete-dialog';
import { EntityFormDialog } from '@/features/hr/common/entity-form-dialog';
import { departmentOptions } from '@/features/hr/common/lookups';
import {
  deleteDailyStaffingTarget,
  getDailyStaffingTracking,
  upsertDailyStaffingTarget
} from '@/features/hr/attendance/staffing-tracking';
import { listShifts } from '@/features/hr/attendance/shifts';
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

  return (
    <PageContainer
      pageTitle='Định biên & tracking ngày'
      pageDescription='Theo dõi số người cần, số người đi làm thực tế và forecast chi phí lương theo từng ngày, bộ phận và ca làm việc.'
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
                  options: shifts.map((shift) => ({
                    value: shift.id,
                    label: `${shift.code} · ${shift.name}`
                  }))
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
        <form
          className='grid gap-3 rounded-2xl border bg-card p-4 md:grid-cols-[1fr_1fr_1fr_1fr_auto] md:items-end'
          data-tour='staffing-filters'
        >
          <div className='space-y-1.5'>
            <Label htmlFor='dateFrom'>Từ ngày</Label>
            <Input
              id='dateFrom'
              name='dateFrom'
              type='date'
              defaultValue={tracking.filters.dateFrom}
            />
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='dateTo'>Đến ngày</Label>
            <Input id='dateTo' name='dateTo' type='date' defaultValue={tracking.filters.dateTo} />
          </div>
          <FilterSelect
            label='Bộ phận'
            name='departmentId'
            value={tracking.filters.departmentId}
            placeholder='Tất cả bộ phận'
            options={departments}
          />
          <FilterSelect
            label='Ca làm việc'
            name='shiftId'
            value={tracking.filters.shiftId}
            placeholder='Tất cả ca'
            options={shifts.map((shift) => ({
              value: shift.id,
              label: `${shift.code} · ${shift.name}`
            }))}
          />
          <div className='flex gap-2'>
            <Button type='submit'>Lọc dữ liệu</Button>
            <Button asChild variant='outline'>
              <Link href='/dashboard/attendance/staffing-tracking'>Mặc định tuần này</Link>
            </Button>
          </div>
        </form>

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

        <div className='rounded-2xl border bg-card p-4' data-tour='staffing-table'>
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

          <div className='mt-4 overflow-x-auto'>
            <Table className='min-w-[1280px]'>
              <TableHeader className='bg-muted/40'>
                <TableRow>
                  <TableHead className='w-[120px]'>Ngày</TableHead>
                  <TableHead className='w-[240px]'>Bộ phận</TableHead>
                  <TableHead className='w-[180px]'>Ca</TableHead>
                  <TableHead className='w-[96px] text-right'>Định biên</TableHead>
                  <TableHead className='w-[108px] text-right'>Thực tế</TableHead>
                  <TableHead className='w-[110px] text-right'>Chênh lệch</TableHead>
                  <TableHead className='w-[128px] text-right'>Tỷ lệ đáp ứng</TableHead>
                  <TableHead className='w-[164px] text-right'>Forecast lương</TableHead>
                  <TableHead className='min-w-[320px]'>Cảnh báo</TableHead>
                  {canEdit ? <TableHead className='w-[96px] text-right'>Thao tác</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tracking.rows.length > 0 ? (
                  tracking.rows.map((row) => (
                    <TableRow key={row.id} className='align-top'>
                      <TableCell className='font-medium whitespace-normal'>
                        {row.workDate}
                      </TableCell>
                      <TableCell className='whitespace-normal'>
                        <div className='max-w-[220px] text-sm leading-6'>{row.departmentName}</div>
                      </TableCell>
                      <TableCell className='whitespace-normal'>
                        <div className='font-medium'>{row.shiftCode}</div>
                        <div className='text-muted-foreground text-xs'>{row.shiftName}</div>
                      </TableCell>
                      <TableCell className='text-right'>
                        {formatNumber(row.targetHeadcount)}
                      </TableCell>
                      <TableCell className='text-right'>
                        <div className='font-medium'>{formatNumber(row.actualHeadcount)}</div>
                        <div className='text-muted-foreground text-xs'>
                          {formatNumber(row.actualWorkdays)} công
                        </div>
                      </TableCell>
                      <TableCell className='text-right'>
                        <Badge
                          variant={
                            row.variance === 0
                              ? 'outline'
                              : row.variance > 0
                                ? 'secondary'
                                : 'destructive'
                          }
                        >
                          {row.variance > 0 ? '+' : ''}
                          {formatNumber(row.variance)}
                        </Badge>
                      </TableCell>
                      <TableCell className='text-right whitespace-nowrap'>
                        {formatNumber(row.coverageRate)}%
                      </TableCell>
                      <TableCell className='text-right font-semibold whitespace-nowrap'>
                        {formatVND(row.estimatedPayrollCost)}
                      </TableCell>
                      <TableCell className='whitespace-normal'>
                        <div className='flex max-w-[320px] flex-wrap gap-1'>
                          {row.warningFlags.length > 0 ? (
                            row.warningFlags.map((warning) => (
                              <Badge
                                key={warning}
                                variant='outline'
                                className='text-xs whitespace-normal'
                              >
                                {warning}
                              </Badge>
                            ))
                          ) : (
                            <span className='text-muted-foreground text-xs'>Không có cảnh báo</span>
                          )}
                        </div>
                      </TableCell>
                      {canEdit ? (
                        <TableCell>
                          <div className='flex justify-end gap-1'>
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
                                  options: shifts.map((shift) => ({
                                    value: shift.id,
                                    label: `${shift.code} · ${shift.name}`
                                  }))
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
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={canEdit ? 10 : 9}
                      className='text-muted-foreground px-4 py-10 text-center'
                    >
                      Chưa có dữ liệu định biên hoặc công thực tế trong phạm vi lọc. Hãy khai báo
                      định biên hoặc kiểm tra lại dữ liệu chấm công.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
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

function FilterSelect({
  label,
  name,
  value,
  placeholder,
  options
}: {
  label: string;
  name: string;
  value: string;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className='space-y-1.5'>
      <Label htmlFor={name}>{label}</Label>
      <select
        id={name}
        name={name}
        defaultValue={value}
        className='border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
      >
        <option value=''>{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
