import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';

import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Icons } from '@/components/icons';
import { EntityFormDialog } from '@/features/hr/common/entity-form-dialog';
import {
  getEmployeeDetail,
  upsertEmployeeProfile,
  updateEmployeeWorkInfo
} from '@/features/hr/employees/actions';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';
import { departmentOptions, positionOptions } from '@/features/hr/common/lookups';
import { cn } from '@/lib/utils';

import { ContractsTab } from './_tabs/contracts-tab';
import { AssignmentsTab } from './_tabs/assignments-tab';
import { SalaryTab } from './_tabs/salary-tab';
import { AssetsTab } from './_tabs/assets-tab';
import { RewardsTab } from './_tabs/rewards-tab';

export const metadata = { title: 'HRM: Chi tiết nhân viên' };

const GENDER: Record<string, string> = { male: 'Nam', female: 'Nữ', other: 'Khác' };
const STATUS_LABEL: Record<string, string> = {
  active: 'Đang làm việc',
  probation: 'Thử việc',
  on_leave: 'Nghỉ phép',
  terminated: 'Đã nghỉ'
};
const STATUS_COLOR: Record<string, string> = {
  active: 'bg-green-600 text-white',
  probation: 'bg-blue-500 text-white',
  on_leave: 'bg-amber-500 text-white',
  terminated: 'bg-red-600 text-white'
};

