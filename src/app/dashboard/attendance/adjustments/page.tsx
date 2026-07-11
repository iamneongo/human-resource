import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { ApprovalActions } from '@/features/hr/common/approval-actions';
import { EntityFormDialog } from '@/features/hr/common/entity-form-dialog';
import { employeeOptions } from '@/features/hr/common/lookups';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import {
  approveAdjustment,
  createAdjustment,
  listAdjustments,
  rejectAdjustment
} from '@/features/hr/attendance/adjustments';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';

export const metadata = { title: 'HRM: Xử lý bất thường' };

const STATUS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Chờ duyệt', variant: 'outline' },
  approved: { label: 'Đã duyệt', variant: 'default' },
  rejected: { label: 'Từ chối', variant: 'destructive' },
  cancelled: { label: 'Đã huỷ', variant: 'secondary' }
};

type Row = Awaited<ReturnType<typeof listAdjustments>>[number];

export default async function AdjustmentsPage() {
  const role = await getCurrentRole();
  if (!roleAtLeast(role, 'manager')) {
    return <PageContainer pageTitle='Xử lý bất thường' access={false}><div /></PageContainer>;
  }
  const rows = await listAdjustments();
  const canApprove = roleAtLeast(role, 'manager');
  const empOpts = roleAtLeast(role, 'hr') ? await employeeOptions() : [];

  const columns: Column<Row>[] = [
    { header: 'Ngày', cell: (r) => r.workDate, className: 'font-medium' },
    { header: 'Nhân viên', cell: (r) => r.employeeName ?? '—' },
    { header: 'Lý do giải trình', cell: (r) => r.reason },
    {
      header: 'Trạng thái',
      cell: (r) => {
        const s = STATUS[r.status] ?? { label: r.status, variant: 'outline' as const };
        return <Badge variant={s.variant}>{s.label}</Badge>;
      }
    },
    ...(canApprove
      ? [
          {
            header: '',
            cell: (r: Row) => (
              <ApprovalActions
                id={r.id}
                status={r.status}
                approve={approveAdjustment}
                reject={rejectAdjustment}
              />
            )
          }
        ]
      : [])
  ];

  return (
    <PageContainer
      pageTitle='Xử lý bất thường'
      pageDescription='Nhân viên giải trình quên chấm công / đi muộn / về sớm; quản lý phê duyệt điều chỉnh dữ liệu công.'
      pageHeaderAction={
        <EntityFormDialog
          triggerLabel='Tạo giải trình'
          title='Giải trình / điều chỉnh công'
          action={createAdjustment}
          fields={[
            ...(empOpts.length
              ? [{ name: 'employeeId', label: 'Nhân viên', type: 'select' as const, options: empOpts, colSpan: 2 as const }]
              : []),
            { name: 'workDate', label: 'Ngày công', type: 'date', required: true },
            { name: 'requestedCheckIn', label: 'Giờ vào đề xuất (HH:MM)', placeholder: '08:00' },
            { name: 'requestedCheckOut', label: 'Giờ ra đề xuất (HH:MM)', placeholder: '17:00' },
            { name: 'reason', label: 'Lý do', type: 'textarea', required: true }
          ]}
        />
      }
    >
      <SimpleTable columns={columns} rows={rows} emptyText='Chưa có giải trình nào.' />
    </PageContainer>
  );
}
