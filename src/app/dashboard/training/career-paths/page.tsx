import PageContainer from '@/components/layout/page-container';
import { EntityFormDialog } from '@/features/hr/common/entity-form-dialog';
import { positionOptions } from '@/features/hr/common/lookups';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import {
  createCareerPath,
  listCareerPaths
} from '@/features/hr/training/actions';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';

export const metadata = { title: 'HRM: Lộ trình nghề nghiệp' };

type Row = Awaited<ReturnType<typeof listCareerPaths>>[number];

export default async function CareerPathsPage() {
  const role = await getCurrentRole();
  if (!roleAtLeast(role, 'manager')) {
    return <PageContainer pageTitle='Lộ trình nghề nghiệp' access={false}><div /></PageContainer>;
  }
  const rows = await listCareerPaths();
  const canCreate = roleAtLeast(role, 'hr');
  const posOpts = canCreate ? await positionOptions() : [];

  const columns: Column<Row>[] = [
    { header: 'Vị trí đích', cell: (r) => r.toPositionTitle ?? '—', className: 'font-medium' },
    { header: 'Thâm niên tối thiểu', cell: (r) => (r.minYears ? `${r.minYears} năm` : '—') },
    { header: 'Khóa học bắt buộc', cell: (r) => r.requiredCourses ?? '—' },
    { header: 'Mô tả', cell: (r) => r.description ?? '—' }
  ];

  return (
    <PageContainer
      pageTitle='Lộ trình nghề nghiệp'
      pageDescription='Thiết lập mốc thăng tiến rõ ràng cho từng vị trí và các khóa đào tạo bắt buộc để lên cấp.'
      pageHeaderAction={
        canCreate ? (
          <EntityFormDialog
            triggerLabel='Thêm lộ trình'
            title='Thêm lộ trình nghề nghiệp'
            action={createCareerPath}
            fields={[
              { name: 'fromPositionId', label: 'Vị trí hiện tại', type: 'select', options: posOpts, colSpan: 2 },
              { name: 'toPositionId', label: 'Vị trí đích', type: 'select', options: posOpts, required: true, colSpan: 2 },
              { name: 'minYears', label: 'Thâm niên tối thiểu (năm)', type: 'number' },
              { name: 'requiredCourses', label: 'Khóa học bắt buộc' },
              { name: 'description', label: 'Mô tả', type: 'textarea' }
            ]}
          />
        ) : undefined
      }
    >
      <SimpleTable columns={columns} rows={rows} emptyText='Chưa có lộ trình nào.' />
    </PageContainer>
  );
}
