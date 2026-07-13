import PageContainer from '@/components/layout/page-container';
import { EntityFormDialog } from '@/features/hr/common/entity-form-dialog';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import { StatusBadge } from '@/features/hr/common/status-badge';
import { employeeOptions } from '@/features/hr/common/lookups';
import { createAsset, listAssets } from '@/features/hr/assets/actions';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';

export const metadata = { title: 'HRM: Quản lý tài sản' };

const TYPE_LABEL: Record<string, string> = {
  laptop: 'Laptop',
  device: 'Thiết bị',
  uniform: 'Đồng phục',
  other: 'Khác'
};

type Row = Awaited<ReturnType<typeof listAssets>>[number];

export default async function AssetsPage() {
  const role = await getCurrentRole();
  if (!roleAtLeast(role, 'manager')) {
    return (
      <PageContainer pageTitle='Quản lý tài sản' access={false}>
        <div />
      </PageContainer>
    );
  }

  const canEdit = roleAtLeast(role, 'hr');
  const [rows, empOpts] = await Promise.all([
    listAssets(),
    canEdit ? employeeOptions() : Promise.resolve([])
  ]);

  const columns: Column<Row>[] = [
    { header: 'Mã tài sản', cell: (r) => r.assetCode ?? '—', className: 'font-mono text-xs' },
    { header: 'Tên tài sản', cell: (r) => r.name },
    { header: 'Loại', cell: (r) => TYPE_LABEL[r.type] ?? r.type },
    { header: 'Nhân viên', cell: (r) => r.employeeName ?? '—' },
    { header: 'Ngày cấp', cell: (r) => r.issueDate ?? '—' },
    { header: 'Ngày trả', cell: (r) => r.returnDate ?? '—' },
    { header: 'Trạng thái', cell: (r) => <StatusBadge status={r.status} /> }
  ];

  return (
    <PageContainer
      pageTitle='Quản lý tài sản'
      pageDescription='Theo dõi tài sản cấp phát cho nhân viên'
      pageHeaderAction={
        canEdit ? (
          <EntityFormDialog
            triggerLabel='Cấp phát tài sản'
            title='Cấp phát tài sản'
            action={createAsset}
            fields={[
              {
                name: 'employeeId',
                label: 'Nhân viên',
                type: 'select',
                options: empOpts,
                colSpan: 2
              },
              { name: 'name', label: 'Tên tài sản', required: true },
              { name: 'assetCode', label: 'Mã tài sản' },
              {
                name: 'type',
                label: 'Loại',
                type: 'select',
                required: true,
                options: Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label }))
              },
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
