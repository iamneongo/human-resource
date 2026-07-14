import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';

import PageContainer from '@/components/layout/page-container';
import { buttonVariants } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { departmentOptions, positionOptions } from '@/features/hr/common/lookups';
import { getEmployeeDetail, updateEmployeeFull } from '@/features/hr/employees/actions';
import { EmployeeForm } from '@/features/hr/employees/components/employee-form';
import type { EmployeeFormValues } from '@/features/hr/employees/schema';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';
import { cn } from '@/lib/utils';

export const metadata = { title: 'HRM: Chỉnh sửa nhân viên' };

export default async function EmployeeEditPage({ params }: { params: Promise<{ id: string }> }) {
  const role = await getCurrentRole();
  if (!roleAtLeast(role, 'hr')) redirect('/dashboard/hr/employees');

  const { id } = await params;
  const [detail, deptOpts, posOpts] = await Promise.all([
    getEmployeeDetail(id),
    departmentOptions(),
    positionOptions()
  ]);

  if (!detail) notFound();
  const { emp } = detail;

  async function updateAction(values: EmployeeFormValues) {
    'use server';
    return updateEmployeeFull(id, values);
  }

  return (
    <PageContainer
      pageTitle={`Chỉnh sửa: ${emp.fullName}`}
      pageDescription={`Mã NV: ${emp.employeeCode}`}
      pageHeaderAction={
        <Link
          href={`/dashboard/hr/employees/${id}`}
          className={cn(buttonVariants({ variant: 'outline' }), 'text-xs md:text-sm')}
        >
          <Icons.chevronLeft className='mr-1 h-4 w-4' /> Chi tiết
        </Link>
      }
    >
      <EmployeeForm
        mode='edit'
        defaults={{
          employeeCode: emp.employeeCode,
          fullName: emp.fullName,
          email: emp.email ?? '',
          phone: emp.phone ?? '',
          soCccd: emp.soCccd ?? '',
          dateOfBirth: emp.dateOfBirth ?? '',
          gender: (emp.gender as 'male' | 'female' | 'other') ?? undefined,
          address: emp.address ?? '',
          maritalStatus:
            (emp.maritalStatus as 'single' | 'married' | 'divorced' | 'widowed' | 'other') ??
            undefined,
          hireDate: emp.hireDate ?? '',
          seniorityDate: emp.seniorityDate ?? '',
          probationEndDate: emp.probationEndDate ?? '',
          resignDate: emp.resignDate ?? '',
          resignReason: emp.resignReason ?? '',
          status: (emp.status as 'active' | 'probation' | 'on_leave' | 'terminated') ?? 'active',
          departmentId: emp.departmentId ?? '',
          positionId: emp.positionId ?? '',
          birthPlace: emp.birthPlace ?? '',
          cccdIssueDate: emp.cccdIssueDate ?? '',
          cccdIssuePlace: emp.cccdIssuePlace ?? '',
          nationality: emp.nationality ?? '',
          permanentAddress: emp.permanentAddress ?? '',
          educationLevel: emp.educationLevel ?? '',
          major: emp.major ?? '',
          jobTitle: emp.jobTitle ?? ''
        }}
        action={updateAction}
        cancelHref={`/dashboard/hr/employees/${id}`}
        departmentOptions={deptOpts}
        positionOptions={posOpts}
      />
    </PageContainer>
  );
}
