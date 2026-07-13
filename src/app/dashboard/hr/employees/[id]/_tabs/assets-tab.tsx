import { EntityFormDialog } from '@/features/hr/common/entity-form-dialog';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import { StatusBadge } from '@/features/hr/common/status-badge';
import { createAsset, returnAssetForm } from '@/features/hr/assets/actions';
import { getEmployeeAssets } from '@/features/hr/employees/actions';

const ASSET_TYPE_OPTS = [
  { value: 'laptop', label: 'Laptop' },
  { value: 'device', label: 'Thiết bị' },
  { value: 'uniform', label: 'Đồng phục' },
  { value: 'other', label: 'Khác' }
];

const ASSET_TYPE: Record<string, string> = Object.fromEntries(
  ASSET_TYPE_OPTS.map((o) => [o.value, o.label])
);

type Row = Awaited<ReturnType<typeof getEmployeeAssets>>[number];

export async function AssetsTab({ employeeId, canEdit }: { employeeId: string; canEdit: boolean }) {
  const rows = await getEmployeeAssets(employeeId);

  async function addAsset(v: Record<string, string>) {
    'use server';
    return createAsset({ ...v, employeeId });
  }

  const cols: Column<Row>[] = [
    { header: 'Mã', cell: (r) => r.assetCode ?? '—', className: 'font-medium' },
    { header: 'Tên tài sản', cell: (r) => r.name },
    { header: 'Loại', cell: (r) => ASSET_TYPE[r.type] ?? r.type },
    { header: 'Ngày cấp', cell: (r) => r.issueDate ?? '—' },
    { header: 'Ngày trả', cell: (r) => r.returnDate ?? '—' },
    { header: 'Trạng thái', cell: (r) => <StatusBadge status={r.status} /> },
    ...(canEdit
      ? [
          {
            header: '',
            cell: (r: Row) =>
              r.status === 'assigned' ? (
                <EntityFormDialog
                  mode='edit'
                  title={`Thu hồi: ${r.name}`}
                  action={returnAssetForm.bind(null, r.id)}
                  defaults={{ returnDate: new Date().toISOString().slice(0, 10) }}
                  fields={[
                    {
                      name: 'returnDate',
                      label: 'Ngày thu hồi',
                      type: 'date' as const,
                      required: true
                    }
                  ]}
                />
              ) : null
          }
        ]
      : [])
  ];

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <p className='text-muted-foreground text-sm'>{rows.length} tài sản</p>
        {canEdit && (
          <EntityFormDialog
            triggerLabel='Cấp phát tài sản'
            title='Cấp phát tài sản / BHLD'
            action={addAsset}
            fields={[
              { name: 'assetCode', label: 'Mã tài sản' },
              { name: 'name', label: 'Tên tài sản', required: true },
              {
                name: 'type',
                label: 'Loại',
                type: 'select',
                required: true,
                options: ASSET_TYPE_OPTS
              },
              { name: 'issueDate', label: 'Ngày cấp', type: 'date' },
              { name: 'note', label: 'Ghi chú', colSpan: 2 }
            ]}
          />
        )}
      </div>
      <SimpleTable columns={cols} rows={rows} emptyText='Chưa cấp phát tài sản / BHLD.' />
    </div>
  );
}
