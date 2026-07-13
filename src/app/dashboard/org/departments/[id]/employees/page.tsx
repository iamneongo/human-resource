import Link from 'next/link';

import PageContainer from '@/components/layout/page-container';
import { buttonVariants } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import { StatusBadge } from '@/features/hr/common/status-badge';
import { listDepartments, listEmployeesByDepartment } from '@/features/hr/org/actions';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';
import { cn } from '@/lib/utils';

type Row = Awaited<ReturnType<typeof listEmployeesByDepartment>>[number];

export default async function DeptEmployeesPage({ params }: { params: Promise<{ id: string }> }) {
  const role = await getCurrentRole();
  if (!roleAtLeast(role, 'manager')) {
    return (
      <PageContainer pageTitle='Nhân viên phòng ban' access={false}>
        <div />
      </PageContainer>
    );
  }

  const { id } = await params;
  const [employees, depts] = await Promise.all([listEmployeesByDepartment(id), listDepartments()]);

  const dept = depts.find((d) => d.id === id);
  const deptName = dept?.name ?? 'Phòng ban';

  const cols: Column<Row>[] = [
    {
      header: 'Mã NV',
      cell: (r) => (
        <Link
          href={`/dashboard/hr/employees/${r.id}`}
          className='font-mono text-xs hover:underline'
        >
          {r.employeeCode}
        </Link>
      )
    },
    { header: 'Họ và tên', cell: (r) => r.fullName },
    { header: 'Chức vụ', cell: (r) => r.positionTitle ?? '—' },
    { header: 'Email', cell: (r) => r.email ?? '—' },
    { header: 'Trạng thái', cell: (r) => <StatusBadge status={r.status} /> }
  ];

  return (
    <PageContainer
      pageTitle={deptName}
      pageDescription={`${employees.length} nhân viên`}
      pageHeaderAction={
        <Link
          href='/dashboard/org'
          className={cn(buttonVariants({ variant: 'outline' }), 'text-xs md:text-sm')}
        >
          <Icons.chevronLeft className='mr-1 h-4 w-4' /> Sơ đồ tổ chức
        </Link>
      }
    >
      <SimpleTable columns={cols} rows={employees} emptyText='Phòng ban chưa có nhân viên.' />
    </PageContainer>
  );
}
