import Link from 'next/link';

import type { SearchParams } from 'nuqs/server';

import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { buttonVariants } from '@/components/ui/button';
import { departmentOptions, employeeOptions } from '@/features/hr/common/lookups';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import { listPayslips } from '@/features/hr/payroll/payslips';
import { PayslipDetailDialog } from '@/features/hr/payroll/payslip-detail-dialog';
import { listPayrollRuns } from '@/features/hr/payroll/runs';
import { SendButton } from '@/features/hr/payroll/send-button';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';
import { formatNumber, formatVND } from '@/lib/format';
import { cn } from '@/lib/utils';

export const metadata = { title: 'HRM: Phiếu lương' };

const vnd = formatVND;
const num = formatNumber;
type Row = Awaited<ReturnType<typeof listPayslips>>[number];

type PageProps = {
  searchParams?: Promise<SearchParams>;
};

function getQueryValue(value: string | string[] | undefined) {
  return typeof value === 'string' ? value : Array.isArray(value) ? value[0] : '';
}

export default async function PayslipsPage(props: PageProps) {
  const role = await getCurrentRole();
  if (!roleAtLeast(role, 'hr')) {
    return (
      <PageContainer
        pageTitle='Phiếu lương'
        access={false}
        accessFallback={
          <div className='text-muted-foreground text-center text-lg'>
            Bạn cần quyền HR trở lên để xem phiếu lương.
          </div>
        }
      >
        <div />
      </PageContainer>
    );
  }

  const searchParams = await props.searchParams;
  const employeeId = getQueryValue(searchParams?.employeeId);
  const departmentId = getQueryValue(searchParams?.departmentId);
  const runId = getQueryValue(searchParams?.runId);

  const [rows, departments, employeeOpts, runs] = await Promise.all([
    listPayslips(runId || undefined),
    departmentOptions(),
    employeeOptions(),
    listPayrollRuns()
  ]);

  const filteredRows = rows.filter((row) => {
    if (employeeId && row.employeeId !== employeeId) return false;
    if (departmentId && row.departmentId !== departmentId) return false;
    return true;
  });

  const columns: Column<Row>[] = [
    { header: 'Kỳ lương', cell: (row) => row.period ?? '—', className: 'font-medium' },
    {
      header: 'Nhân sự',
      cell: (row) => `${row.employeeCode ?? ''} ${row.employeeName ?? ''}`.trim()
    },
    { header: 'Phòng ban', cell: (row) => row.departmentName ?? '—' },
    {
      header: 'Loại snapshot',
      cell: (row) => (
        <Badge variant={row.isPreview ? 'outline' : 'default'}>
          {row.isPreview ? 'Preview' : 'Chính thức'}
        </Badge>
      )
    },
    {
      header: 'Nguồn công',
      cell: (row) => `${num(row.manualDays)} manual / ${num(row.timesheetDays)} timesheet`
    },
    { header: 'Số công', cell: (row) => `${num(row.workedDays)} công` },
    { header: 'Lương theo công', cell: (row) => vnd(row.salaryByAttendance) },
    { header: 'Phụ cấp', cell: (row) => vnd(row.fixedAllowance) },
    { header: 'OT', cell: (row) => `${num(row.overtimeHours)} giờ / ${vnd(row.overtimePay)}` },
    { header: 'Điều chỉnh', cell: (row) => vnd(row.otherAdjustments) },
    { header: 'Gross', cell: (row) => vnd(row.grossPay) },
    { header: 'Thuế TNCN', cell: (row) => vnd(row.taxDeduction) },
    {
      header: 'Thực nhận',
      cell: (row) => <span className='font-semibold'>{vnd(row.netPay)}</span>
    },
    {
      header: 'Chi tiết',
      cell: (row) => <PayslipDetailDialog row={row} />
    },
    {
      header: '',
      cell: (row) => <SendButton id={row.id} sent={!!row.sentAt} isPreview={row.isPreview} />
    }
  ];

  return (
    <PageContainer pageTitle='Phiếu lương'>
      <div className='space-y-4'>
        <div className='grid gap-3 md:grid-cols-4'>
          <SummaryCard
            label='Tổng phiếu lương'
            value={filteredRows.length}
            helper='Theo bộ lọc hiện tại'
          />
          <SummaryCard
            label='Bản preview'
            value={filteredRows.filter((row) => row.isPreview).length}
            helper='Dùng để đối chiếu trước khi chốt'
          />
          <SummaryCard
            label='Bản chính thức'
            value={filteredRows.filter((row) => !row.isPreview).length}
            helper='Được phát hành nội bộ sau khi chốt'
          />
          <SummaryCard
            label='Đã phát hành'
            value={filteredRows.filter((row) => Boolean(row.sentAt)).length}
            helper='Phiếu lương đã gửi nội bộ'
          />
        </div>

        <form className='grid gap-3 rounded-2xl border bg-card p-4 md:grid-cols-2 xl:grid-cols-4'>
          <div className='space-y-1.5'>
            <Label htmlFor='runId'>Kỳ lương</Label>
            <select
              id='runId'
              name='runId'
              defaultValue={runId}
              className='border-input bg-background ring-offset-background flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
            >
              <option value=''>Tất cả kỳ lương</option>
              {runs.map((run) => (
                <option key={run.id} value={run.id}>
                  {run.period} · {run.name}
                </option>
              ))}
            </select>
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='departmentId'>Phòng ban</Label>
            <select
              id='departmentId'
              name='departmentId'
              defaultValue={departmentId}
              className='border-input bg-background ring-offset-background flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
            >
              <option value=''>Tất cả phòng ban</option>
              {departments.map((department) => (
                <option key={department.value} value={department.value}>
                  {department.label}
                </option>
              ))}
            </select>
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='employeeId'>Nhân sự</Label>
            <select
              id='employeeId'
              name='employeeId'
              defaultValue={employeeId}
              className='border-input bg-background ring-offset-background flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
            >
              <option value=''>Tất cả nhân sự</option>
              {employeeOpts.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className='flex items-end gap-2'>
            <button type='submit' className={cn(buttonVariants())}>
              Áp dụng bộ lọc
            </button>
            <Link
              href='/dashboard/payroll/payslips'
              className={cn(buttonVariants({ variant: 'outline' }))}
            >
              Xóa lọc
            </Link>
          </div>
        </form>

        <SimpleTable
          columns={columns}
          rows={filteredRows}
          emptyText='Chưa có phiếu lương. Hãy tạo kỳ lương rồi preview hoặc chốt bảng lương trước.'
        />
      </div>
    </PageContainer>
  );
}

function SummaryCard({ label, value, helper }: { label: string; value: number; helper: string }) {
  return (
    <div className='rounded-xl border bg-card p-4'>
      <div className='text-muted-foreground text-xs uppercase tracking-wide'>{label}</div>
      <div className='mt-2 text-2xl font-semibold'>{value}</div>
      <div className='text-muted-foreground mt-1 text-sm'>{helper}</div>
    </div>
  );
}
