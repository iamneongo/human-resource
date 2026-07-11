import { notFound } from 'next/navigation';
import Link from 'next/link';

import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { getEmployeeDetail } from '@/features/hr/employees/actions';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';
import { cn } from '@/lib/utils';

export const metadata = { title: 'HRM: Chi tiết nhân viên' };

const GENDER: Record<string, string> = { male: 'Nam', female: 'Nữ', other: 'Khác' };
const STATUS: Record<string, string> = {
  active: 'Đang làm việc',
  probation: 'Thử việc',
  on_leave: 'Nghỉ phép',
  terminated: 'Đã nghỉ'
};
const CONTRACT_TYPE: Record<string, string> = {
  probation: 'Thử việc',
  fixed_term: 'Xác định thời hạn',
  term_1y: 'HĐLĐ 1 năm',
  term_3y: 'HĐLĐ 3 năm',
  indefinite: 'Không xác định thời hạn',
  until_retirement: 'Đến nghỉ hưu',
  seasonal: 'Thời vụ'
};

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
  const detail = await getEmployeeDetail(id);
  if (!detail) notFound();
  const { emp, contracts } = detail;

  const contractCols: Column<(typeof contracts)[number]>[] = [
    { header: 'Số HĐ', cell: (c) => c.contractNumber },
    { header: 'Loại', cell: (c) => CONTRACT_TYPE[c.type] ?? c.type },
    { header: 'Từ ngày', cell: (c) => c.startDate },
    { header: 'Đến ngày', cell: (c) => c.endDate ?? '—' },
    { header: 'Trạng thái', cell: (c) => c.status }
  ];

  return (
    <PageContainer
      pageTitle={emp.fullName}
      pageDescription={`Mã NV: ${emp.employeeCode}`}
      pageHeaderAction={
        <Link
          href='/dashboard/hr/employees'
          className={cn(buttonVariants({ variant: 'outline' }), 'text-xs md:text-sm')}
        >
          <Icons.chevronLeft className='mr-1 h-4 w-4' /> Danh sách
        </Link>
      }
    >
      <div className='grid gap-6 lg:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Thông tin cơ bản</CardTitle>
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
          <CardHeader>
            <CardTitle className='text-base'>Công việc & Học vấn</CardTitle>
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
                  <Badge variant={emp.status === 'active' ? 'default' : 'secondary'}>
                    {STATUS[emp.status] ?? emp.status}
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

      <div className='mt-6'>
        <h3 className='mb-2 text-sm font-medium'>Hợp đồng lao động</h3>
        <SimpleTable columns={contractCols} rows={contracts} emptyText='Chưa có hợp đồng.' />
      </div>
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
