import { redirect } from 'next/navigation';

import PageContainer from '@/components/layout/page-container';
import { departmentOptions, positionOptions } from '@/features/hr/common/lookups';
import { createEmployee } from '@/features/hr/employees/actions';
import { EmployeeForm } from '@/features/hr/employees/components/employee-form';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';

export const metadata = { title: 'HRM: Thêm nhân viên mới' };

export default async function EmployeeCreatePage() {
  const role = await getCurrentRole();
  if (!roleAtLeast(role, 'hr')) redirect('/dashboard/hr/employees');

  const [deptOpts, posOpts] = await Promise.all([departmentOptions(), positionOptions()]);

  return (
    <PageContainer
      pageTitle='Thêm nhân viên mới'
      pageDescription='Nhập đầy đủ thông tin hồ sơ nhân viên'
    >
      <EmployeeForm
        mode='create'
        departmentOptions={deptOpts}
        positionOptions={posOpts}
        action={createEmployee}
        cancelHref='/dashboard/hr/employees'
      />
    </PageContainer>
  );
}
