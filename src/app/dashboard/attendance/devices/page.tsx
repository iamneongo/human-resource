import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { EntityFormDialog } from '@/features/hr/common/entity-form-dialog';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import { createDevice, listDevices } from '@/features/hr/attendance/devices';
import { SyncButton } from '@/features/hr/attendance/sync-button';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';

export const metadata = { title: 'HRM: Thiết bị chấm công' };

type Row = Awaited<ReturnType<typeof listDevices>>[number];

export default async function DevicesPage() {
  const role = await getCurrentRole();
  if (!roleAtLeast(role, 'manager')) {
    return <PageContainer pageTitle='Thiết bị chấm công' access={false}><div /></PageContainer>;
  }
  const rows = await listDevices();
  const canManage = roleAtLeast(role, 'hr');

  const columns: Column<Row>[] = [
    { header: 'Mã', cell: (r) => r.code, className: 'font-medium' },
    { header: 'Tên thiết bị', cell: (r) => r.name },
    { header: 'Vị trí', cell: (r) => r.location ?? '—' },
    { header: 'Loại', cell: (r) => r.kind ?? '—' },
    {
      header: 'Trạng thái',
      cell: (r) =>
        r.isActive ? (
          <Badge variant='default'>Hoạt động</Badge>
        ) : (
          <Badge variant='secondary'>Tạm dừng</Badge>
        )
    },
    {
      header: 'Đồng bộ gần nhất',
      cell: (r) =>
        r.lastSyncAt ? new Date(r.lastSyncAt).toLocaleString('vi-VN') : 'Chưa'
    },
    ...(canManage
      ? [{ header: '', cell: (r: Row) => <SyncButton id={r.id} /> }]
      : [])
  ];

  return (
    <PageContainer
      pageTitle='Thiết bị chấm công'
      pageDescription='Kết nối máy chấm công vân tay / thẻ từ / FaceID; đồng bộ dữ liệu thô về hệ thống.'
      pageHeaderAction={
        canManage ? (
          <EntityFormDialog
            triggerLabel='Thêm thiết bị'
            title='Thêm thiết bị chấm công'
            action={createDevice}
            fields={[
              { name: 'code', label: 'Mã thiết bị', required: true },
              { name: 'name', label: 'Tên thiết bị', required: true },
              { name: 'location', label: 'Vị trí' },
              { name: 'ipAddress', label: 'Địa chỉ IP' },
              { name: 'kind', label: 'Loại', type: 'select', options: [
                { value: 'fingerprint', label: 'Vân tay' },
                { value: 'card', label: 'Thẻ từ' },
                { value: 'faceid', label: 'FaceID' }
              ] }
            ]}
          />
        ) : undefined
      }
    >
      <SimpleTable columns={columns} rows={rows} emptyText='Chưa có thiết bị nào.' />
    </PageContainer>
  );
}
