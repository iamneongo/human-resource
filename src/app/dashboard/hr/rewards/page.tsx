import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { EntityFormDialog } from '@/features/hr/common/entity-form-dialog';
import { employeeOptions } from '@/features/hr/common/lookups';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import { createReward, listRewards } from '@/features/hr/rewards/actions';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';

export const metadata = { title: 'HRM: Khen thưởng / Kỷ luật' };

type Row = Awaited<ReturnType<typeof listRewards>>[number];

export default async function RewardsPage() {
  const role = await getCurrentRole();
  if (!roleAtLeast(role, 'manager')) {
    return <PageContainer pageTitle='Khen thưởng / Kỷ luật' access={false}><div /></PageContainer>;
  }
  const rows = await listRewards();
  const canCreate = roleAtLeast(role, 'hr');
  const empOpts = canCreate ? await employeeOptions() : [];

  const columns: Column<Row>[] = [
    {
      header: 'Loại',
      cell: (r) =>
        r.type === 'reward' ? (
          <Badge variant='default'>Khen thưởng</Badge>
        ) : (
          <Badge variant='destructive'>Kỷ luật</Badge>
        )
    },
    { header: 'Tiêu đề', cell: (r) => r.title, className: 'font-medium' },
    { header: 'Nhân viên', cell: (r) => r.employeeName ?? '—' },
    { header: 'Số QĐ', cell: (r) => r.decisionNumber ?? '—' },
    { header: 'Ngày QĐ', cell: (r) => r.decisionDate },
    { header: 'Hình thức/Giá trị', cell: (r) => r.formOrValue ?? '—' }
  ];

  return (
    <PageContainer
      pageTitle='Khen thưởng / Kỷ luật'
      pageDescription='Cập nhật quyết định khen thưởng, kỷ luật; lưu vết vào hồ sơ nhân sự phục vụ xét thăng tiến.'
      pageHeaderAction={
        canCreate ? (
          <EntityFormDialog
            triggerLabel='Thêm quyết định'
            title='Thêm khen thưởng / kỷ luật'
            action={createReward}
            fields={[
              { name: 'employeeId', label: 'Nhân viên', type: 'select', options: empOpts, required: true, colSpan: 2 },
              { name: 'type', label: 'Loại', type: 'select', required: true, options: [{ value: 'reward', label: 'Khen thưởng' }, { value: 'discipline', label: 'Kỷ luật' }] },
              { name: 'decisionNumber', label: 'Số quyết định' },
              { name: 'title', label: 'Tiêu đề', required: true, colSpan: 2 },
              { name: 'decisionDate', label: 'Ngày quyết định', type: 'date', required: true },
              { name: 'formOrValue', label: 'Hình thức / Giá trị' },
              { name: 'description', label: 'Mô tả', type: 'textarea' }
            ]}
          />
        ) : undefined
      }
    >
      <SimpleTable columns={columns} rows={rows} emptyText='Chưa có quyết định nào.' />
    </PageContainer>
  );
}
