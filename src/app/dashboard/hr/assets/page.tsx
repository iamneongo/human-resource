import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { EntityFormDialog } from '@/features/hr/common/entity-form-dialog';
import { employeeOptions } from '@/features/hr/common/lookups';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import { createAsset, listAssets } from '@/features/hr/assets/actions';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';

export const metadata = { title: 'HRM: Tài sản cấp phát' };

const TYPE_LABEL: Record<string, string> = {
  laptop: 'Laptop',
  device: 'Thiết bị',
  uniform: 'Đồng phục',
  other: 'Khác'
};
const STATUS_LABEL: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  assigned: { label: 'Đã cấp phát', variant: 'default' },
  returned: { label: 'Đã thu hồi', variant: 'secondary' },
  lost: { label: 'Mất/hỏng', variant: 'destructive' }
};

type Row = Awaited<ReturnType<typeof listAssets>>[number];

export default async function AssetsPage() {
  const role = await getCurrentRole();
  if (!roleAtLeast(role, 'manager')) {
    return <PageContainer pageTitle='Tài sản cấp phát' access={false}><div /></PageContainer>;
  }
  const rows = await listAssets();
  const canCreate = roleAtLeast(role, 'hr');
  const empOpts = canCreate ? await employeeOptions() : [];

  const columns: Column<Row>[] = [
    { header: 'Tên tài sản', cell: (r) => r.name, className: 'font-medium' },
    { header: 'Loại', cell: (r) => TYPE_LABEL[r.type] ?? r.type },
    { header: 'Mã TS', cell: (r) => r.assetCode ?? '—' },
    { header: 'Nhân viên', cell: (r) => r.employeeName ?? '—' },
    { header: 'Ngày cấp', cell: (r) => r.issueDate ?? '—' },
    {
      header: 'Trạng thái',
      cell: (r) => {
        const s = STATUS_LABEL[r.status] ?? { label: r.status, variant: 'secondary' as const };
        return <Badge variant={s.variant}>{s.label}</Badge>;
      }
    }
  ];

  return (
    <PageContainer
      pageTitle='Tài sản cấp phát'
      pageDescription='Theo dõi máy tính, thiết bị, đồng phục cấp phát; quản lý bàn giao và thu hồi.'
      pageHeaderAction={
        canCreate ? (
          <EntityFormDialog
            triggerLabel='Thêm tài sản'
            title='Cấp phát tài sản'
            action={createAsset}
            fields={[
              { name: 'name', label: 'Tên tài sản', required: true, colSpan: 2 },
              { name: 'type', label: 'Loại', type: 'select', required: true, options: Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label })) },
              { name: 'assetCode', label: 'Mã tài sản' },
              { name: 'employeeId', label: 'Cấp cho nhân viên', type: 'select', options: empOpts, colSpan: 2 },
              { name: 'issueDate', label: 'Ngày cấp', type: 'date' }
            ]}
          />
        ) : undefined
      }
    >
      <SimpleTable columns={columns} rows={rows} emptyText='Chưa có tài sản nào.' />
    </PageContainer>
  );
}
