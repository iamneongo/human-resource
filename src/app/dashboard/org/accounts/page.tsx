import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { EntityFormDialog } from '@/features/hr/common/entity-form-dialog';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import { linkEmployeeAccount, listEmployeeLinks } from '@/features/hr/org/actions';
import { employeeOptions } from '@/features/hr/common/lookups';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';

export const metadata = { title: 'HRM: Liên kết tài khoản' };

type Link = Awaited<ReturnType<typeof listEmployeeLinks>>[number];

export default async function AccountsPage() {
  const role = await getCurrentRole();
  if (!roleAtLeast(role, 'admin')) {
    return (
      <PageContainer
        pageTitle='Liên kết tài khoản'
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

  const [links, empOpts] = await Promise.all([listEmployeeLinks(), employeeOptions()]);

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
      pageTitle='Liên kết tài khoản'
      pageHeaderAction={
        <EntityFormDialog
          triggerLabel='Liên kết tài khoản'
          title='Liên kết tài khoản đăng nhập'
          description='Nhập email tài khoản Clerk đã đăng ký để gán cho hồ sơ nhân viên.'
          action={linkEmployeeAccount}
          fields={[
            {
              name: 'employeeId',
              label: 'Nhân viên',
              type: 'select',
              options: empOpts,
              required: true,
              colSpan: 2
            },
            {
              name: 'accountEmail',
              label: 'Email tài khoản đăng nhập',
              type: 'email',
              required: true,
              colSpan: 2
            }
          ]}
        />
      }
    >
      <SimpleTable columns={linkCols} rows={links} emptyText='Chưa có nhân viên.' />
    </PageContainer>
  );
}
