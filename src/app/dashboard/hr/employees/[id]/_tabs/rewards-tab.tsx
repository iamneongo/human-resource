import { EntityFormDialog } from '@/features/hr/common/entity-form-dialog';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import { StatusBadge } from '@/features/hr/common/status-badge';
import { createReward } from '@/features/hr/rewards/actions';
import { getEmployeeRewards } from '@/features/hr/employees/actions';

const TYPE_OPTS = [
  { value: 'reward', label: 'Khen thưởng' },
  { value: 'discipline', label: 'Kỷ luật' }
];

type Row = Awaited<ReturnType<typeof getEmployeeRewards>>[number];

export async function RewardsTab({
  employeeId,
  canEdit
}: {
  employeeId: string;
  canEdit: boolean;
}) {
  const rows = await getEmployeeRewards(employeeId);

  async function addReward(v: Record<string, string>) {
    'use server';
    return createReward({ ...v, employeeId });
  }

  const cols: Column<Row>[] = [
    { header: 'Loại', cell: (r) => <StatusBadge status={r.type} /> },
    { header: 'Tiêu đề', cell: (r) => r.title, className: 'font-medium' },
    { header: 'Số quyết định', cell: (r) => r.decisionNumber ?? '—' },
    { header: 'Ngày quyết định', cell: (r) => r.decisionDate },
    { header: 'Hình thức / Giá trị', cell: (r) => r.formOrValue ?? '—' },
    { header: 'Mô tả', cell: (r) => r.description ?? '—' }
  ];

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <p className='text-muted-foreground text-sm'>{rows.length} quyết định</p>
        {canEdit && (
          <EntityFormDialog
            triggerLabel='Thêm quyết định'
            title='Thêm khen thưởng / Kỷ luật'
            action={addReward}
            fields={[
              { name: 'type', label: 'Loại', type: 'select', required: true, options: TYPE_OPTS },
              { name: 'title', label: 'Tiêu đề', required: true },
              { name: 'decisionNumber', label: 'Số quyết định' },
              { name: 'decisionDate', label: 'Ngày quyết định', type: 'date', required: true },
              { name: 'formOrValue', label: 'Hình thức / Giá trị' },
              { name: 'description', label: 'Mô tả chi tiết', type: 'textarea', colSpan: 2 }
            ]}
          />
        )}
      </div>
      <SimpleTable columns={cols} rows={rows} emptyText='Chưa có khen thưởng hoặc kỷ luật.' />
    </div>
  );
}
