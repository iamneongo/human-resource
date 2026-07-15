import type { SearchParams } from 'nuqs/server';

import Link from 'next/link';

import PageContainer from '@/components/layout/page-container';
import { buttonVariants } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import { PayslipDetailDialog } from '@/features/hr/payroll/payslip-detail-dialog';
import { listMyPublishedPayslips } from '@/features/hr/payroll/payslips';
import { formatVND } from '@/lib/format';
import { getCurrentEmployeeId, getCurrentRole, roleAtLeast } from '@/lib/rbac';
import { cn } from '@/lib/utils';

export const metadata = { title: 'HRM: Phiếu lương của tôi' };

type PageProps = {
  searchParams?: Promise<SearchParams>;
};

type Row = Awaited<ReturnType<typeof listMyPublishedPayslips>>[number];

function getQueryValue(value: string | string[] | undefined) {
  return typeof value === 'string' ? value : Array.isArray(value) ? value[0] : '';
}

export default async function MyPayslipsPage(props: PageProps) {
  const role = await getCurrentRole();
  const employeeId = await getCurrentEmployeeId();

  if (!roleAtLeast(role, 'employee') || !employeeId) {
    return (
      <PageContainer
        pageTitle='Phiếu lương của tôi'
        access={false}
        accessFallback={
          <div className='text-muted-foreground text-center text-lg'>
            Tài khoản của bạn chưa được liên kết với hồ sơ nhân sự để xem phiếu lương.
          </div>
        }
      >
        <div />
      </PageContainer>
    );
  }

  const searchParams = await props.searchParams;
  const runId = getQueryValue(searchParams?.runId);
  const rows = await listMyPublishedPayslips(runId || undefined);
  const allRows = runId ? await listMyPublishedPayslips() : rows;
  const periods = Array.from(
    new Map(allRows.map((row) => [row.payrollRunId, row.period ?? '—'])).entries()
  );

  const columns: Column<Row>[] = [
    { header: 'Kỳ lương', cell: (row) => row.period ?? '—', className: 'font-medium' },
    { header: 'Tình trạng', cell: () => 'Đã phát hành nội bộ' },
    {
      header: 'Thực nhận',
      cell: (row) => <span className='font-semibold'>{formatVND(row.netPay)}</span>
    },
    {
      header: 'Chi tiết',
      cell: (row) => <PayslipDetailDialog row={row} viewer='employee' />
    }
  ];

  return (
    <PageContainer pageTitle='Phiếu lương của tôi'>
      <div className='space-y-4'>
        <div className='grid gap-3 md:grid-cols-3' data-tour='my-payslips-summary'>
          <SummaryCard
            label='Phiếu đã phát hành'
            value={allRows.length}
            helper='Chỉ hiển thị các phiếu chính thức đã phát hành nội bộ'
          />
          <SummaryCard
            label='Kỳ gần nhất'
            value={rows[0]?.period ?? '—'}
            helper='Dễ truy cập nhanh phiếu mới nhất'
          />
          <SummaryCard
            label='Tra cứu ngoài app'
            value='Có hỗ trợ'
            helper='HR có thể cấp mã xem nhanh khi không đăng nhập hệ thống'
          />
        </div>

        <form
          className='grid gap-3 rounded-2xl border bg-card p-4 md:grid-cols-[280px_auto]'
          data-tour='my-payslips-filters'
        >
          <div className='space-y-1.5'>
            <Label htmlFor='runId'>Lọc theo kỳ lương</Label>
            <select
              id='runId'
              name='runId'
              defaultValue={runId}
              className='border-input bg-background ring-offset-background flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
            >
              <option value=''>Tất cả kỳ lương</option>
              {periods.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className='flex items-end gap-2'>
            <button type='submit' className={cn(buttonVariants())}>
              Áp dụng
            </button>
            <Link
              href='/dashboard/profile/payslips'
              className={cn(buttonVariants({ variant: 'outline' }))}
            >
              Xóa lọc
            </Link>
          </div>
        </form>

        <div data-tour='my-payslips-table'>
          <SimpleTable
            columns={columns}
            rows={rows}
            emptyText='Chưa có phiếu lương nào được phát hành cho tài khoản này.'
          />
        </div>
      </div>
    </PageContainer>
  );
}

function SummaryCard({
  label,
  value,
  helper
}: {
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <div className='rounded-xl border bg-card p-4'>
      <div className='text-muted-foreground text-xs uppercase tracking-wide'>{label}</div>
      <div className='mt-2 text-2xl font-semibold'>{value}</div>
      <div className='text-muted-foreground mt-1 text-sm'>{helper}</div>
    </div>
  );
}
