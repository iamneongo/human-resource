import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { ApprovalActions } from '@/features/hr/common/approval-actions';
import { EntityFormDialog } from '@/features/hr/common/entity-form-dialog';
import { employeeOptions } from '@/features/hr/common/lookups';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import {
  approveLeave,
  createLeave,
  listLeaves,
  rejectLeave
} from '@/features/hr/attendance/leaves';
import { getCurrentEmployeeId, getCurrentRole, roleAtLeast } from '@/lib/rbac';

export const metadata = { title: 'HRM: Nghỉ phép' };

const TYPE_LABEL: Record<string, string> = {
  annual: 'Phép năm',
  sick: 'Nghỉ ốm',
  maternity: 'Thai sản',
  unpaid: 'Không lương',
  other: 'Khác'
};
const STATUS: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  pending: { label: 'Chờ duyệt', variant: 'outline' },
  approved: { label: 'Đã duyệt', variant: 'default' },
  rejected: { label: 'Từ chối', variant: 'destructive' },
  cancelled: { label: 'Đã huỷ', variant: 'secondary' }
};

type Row = Awaited<ReturnType<typeof listLeaves>>[number];

export default async function LeavesPage() {
  const role = await getCurrentRole();
  if (!role) {
    return (
      <PageContainer pageTitle='Nghỉ phép' access={false}>
        <div />
      </PageContainer>
    );
  }
  const isManager = roleAtLeast(role, 'manager');
  const selfId = isManager ? undefined : await getCurrentEmployeeId();
  if (!isManager && !selfId) {
    return (
      <PageContainer
        pageTitle='Nghỉ phép'
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
  const rows = await listLeaves(selfId ?? undefined);
  const canApprove = isManager;
  const empOpts = roleAtLeast(role, 'hr') ? await employeeOptions() : [];

  const columns: Column<Row>[] = [
    { header: 'Loại', cell: (r) => TYPE_LABEL[r.type] ?? r.type, className: 'font-medium' },
    { header: 'Nhân viên', cell: (r) => r.employeeName ?? '—' },
    { header: 'Từ ngày', cell: (r) => r.startDate },
    { header: 'Đến ngày', cell: (r) => r.endDate },
    { header: 'Số ngày', cell: (r) => r.days },
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
                approve={approveLeave}
                reject={rejectLeave}
              />
            )
          }
        ]
      : [])
  ];

  return (
    <PageContainer
      pageTitle='Nghỉ phép'
      pageHeaderAction={
        <EntityFormDialog
          triggerLabel='Đăng ký nghỉ'
          title='Đăng ký nghỉ phép'
          action={createLeave}
          defaults={{ type: 'annual' }}
          fields={[
            ...(empOpts.length
              ? [
                  {
                    name: 'employeeId',
                    label: 'Nhân viên',
                    type: 'select' as const,
                    options: empOpts,
                    colSpan: 2 as const
                  }
                ]
              : []),
            {
              name: 'type',
              label: 'Loại phép',
              type: 'select',
              required: true,
              options: Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label }))
            },
            { name: 'startDate', label: 'Từ ngày', type: 'date', required: true },
            { name: 'endDate', label: 'Đến ngày', type: 'date', required: true },
            { name: 'reason', label: 'Lý do', type: 'textarea' }
          ]}
        />
      }
    >
      <SimpleTable columns={columns} rows={rows} emptyText='Chưa có đơn nghỉ nào.' />
    </PageContainer>
  );
}
