import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { EntityFormDialog } from '@/features/hr/common/entity-form-dialog';
import { employeeOptions } from '@/features/hr/common/lookups';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import { createNeed, listNeeds } from '@/features/hr/training/actions';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';

export const metadata = { title: 'HRM: Nhu cầu đào tạo (TNA)' };

const SOURCE_LABEL: Record<string, string> = {
  employee_request: 'NV đề xuất',
  manager_assessment: 'QL đánh giá',
  competency_gap: 'Thiếu hụt năng lực'
};

type Row = Awaited<ReturnType<typeof listNeeds>>[number];

export default async function NeedsPage() {
  const role = await getCurrentRole();
  if (!roleAtLeast(role, 'manager')) {
    return <PageContainer pageTitle='Nhu cầu đào tạo (TNA)' access={false}><div /></PageContainer>;
  }
  const rows = await listNeeds();
  const empOpts = await employeeOptions();

  const columns: Column<Row>[] = [
    { header: 'Chủ đề', cell: (r) => r.topic, className: 'font-medium' },
    { header: 'Nguồn', cell: (r) => <Badge variant='secondary'>{SOURCE_LABEL[r.source] ?? r.source}</Badge> },
    { header: 'Nhân viên', cell: (r) => r.employeeName ?? 'Chung' },
    { header: 'Ưu tiên', cell: (r) => r.priority ?? '—' }
  ];

  return (
    <PageContainer
      pageTitle='Nhu cầu đào tạo (TNA)'
      pageDescription='Thu thập nhu cầu từ đề xuất nhân viên, đánh giá quản lý, hoặc thiếu hụt năng lực sau đánh giá.'
      pageHeaderAction={
        <EntityFormDialog
          triggerLabel='Thêm nhu cầu'
          title='Thêm nhu cầu đào tạo'
          action={createNeed}
          defaults={{ source: 'employee_request', priority: 'medium' }}
          fields={[
            { name: 'topic', label: 'Chủ đề', required: true, colSpan: 2 },
            { name: 'source', label: 'Nguồn', type: 'select', required: true, options: Object.entries(SOURCE_LABEL).map(([value, label]) => ({ value, label })) },
            { name: 'priority', label: 'Ưu tiên', type: 'select', options: [{ value: 'low', label: 'Thấp' }, { value: 'medium', label: 'Trung bình' }, { value: 'high', label: 'Cao' }] },
            { name: 'employeeId', label: 'Nhân viên', type: 'select', options: empOpts, colSpan: 2 },
            { name: 'description', label: 'Mô tả', type: 'textarea' }
          ]}
        />
      }
    >
      <SimpleTable columns={columns} rows={rows} emptyText='Chưa có nhu cầu đào tạo nào.' />
    </PageContainer>
  );
}
