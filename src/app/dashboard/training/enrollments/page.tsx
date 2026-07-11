import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { EntityFormDialog } from '@/features/hr/common/entity-form-dialog';
import { employeeOptions } from '@/features/hr/common/lookups';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import {
  courseOptions,
  createEnrollment,
  listEnrollments
} from '@/features/hr/training/actions';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';

export const metadata = { title: 'HRM: Ghi danh học viên' };

const STATUS_LABEL: Record<string, string> = {
  enrolled: 'Đã ghi danh',
  in_progress: 'Đang học',
  completed: 'Hoàn thành',
  failed: 'Không đạt',
  dropped: 'Bỏ học'
};

type Row = Awaited<ReturnType<typeof listEnrollments>>[number];

export default async function EnrollmentsPage() {
  const role = await getCurrentRole();
  if (!roleAtLeast(role, 'manager')) {
    return <PageContainer pageTitle='Ghi danh học viên' access={false}><div /></PageContainer>;
  }
  const rows = await listEnrollments();
  const canCreate = roleAtLeast(role, 'hr');
  const [courses, emps] = canCreate
    ? await Promise.all([courseOptions(), employeeOptions()])
    : [[], []];

  const columns: Column<Row>[] = [
    { header: 'Khóa học', cell: (r) => r.courseName ?? '—', className: 'font-medium' },
    { header: 'Học viên', cell: (r) => r.employeeName ?? '—' },
    { header: 'Hình thức', cell: (r) => (r.type === 'mandatory' ? <Badge>Bắt buộc</Badge> : <Badge variant='secondary'>Tự nguyện</Badge>) },
    { header: 'Trạng thái', cell: (r) => STATUS_LABEL[r.status] ?? r.status }
  ];

  return (
    <PageContainer
      pageTitle='Ghi danh học viên'
      pageDescription='Chỉ định học viên bắt buộc theo vị trí/phòng ban hoặc mở cổng cho nhân viên tự đăng ký.'
      pageHeaderAction={
        canCreate ? (
          <EntityFormDialog
            triggerLabel='Ghi danh'
            title='Ghi danh học viên'
            action={createEnrollment}
            defaults={{ type: 'self_registered' }}
            fields={[
              { name: 'courseId', label: 'Khóa học', type: 'select', options: courses, required: true, colSpan: 2 },
              { name: 'employeeId', label: 'Học viên', type: 'select', options: emps, required: true, colSpan: 2 },
              { name: 'type', label: 'Hình thức', type: 'select', options: [{ value: 'self_registered', label: 'Tự nguyện' }, { value: 'mandatory', label: 'Bắt buộc' }] }
            ]}
          />
        ) : undefined
      }
    >
      <SimpleTable columns={columns} rows={rows} emptyText='Chưa có ghi danh nào.' />
    </PageContainer>
  );
}
