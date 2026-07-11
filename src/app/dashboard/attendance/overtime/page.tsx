import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { ApprovalActions } from '@/features/hr/common/approval-actions';
import { EntityFormDialog } from '@/features/hr/common/entity-form-dialog';
import { employeeOptions } from '@/features/hr/common/lookups';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import {
  approveOvertime,
  createOvertime,
  listOvertime,
  rejectOvertime
} from '@/features/hr/attendance/overtime';
import { getCurrentEmployeeId, getCurrentRole, roleAtLeast } from '@/lib/rbac';

export const metadata = { title: 'HRM: Làm thêm giờ (OT)' };

const KIND_LABEL: Record<string, string> = {
  weekday: 'Ngày thường',
  weekend: 'Cuối tuần',
  holiday: 'Ngày lễ'
};
const STATUS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Chờ duyệt', variant: 'outline' },
  approved: { label: 'Đã duyệt', variant: 'default' },
  rejected: { label: 'Từ chối', variant: 'destructive' },
  cancelled: { label: 'Đã huỷ', variant: 'secondary' }
};

type Row = Awaited<ReturnType<typeof listOvertime>>[number];

export default async function OvertimePage() {
  const role = await getCurrentRole();
  if (!role) {
    return <PageContainer pageTitle='Làm thêm giờ (OT)' access={false}><div /></PageContainer>;
  }
  const isManager = roleAtLeast(role, 'manager');
  const selfId = isManager ? undefined : await getCurrentEmployeeId();
  if (!isManager && !selfId) {
    return (
      <PageContainer
        pageTitle='Làm thêm giờ (OT)'
        access={false}
        accessFallback={
          <div className='text-muted-foreground text-center text-lg'>
            Tài khoản của bạn chưa được liên kết với hồ sơ nhân viên. Vui lòng liên hệ HR.
          </div>
        }
      >
        <div />
      </PageContainer>
    );
  }
  const rows = await listOvertime(selfId ?? undefined);
  const canApprove = isManager;
  const empOpts = roleAtLeast(role, 'hr') ? await employeeOptions() : [];

  const columns: Column<Row>[] = [
    { header: 'Ngày', cell: (r) => r.workDate, className: 'font-medium' },
    { header: 'Nhân viên', cell: (r) => r.employeeName ?? '—' },
    { header: 'Loại', cell: (r) => KIND_LABEL[r.kind] ?? r.kind },
    { header: 'Số giờ', cell: (r) => r.hours ?? '—' },
    { header: 'Hệ số', cell: (r) => `×${r.coefficient}` },
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
                approve={approveOvertime}
                reject={rejectOvertime}
              />
            )
          }
        ]
      : [])
  ];

  return (
    <PageContainer
      pageTitle='Làm thêm giờ (OT)'
      pageDescription='Đăng ký & phê duyệt OT; tự động tính hệ số theo luật (ngày thường ×1.5, cuối tuần ×2, lễ ×3).'
      pageHeaderAction={
        <EntityFormDialog
          triggerLabel='Đăng ký OT'
          title='Đăng ký làm thêm giờ'
          action={createOvertime}
          defaults={{ kind: 'weekday' }}
          fields={[
            ...(empOpts.length
              ? [{ name: 'employeeId', label: 'Nhân viên', type: 'select' as const, options: empOpts, colSpan: 2 as const }]
              : []),
            { name: 'workDate', label: 'Ngày OT', type: 'date', required: true },
            { name: 'kind', label: 'Loại ngày', type: 'select', required: true, options: Object.entries(KIND_LABEL).map(([value, label]) => ({ value, label })) },
            { name: 'fromTime', label: 'Từ (HH:MM)', required: true, placeholder: '18:00' },
            { name: 'toTime', label: 'Đến (HH:MM)', required: true, placeholder: '20:00' },
            { name: 'reason', label: 'Lý do', type: 'textarea' }
          ]}
        />
      }
    >
      <SimpleTable columns={columns} rows={rows} emptyText='Chưa có đăng ký OT nào.' />
    </PageContainer>
  );
}
