import Link from 'next/link';

import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { listEmployees } from '@/features/hr/employees/actions';
import { EmployeeCreateDialog } from '@/features/hr/employees/components/employee-create-dialog';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import { departmentOptions, positionOptions } from '@/features/hr/common/lookups';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';

const STATUS_META: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
> = {
  active: { label: 'Đang làm việc', variant: 'default' },
  probation: { label: 'Thử việc', variant: 'secondary' },
  on_leave: { label: 'Nghỉ phép', variant: 'outline' },
  terminated: { label: 'Đã nghỉ', variant: 'destructive' }
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
  const [deptOpts, posOpts] = canCreate
    ? await Promise.all([departmentOptions(), positionOptions()])
    : [[], []];

  const columns: Column<Row>[] = [
    {
      header: 'Mã NV',
      cell: (r) => (
        <Link
          href={`/dashboard/hr/employees/${r.id}`}
          className='text-primary font-medium underline-offset-2 hover:underline'
        >
          {r.employeeCode}
        </Link>
      )
    },
    { header: 'Họ tên', cell: (r) => r.fullName },
    { header: 'Phòng ban', cell: (r) => r.departmentName ?? '—' },
    { header: 'Chức vụ', cell: (r) => r.positionTitle ?? '—' },
    { header: 'Email', cell: (r) => r.email ?? '—' },
    { header: 'Ngày vào làm', cell: (r) => r.hireDate ?? '—' },
    {
      header: 'Trạng thái',
      cell: (r) => {
        const m = STATUS_META[r.status] ?? { label: r.status, variant: 'outline' as const };
        return <Badge variant={m.variant}>{m.label}</Badge>;
      }
    }
  ];

  return (
    <PageContainer
      pageTitle='Hồ sơ nhân viên'
      pageDescription='Quản lý hồ sơ nhân viên điện tử (HR-01).'
      pageHeaderAction={
        canCreate ? (
          <EmployeeCreateDialog departmentOptions={deptOpts} positionOptions={posOpts} />
        ) : undefined
      }
    >
      <SimpleTable columns={columns} rows={rows} emptyText='Chưa có nhân viên nào.' />
    </PageContainer>
  );
}
