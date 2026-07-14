import Link from 'next/link';

import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { listEmployees } from '@/features/hr/employees/actions';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
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
            Bạn không có quyền xem danh sách nhân viên.
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
    { header: 'Phòng ban', cell: (row) => row.departmentName ?? '—' },
    { header: 'Chức vụ', cell: (row) => row.positionTitle ?? '—' },
    { header: 'Email', cell: (row) => row.email ?? '—' },
    { header: 'Ngày vào làm', cell: (row) => row.hireDate ?? '—' },
    {
      header: 'Trạng thái',
      cell: (row) => {
        const meta = STATUS_META[row.status] ?? { label: row.status, variant: 'outline' as const };
        return <Badge variant={meta.variant}>{meta.label}</Badge>;
      }
    }
  ];

  return (
    <PageContainer
      pageTitle='Hồ sơ nhân viên'
      pageDescription='Danh sách nhân sự đang được quản lý trong hệ thống. Mỗi hồ sơ là điểm vào để xem hợp đồng, lương, tài sản và lịch sử điều chuyển.'
      pageHeaderAction={
        canCreate ? (
          <Link
            href='/dashboard/hr/employees/create'
            className={cn(buttonVariants(), 'text-xs md:text-sm')}
          >
            <Icons.add className='mr-2 h-4 w-4' /> Thêm nhân viên
          </Link>
        ) : undefined
      }
    >
      <SimpleTable
        columns={columns}
        rows={rows}
        emptyText='Chưa có nhân viên nào. Hãy thêm hồ sơ nhân viên đầu tiên để bắt đầu quản lý dữ liệu HR.'
      />
    </PageContainer>
  );
}
