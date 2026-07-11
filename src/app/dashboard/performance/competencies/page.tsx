import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { EntityFormDialog } from '@/features/hr/common/entity-form-dialog';
import { departmentOptions } from '@/features/hr/common/lookups';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import {
  createCompetency,
  listCompetencies
} from '@/features/hr/performance/competencies';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';

export const metadata = { title: 'HRM: Khung năng lực' };

const GROUP_LABEL: Record<string, string> = {
  core: 'Cốt lõi',
  knowledge: 'Kiến thức',
  skill: 'Kỹ năng',
  attitude: 'Thái độ'
};

type Row = Awaited<ReturnType<typeof listCompetencies>>[number];

export default async function CompetenciesPage() {
  const role = await getCurrentRole();
  if (!roleAtLeast(role, 'manager')) {
    return <PageContainer pageTitle='Khung năng lực' access={false}><div /></PageContainer>;
  }
  const rows = await listCompetencies();
  const canCreate = roleAtLeast(role, 'hr');
  const deptOpts = canCreate ? await departmentOptions() : [];

  const columns: Column<Row>[] = [
    { header: 'Mã', cell: (r) => r.code, className: 'font-medium' },
    { header: 'Tên năng lực', cell: (r) => r.name },
    { header: 'Nhóm', cell: (r) => <Badge variant='secondary'>{GROUP_LABEL[r.group] ?? r.group}</Badge> },
    { header: 'Phòng ban', cell: (r) => r.departmentName ?? 'Chung' },
    { header: 'Thang bậc', cell: (r) => r.maxLevel }
  ];

  return (
    <PageContainer
      pageTitle='Khung năng lực'
      pageDescription='Từ điển năng lực (Cốt lõi / Kiến thức / Kỹ năng / Thái độ) chi tiết cho từng phòng ban.'
      pageHeaderAction={
        canCreate ? (
          <EntityFormDialog
            triggerLabel='Thêm năng lực'
            title='Thêm năng lực'
            action={createCompetency}
            defaults={{ group: 'core', maxLevel: '5' }}
            fields={[
              { name: 'code', label: 'Mã', required: true },
              { name: 'name', label: 'Tên năng lực', required: true },
              { name: 'group', label: 'Nhóm', type: 'select', required: true, options: Object.entries(GROUP_LABEL).map(([value, label]) => ({ value, label })) },
              { name: 'departmentId', label: 'Phòng ban', type: 'select', options: deptOpts },
              { name: 'maxLevel', label: 'Thang bậc tối đa', type: 'number' },
              { name: 'description', label: 'Mô tả', type: 'textarea' }
            ]}
          />
        ) : undefined
      }
    >
      <SimpleTable columns={columns} rows={rows} emptyText='Chưa có năng lực nào.' />
    </PageContainer>
  );
}
