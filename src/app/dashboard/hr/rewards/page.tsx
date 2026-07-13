import PageContainer from '@/components/layout/page-container';
import { EntityFormDialog } from '@/features/hr/common/entity-form-dialog';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import { StatusBadge } from '@/features/hr/common/status-badge';
import { employeeOptions } from '@/features/hr/common/lookups';
import { createReward, listRewards } from '@/features/hr/rewards/actions';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';

export const metadata = { title: 'HRM: Khen thưởng / Kỷ luật' };

type Row = Awaited<ReturnType<typeof listRewards>>[number];

export default async function RewardsPage() {
  const role = await getCurrentRole();
  if (!roleAtLeast(role, 'manager')) {
    return (
      <PageContainer pageTitle='Khen thưởng / Kỷ luật' access={false}>
        <div />
      </PageContainer>
    );
  }

  const canEdit = roleAtLeast(role, 'hr');
  const [rows, empOpts] = await Promise.all([
    listRewards(),
    canEdit ? employeeOptions() : Promise.resolve([])
  ]);

  const columns: Column<Row>[] = [
    { header: 'Loại', cell: (r) => <StatusBadge status={r.type} /> },
    { header: 'Nhân viên', cell: (r) => r.employeeName ?? '—' },
    { header: 'Tiêu đề', cell: (r) => r.title },
    { header: 'Số quyết định', cell: (r) => r.decisionNumber ?? '—' },
    { header: 'Ngày quyết định', cell: (r) => r.decisionDate },
    { header: 'Hình thức / Giá trị', cell: (r) => r.formOrValue ?? '—' }
  ];

  return (
    <PageContainer
      pageTitle='Khen thưởng / Kỷ luật'
      pageDescription='Quản lý quyết định khen thưởng và kỷ luật'
      pageHeaderAction={
        canEdit ? (
          <EntityFormDialog
            triggerLabel='Thêm quyết định'
            title='Thêm khen thưởng / kỷ luật'
            action={createReward}
            fields={[
              {
                name: 'employeeId',
                label: 'Nhân viên',
                type: 'select',
                options: empOpts,
                required: true,
                colSpan: 2
              },
              {
                name: 'type',
                label: 'Loại',
                type: 'select',
                required: true,
                options: [
                  { value: 'reward', label: 'Khen thưởng' },
                  { value: 'discipline', label: 'Kỷ luật' }
                ]
              },
              { name: 'title', label: 'Tiêu đề', required: true },
              { name: 'decisionNumber', label: 'Số quyết định' },
              { name: 'decisionDate', label: 'Ngày quyết định', type: 'date', required: true },
              { name: 'formOrValue', label: 'Hình thức / Giá trị' },
              { name: 'description', label: 'Mô tả chi tiết', type: 'textarea', colSpan: 2 }
            ]}
          />
        ) : undefined
      }
    >
      <SimpleTable columns={columns} rows={rows} emptyText='Chưa có quyết định nào.' />
    </PageContainer>
  );
}
