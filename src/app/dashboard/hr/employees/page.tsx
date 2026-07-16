import Link from 'next/link';

import { Icons } from '@/components/icons';
import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import { SummaryMetricCard } from '@/features/hr/common/summary-metric-card';
import { listEmployees } from '@/features/hr/employees/actions';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';
import { cn } from '@/lib/utils';

const STATUS_META: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
> = {
  active: { label: 'Đang làm việc', variant: 'default' },
  probation: { label: 'Thử việc', variant: 'secondary' },
  on_leave: { label: 'Đang nghỉ phép', variant: 'outline' },
  terminated: { label: 'Đã nghỉ việc', variant: 'destructive' }
};

const DOCUMENT_META: Record<
  string,
  { label: string; variant: 'default' | 'outline' | 'destructive' }
> = {
  complete: { label: 'Đủ hồ sơ', variant: 'default' },
  expiring: { label: 'Có giấy tờ sắp hết hạn', variant: 'outline' },
  missing: { label: 'Thiếu hồ sơ', variant: 'destructive' }
};

type Row = Awaited<ReturnType<typeof listEmployees>>[number];

export const metadata = {
  title: 'HRM: Hồ sơ nhân viên'
};

export default async function EmployeesPage() {
  const role = await getCurrentRole();
  const canView = roleAtLeast(role, 'manager');

  if (!canView) {
    return (
      <PageContainer
        pageTitle='Hồ sơ nhân viên'
        access={false}
        accessFallback={
          <div className='text-muted-foreground text-center text-lg'>
            Bạn không có quyền xem danh sách nhân sự.
          </div>
        }
      >
        <div />
      </PageContainer>
    );
  }

  const rows = await listEmployees();
  const canCreate = roleAtLeast(role, 'hr');

  const columns: Column<Row>[] = [
    {
      header: 'Mã nhân viên',
      cell: (row) => (
        <Link
          href={`/dashboard/hr/employees/${row.id}`}
          className='text-primary font-medium underline-offset-2 hover:underline'
        >
          {row.employeeCode}
        </Link>
      )
    },
    { header: 'Họ tên', cell: (row) => row.fullName },
    { header: 'Phòng ban', cell: (row) => row.departmentName ?? '-' },
    { header: 'Chức vụ', cell: (row) => row.positionTitle ?? '-' },
    { header: 'Email', cell: (row) => row.email ?? '-' },
    { header: 'Ngày vào làm', cell: (row) => row.hireDate ?? '-' },
    {
      header: 'Trạng thái',
      cell: (row) => {
        const meta = STATUS_META[row.status] ?? { label: row.status, variant: 'outline' as const };
        return <Badge variant={meta.variant}>{meta.label}</Badge>;
      }
    },
    {
      header: 'Hồ sơ số hóa',
      cell: (row) => {
        const meta = DOCUMENT_META[row.documentStatus] ?? {
          label: row.documentStatus,
          variant: 'outline' as const
        };
        return (
          <div className='flex min-w-[170px] flex-col gap-1'>
            <Badge variant={meta.variant}>{meta.label}</Badge>
            <span className='text-muted-foreground text-xs'>
              {row.documentCount} giấy tờ, thiếu {row.missingRequiredCount} nhóm
            </span>
          </div>
        );
      }
    }
  ];

  return (
    <PageContainer
      pageTitle='Hồ sơ nhân viên'
      pageHeaderAction={
        canCreate ? (
          <div data-tour='employees-create'>
            <Link
              href='/dashboard/hr/employees/create'
              className={cn(buttonVariants(), 'text-xs md:text-sm')}
            >
              <Icons.add className='mr-2 h-4 w-4' /> Thêm nhân sự
            </Link>
          </div>
        ) : undefined
      }
    >
      <div className='space-y-4'>
        <div className='grid gap-3 md:grid-cols-4' data-tour='employees-summary'>
          <SummaryMetricCard
            label='Tổng nhân sự hiển thị'
            value={String(rows.length)}
            helper='Theo dữ liệu hiện có'
            tone='primary'
          />
          <SummaryMetricCard
            label='Đủ hồ sơ'
            value={String(rows.filter((row) => row.documentStatus === 'complete').length)}
            helper='Sẵn sàng trình diễn hồ sơ số hóa'
            tone='sky'
          />
          <SummaryMetricCard
            label='Thiếu hồ sơ'
            value={String(rows.filter((row) => row.documentStatus === 'missing').length)}
            helper='Cần bổ sung giấy tờ bắt buộc'
            tone='amber'
          />
          <SummaryMetricCard
            label='Giấy tờ sắp hết hạn'
            value={String(rows.filter((row) => row.documentStatus === 'expiring').length)}
            helper='Case đẹp để demo cảnh báo'
            tone='rose'
          />
        </div>

        <div data-tour='employees-table'>
          <SimpleTable
            columns={columns}
            rows={rows}
            emptyText='Chưa có nhân sự phù hợp. Hãy thêm nhân sự để tiếp tục demo.'
          />
        </div>
      </div>
    </PageContainer>
  );
}