function TabSkeleton() {
  return (
    <div className='space-y-2 pt-2'>
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className='h-10 w-full rounded' />
      ))}
    </div>
  );
}

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const role = await getCurrentRole();
  if (!roleAtLeast(role, 'manager')) {
    return (
      <PageContainer pageTitle='Chi tiết nhân viên' access={false}>
        <div />
      </PageContainer>
    );
  }
  const { id } = await params;
  const [detail, deptOpts, posOpts] = await Promise.all([
    getEmployeeDetail(id),
    roleAtLeast(role, 'hr') ? departmentOptions() : Promise.resolve([]),
    roleAtLeast(role, 'hr') ? positionOptions() : Promise.resolve([])
  ]);
  if (!detail) notFound();
  const { emp } = detail;
  const canEdit = roleAtLeast(role, 'hr');

  const profileAction = upsertEmployeeProfile.bind(null, id);
  const workAction = updateEmployeeWorkInfo.bind(null, id);

  return (
    <PageContainer
      pageTitle={emp.fullName}
      pageDescription={`Mã NV: ${emp.employeeCode}`}
      pageHeaderAction={
        <div className='flex gap-2'>
          {roleAtLeast(role, 'hr') && (
            <Link
              href={`/dashboard/hr/employees/${id}/edit`}
              className={cn(buttonVariants({ variant: 'outline' }), 'text-xs md:text-sm')}
            >
              <Icons.edit className='mr-1 h-4 w-4' /> Chỉnh sửa
            </Link>
          )}
          <Link
            href='/dashboard/hr/employees'
            className={cn(buttonVariants({ variant: 'outline' }), 'text-xs md:text-sm')}
          >
            <Icons.chevronLeft className='mr-1 h-4 w-4' /> Danh sách
          </Link>
        </div>
      }
    >
      <div className='grid gap-6 lg:grid-cols-2'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between pb-2'>
            <CardTitle className='text-base'>Thông tin cơ bản</CardTitle>
            {canEdit && (
              <EntityFormDialog
                mode='edit'
                title='Chỉnh sửa hồ sơ nhân thân'
                action={profileAction}
                defaults={{
                  birthPlace: emp.birthPlace ?? '',
                  cccdIssueDate: emp.cccdIssueDate ?? '',
                  cccdIssuePlace: emp.cccdIssuePlace ?? '',
                  nationality: emp.nationality ?? '',
                  permanentAddress: emp.permanentAddress ?? '',
                  educationLevel: emp.educationLevel ?? '',
                  major: emp.major ?? '',
                  jobTitle: emp.jobTitle ?? ''
                }}
                fields={[
                  { name: 'birthPlace', label: 'Nơi sinh' },
                  { name: 'nationality', label: 'Quốc tịch' },
                  { name: 'cccdIssueDate', label: 'Ngày cấp CCCD', type: 'date' },
                  { name: 'cccdIssuePlace', label: 'Nơi cấp CCCD' },
                  { name: 'permanentAddress', label: 'Địa chỉ thường trú', colSpan: 2 },
                  { name: 'educationLevel', label: 'Trình độ văn hóa' },
                  { name: 'major', label: 'Chuyên ngành' },
                  { name: 'jobTitle', label: 'Chức danh công việc' }
                ]}
              />
            )}
          </CardHeader>
          <CardContent>
            <Dl
              rows={[
                ['Họ và tên', emp.fullName],
                ['Ngày sinh', emp.dateOfBirth],
                ['Giới tính', emp.gender ? GENDER[emp.gender] : null],
                ['Nơi sinh', emp.birthPlace],
                ['Số CMND/CCCD', emp.soCccd],
                ['Ngày cấp', emp.cccdIssueDate],
                ['Nơi cấp', emp.cccdIssuePlace],
                ['Quốc tịch', emp.nationality],
                ['Điện thoại', emp.phone],
                ['Email', emp.email],
                ['Thường trú', emp.permanentAddress]
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between pb-2'>
            <CardTitle className='text-base'>Công việc & Học vấn</CardTitle>
            {canEdit && (
              <EntityFormDialog
                mode='edit'
                title='Chỉnh sửa công việc & học vấn'
                action={workAction}
                defaults={{
                  hireDate: emp.hireDate ?? '',
                  seniorityDate: emp.seniorityDate ?? '',
                  probationEndDate: emp.probationEndDate ?? '',
                  status: emp.status ?? 'active',
                  departmentId: '',
                  positionId: '',
                  educationLevel: emp.educationLevel ?? '',
                  major: emp.major ?? '',
                  jobTitle: emp.jobTitle ?? ''
                }}
                fields={[
                  { name: 'hireDate', label: 'Ngày vào làm', type: 'date' },
                  { name: 'seniorityDate', label: 'Ngày theo dõi thâm niên', type: 'date' },
                  { name: 'probationEndDate', label: 'Hết hạn thử việc', type: 'date' },
                  {
                    name: 'status',
                    label: 'Trạng thái',
                    type: 'select',
                    options: [
                      { value: 'active', label: 'Đang làm việc' },
                      { value: 'probation', label: 'Thử việc' },
                      { value: 'on_leave', label: 'Nghỉ phép' },
                      { value: 'terminated', label: 'Đã nghỉ' }
                    ]
                  },
                  { name: 'departmentId', label: 'Phòng ban', type: 'select', options: deptOpts },
                  { name: 'positionId', label: 'Chức vụ', type: 'select', options: posOpts },
                  { name: 'educationLevel', label: 'Trình độ văn hóa' },
                  { name: 'major', label: 'Chuyên ngành' },
                  { name: 'jobTitle', label: 'Chức danh công việc' }
                ]}
              />
            )}
          </CardHeader>
          <CardContent>
            <Dl
              rows={[
                ['Phòng ban', emp.departmentName],
                ['Chức vụ', emp.positionTitle],
                ['Chức danh công việc', emp.jobTitle],
                ['Ngày vào làm', emp.hireDate],
                ['Ngày theo dõi thâm niên', emp.seniorityDate],
                ['Hết hạn thử việc', emp.probationEndDate],
                ['Trình độ văn hóa', emp.educationLevel],
                ['Chuyên ngành', emp.major]
              ]}
              extra={
                <div className='flex items-center justify-between py-1.5'>
                  <span className='text-muted-foreground text-sm'>Trạng thái</span>
                  <Badge className={cn('text-xs', STATUS_COLOR[emp.status] ?? '')}>
                    {STATUS_LABEL[emp.status] ?? emp.status}
                  </Badge>
                </div>
              }
            />
            {emp.resignDate ? (
              <p className='text-muted-foreground mt-2 text-sm'>
                Nghỉ việc: {emp.resignDate}
                {emp.resignReason ? ` — ${emp.resignReason}` : ''}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue='contracts' className='mt-6'>
        <TabsList className='flex-wrap h-auto gap-1'>
          <TabsTrigger value='contracts'>Hợp đồng</TabsTrigger>
          <TabsTrigger value='assignments'>Điều chuyển</TabsTrigger>
          <TabsTrigger value='salary'>Lương & Phúc lợi</TabsTrigger>
          <TabsTrigger value='assets'>Tài sản & BHLD</TabsTrigger>
          <TabsTrigger value='rewards'>Khen thưởng / KL</TabsTrigger>
        </TabsList>

        <TabsContent value='contracts' className='mt-4'>
          <Suspense fallback={<TabSkeleton />}>
            <ContractsTab employeeId={id} canEdit={canEdit} />
          </Suspense>
        </TabsContent>

        <TabsContent value='assignments' className='mt-4'>
          <Suspense fallback={<TabSkeleton />}>
            <AssignmentsTab employeeId={id} canEdit={canEdit} />
          </Suspense>
        </TabsContent>

        <TabsContent value='salary' className='mt-4'>
          <Suspense fallback={<TabSkeleton />}>
            <SalaryTab employeeId={id} canEdit={canEdit} />
          </Suspense>
        </TabsContent>

        <TabsContent value='assets' className='mt-4'>
          <Suspense fallback={<TabSkeleton />}>
            <AssetsTab employeeId={id} canEdit={canEdit} />
          </Suspense>
        </TabsContent>

        <TabsContent value='rewards' className='mt-4'>
          <Suspense fallback={<TabSkeleton />}>
            <RewardsTab employeeId={id} canEdit={canEdit} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}

function Dl({
  rows,
  extra
}: {
  rows: [string, string | null | undefined][];
  extra?: React.ReactNode;
}) {
  return (
    <dl className='divide-y'>
      {rows.map(([k, v]) => (
        <div key={k} className='flex items-center justify-between gap-4 py-1.5'>
          <dt className='text-muted-foreground text-sm'>{k}</dt>
          <dd className='text-right text-sm font-medium'>{v || '—'}</dd>
        </div>
      ))}
      {extra}
    </dl>
  );
}
