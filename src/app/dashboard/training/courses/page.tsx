import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { EntityFormDialog } from '@/features/hr/common/entity-form-dialog';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import { createCourse, listCourses, planOptions } from '@/features/hr/training/actions';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';

export const metadata = { title: 'HRM: Khóa học & Nội dung' };

const vnd = (n: string | null) => (n == null ? '—' : Number(n).toLocaleString('vi-VN') + ' ₫');
type Row = Awaited<ReturnType<typeof listCourses>>[number];

export default async function CoursesPage() {
  const role = await getCurrentRole();
  if (!roleAtLeast(role, 'manager')) {
    return <PageContainer pageTitle='Khóa học & Nội dung' access={false}><div /></PageContainer>;
  }
  const rows = await listCourses();
  const canCreate = roleAtLeast(role, 'hr');
  const plans = canCreate ? await planOptions() : [];

  const columns: Column<Row>[] = [
    { header: 'Mã', cell: (r) => r.code, className: 'font-medium' },
    { header: 'Tên khóa học', cell: (r) => r.name },
    { header: 'Giảng viên', cell: (r) => r.instructor ?? '—' },
    { header: 'Hình thức', cell: (r) => (r.isElearning ? <Badge>E-learning</Badge> : <Badge variant='secondary'>Trực tiếp</Badge>) },
    { header: 'Kế hoạch', cell: (r) => r.planName ?? '—' },
    { header: 'Chi phí', cell: (r) => vnd(r.cost) }
  ];

  return (
    <PageContainer
      pageTitle='Khóa học & Nội dung'
      pageDescription='Danh mục khóa học, giáo trình, tài liệu (E-learning), ngân hàng câu hỏi.'
      pageHeaderAction={
        canCreate ? (
          <EntityFormDialog
            triggerLabel='Thêm khóa học'
            title='Thêm khóa học'
            action={createCourse}
            defaults={{ isElearning: 'false' }}
            fields={[
              { name: 'code', label: 'Mã khóa học', required: true },
              { name: 'name', label: 'Tên khóa học', required: true },
              { name: 'planId', label: 'Thuộc kế hoạch', type: 'select', options: plans, colSpan: 2 },
              { name: 'instructor', label: 'Giảng viên' },
              { name: 'isElearning', label: 'Hình thức', type: 'select', options: [{ value: 'false', label: 'Trực tiếp' }, { value: 'true', label: 'E-learning' }] },
              { name: 'startDate', label: 'Bắt đầu', type: 'date' },
              { name: 'endDate', label: 'Kết thúc', type: 'date' },
              { name: 'cost', label: 'Chi phí (₫)', type: 'number' }
            ]}
          />
        ) : undefined
      }
    >
      <SimpleTable columns={columns} rows={rows} emptyText='Chưa có khóa học nào.' />
    </PageContainer>
  );
}
