import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { EntityFormDialog } from '@/features/hr/common/entity-form-dialog';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import {
  createDepartment,
  createPosition,
  linkEmployeeAccount,
  listDepartments,
  listEmployeeLinks,
  listPositions
} from '@/features/hr/org/actions';
import { departmentOptions, employeeOptions } from '@/features/hr/common/lookups';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';

export const metadata = { title: 'HRM: Cơ cấu tổ chức' };

type Dept = Awaited<ReturnType<typeof listDepartments>>[number];
type Pos = Awaited<ReturnType<typeof listPositions>>[number];
type Link = Awaited<ReturnType<typeof listEmployeeLinks>>[number];

export default async function OrgPage() {
  const role = await getCurrentRole();
  if (!roleAtLeast(role, 'admin')) {
    return (
      <PageContainer
        pageTitle='Cơ cấu tổ chức'
        access={false}
        accessFallback={
          <div className='text-muted-foreground text-center text-lg'>
            Chỉ Admin được truy cập cấu hình cơ cấu tổ chức.
          </div>
        }
      >
        <div />
      </PageContainer>
    );
  }

  const [depts, poss, links, deptOpts, empOpts] = await Promise.all([
    listDepartments(),
    listPositions(),
    listEmployeeLinks(),
    departmentOptions(),
    employeeOptions()
  ]);

  const deptCols: Column<Dept>[] = [
    { header: 'Mã', cell: (r) => r.code, className: 'font-medium' },
    { header: 'Tên phòng ban', cell: (r) => r.name }
  ];
  const posCols: Column<Pos>[] = [
    { header: 'Mã', cell: (r) => r.code, className: 'font-medium' },
    { header: 'Chức vụ', cell: (r) => r.title },
    { header: 'Phòng ban', cell: (r) => r.departmentName ?? '—' }
  ];
  const linkCols: Column<Link>[] = [
    { header: 'Mã NV', cell: (r) => r.employeeCode, className: 'font-medium' },
    { header: 'Họ tên', cell: (r) => r.fullName },
    { header: 'Email hồ sơ', cell: (r) => r.email ?? '—' },
    {
      header: 'Tài khoản đăng nhập',
      cell: (r) =>
        r.clerkUserId ? (
          <Badge variant='default'>Đã liên kết</Badge>
        ) : (
          <Badge variant='secondary'>Chưa liên kết</Badge>
        )
    }
  ];

  return (
    <PageContainer
      pageTitle='Cơ cấu tổ chức'
      pageDescription='Quản lý phòng ban, chức vụ và liên kết tài khoản đăng nhập với hồ sơ nhân viên (cho self-service).'
    >
      {/* Departments */}
      <div className='flex items-center justify-between'>
        <h3 className='text-sm font-medium'>Phòng ban</h3>
        <EntityFormDialog
          triggerLabel='Thêm phòng ban'
          title='Thêm phòng ban'
          action={createDepartment}
          fields={[
            { name: 'code', label: 'Mã', required: true },
            { name: 'name', label: 'Tên phòng ban', required: true }
          ]}
        />
      </div>
      <div className='mt-2'>
        <SimpleTable columns={deptCols} rows={depts} emptyText='Chưa có phòng ban.' />
      </div>

      {/* Positions */}
      <div className='mt-8 flex items-center justify-between'>
        <h3 className='text-sm font-medium'>Chức vụ</h3>
        <EntityFormDialog
          triggerLabel='Thêm chức vụ'
          title='Thêm chức vụ'
          action={createPosition}
          fields={[
            { name: 'code', label: 'Mã', required: true },
            { name: 'title', label: 'Tên chức vụ', required: true },
            { name: 'departmentId', label: 'Phòng ban', type: 'select', options: deptOpts, colSpan: 2 }
          ]}
        />
      </div>
      <div className='mt-2'>
        <SimpleTable columns={posCols} rows={poss} emptyText='Chưa có chức vụ.' />
      </div>

      {/* Account linking */}
      <div className='mt-8 flex items-center justify-between'>
        <h3 className='text-sm font-medium'>Liên kết tài khoản ↔ nhân viên</h3>
        <EntityFormDialog
          triggerLabel='Liên kết tài khoản'
          title='Liên kết tài khoản đăng nhập'
          description='Nhập email tài khoản Clerk đã đăng ký để gán cho hồ sơ nhân viên.'
          action={linkEmployeeAccount}
          fields={[
            { name: 'employeeId', label: 'Nhân viên', type: 'select', options: empOpts, required: true, colSpan: 2 },
            { name: 'accountEmail', label: 'Email tài khoản đăng nhập', type: 'email', required: true, colSpan: 2 }
          ]}
        />
      </div>
      <div className='mt-2'>
        <SimpleTable columns={linkCols} rows={links} emptyText='Chưa có nhân viên.' />
      </div>
    </PageContainer>
  );
}
