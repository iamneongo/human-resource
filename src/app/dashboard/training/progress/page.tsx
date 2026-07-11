import PageContainer from '@/components/layout/page-container';
import { EntityFormDialog } from '@/features/hr/common/entity-form-dialog';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import {
  enrollmentOptions,
  listProgress,
  upsertProgress
} from '@/features/hr/training/actions';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';

export const metadata = { title: 'HRM: Theo dõi học tập' };

const pct = (n: string | null) => (n == null ? '—' : `${n}%`);
type Row = Awaited<ReturnType<typeof listProgress>>[number];

export default async function ProgressPage() {
  const role = await getCurrentRole();
  if (!roleAtLeast(role, 'manager')) {
    return <PageContainer pageTitle='Theo dõi học tập' access={false}><div /></PageContainer>;
  }
  const rows = await listProgress();
  const canManage = roleAtLeast(role, 'hr');
  const enrollOpts = canManage ? await enrollmentOptions() : [];

  const columns: Column<Row>[] = [
    { header: 'Học viên', cell: (r) => r.employeeName ?? '—', className: 'font-medium' },
    { header: 'Khóa học', cell: (r) => r.courseName ?? '—' },
    { header: 'Điểm danh', cell: (r) => pct(r.attendanceRate) },
    { header: 'Hoàn thành', cell: (r) => pct(r.completionRate) },
    { header: 'Điểm thi', cell: (r) => r.examScore ?? '—' },
    { header: 'Hài lòng', cell: (r) => r.satisfactionScore ?? '—' }
  ];

  return (
    <PageContainer
      pageTitle='Theo dõi học tập'
      pageDescription='Ghi nhận điểm danh, tiến độ hoàn thành, kết quả thi và đánh giá hiệu quả sau đào tạo.'
      pageHeaderAction={
        canManage ? (
          <EntityFormDialog
            triggerLabel='Cập nhật tiến độ'
            title='Cập nhật tiến độ học tập'
            action={upsertProgress}
            fields={[
              { name: 'enrollmentId', label: 'Ghi danh', type: 'select', options: enrollOpts, required: true, colSpan: 2 },
              { name: 'attendanceRate', label: 'Tỷ lệ điểm danh (%)', type: 'number' },
              { name: 'completionRate', label: 'Tỷ lệ hoàn thành (%)', type: 'number' },
              { name: 'examScore', label: 'Điểm thi', type: 'number' },
              { name: 'satisfactionScore', label: 'Điểm hài lòng', type: 'number' },
              { name: 'appliedAssessment', label: 'Đánh giá áp dụng (sau 1-3 tháng)', type: 'textarea' }
            ]}
          />
        ) : undefined
      }
    >
      <SimpleTable columns={columns} rows={rows} emptyText='Chưa có dữ liệu học tập nào.' />
    </PageContainer>
  );
}
