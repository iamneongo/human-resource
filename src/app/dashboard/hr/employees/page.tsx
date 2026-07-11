import PageContainer from '@/components/layout/page-container';
import { listEmployees } from '@/features/hr/employees/actions';
import { EmployeeCreateDialog } from '@/features/hr/employees/components/employee-create-dialog';
import { EmployeeTable } from '@/features/hr/employees/components/employee-table';
import { departmentOptions, positionOptions } from '@/features/hr/common/lookups';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';

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

  return (
    <PageContainer
      pageTitle='Hồ sơ nhân viên'
      pageDescription='Quản lý hồ sơ nhân viên điện tử (HR-01).'
      pageHeaderAction={
        canCreate ? (
          <EmployeeCreateDialog
            departmentOptions={deptOpts}
            positionOptions={posOpts}
          />
        ) : undefined
      }
    >
      <EmployeeTable rows={rows} />
    </PageContainer>
  );
}
