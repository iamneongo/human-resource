import Link from 'next/link';

import type { SearchParams } from 'nuqs/server';

import { Icons } from '@/components/icons';
import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { departmentOptions } from '@/features/hr/common/lookups';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
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

type Row = Awaited<ReturnType<typeof listEmployees>>[number];

export const metadata = {
  title: 'HRM: Hồ sơ nhân viên'
};

type PageProps = {
  searchParams: Promise<SearchParams>;
};

function getQueryValue(value: string | string[] | undefined) {
  return typeof value === 'string' ? value : Array.isArray(value) ? value[0] : '';
}

export default async function EmployeesPage(props: PageProps) {
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

  const searchParams = await props.searchParams;
  const departmentId = getQueryValue(searchParams.departmentId);

  const [rows, departments] = await Promise.all([
    listEmployees({ departmentId }),
    departmentOptions()
  ]);
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
      <div className='space-y-4'>
        <form className='grid gap-3 rounded-2xl border bg-card p-4 md:grid-cols-[minmax(260px,360px)_auto] md:items-end'>
          <div className='space-y-1.5'>
            <Label htmlFor='departmentId'>Lọc theo phòng ban</Label>
            <select
              id='departmentId'
              name='departmentId'
              defaultValue={departmentId}
              className='border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
            >
              <option value=''>Tất cả phòng ban</option>
              {departments.map((department) => (
                <option key={department.value} value={department.value}>
                  {department.label}
                </option>
              ))}
            </select>
          </div>
          <div className='flex gap-2'>
            <button type='submit' className={cn(buttonVariants())}>
              Xem danh sách
            </button>
            <Link
              href='/dashboard/hr/employees'
              className={cn(buttonVariants({ variant: 'outline' }))}
            >
              Bỏ lọc
            </Link>
          </div>
        </form>

        <SimpleTable
          columns={columns}
          rows={rows}
          emptyText='Chưa có nhân viên nào theo bộ lọc hiện tại.'
        />
      </div>
    </PageContainer>
  );
}
