import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { EntityFormDialog } from '@/features/hr/common/entity-form-dialog';
import { employeeOptions } from '@/features/hr/common/lookups';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import { AdvanceButton } from '@/features/hr/offboarding/advance-button';
import { OFFBOARDING_FLOW } from '@/features/hr/offboarding/constants';
import {
  createOffboarding,
  listOffboardings
} from '@/features/hr/offboarding/actions';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';

export const metadata = { title: 'HRM: Thôi việc (Offboarding)' };

const STATUS_LABEL: Record<string, string> = {
  submitted: 'Đã nộp đơn',
  approving: 'Đang phê duyệt',
  asset_handover: 'Bàn giao tài sản',
  work_handover: 'Bàn giao công việc',
  settled: 'Quyết toán',
  completed: 'Hoàn tất'
};

type Row = Awaited<ReturnType<typeof listOffboardings>>[number];

export default async function OffboardingPage() {
  const role = await getCurrentRole();
  if (!roleAtLeast(role, 'manager')) {
    return <PageContainer pageTitle='Thôi việc (Offboarding)' access={false}><div /></PageContainer>;
  }
  const rows = await listOffboardings();
  const canManage = roleAtLeast(role, 'hr');
  const empOpts = canManage ? await employeeOptions() : [];

  const columns: Column<Row>[] = [
    { header: 'Nhân viên', cell: (r) => `${r.employeeCode ?? ''} ${r.employeeName ?? ''}`, className: 'font-medium' },
    { header: 'Ngày nộp đơn', cell: (r) => r.resignationDate },
    { header: 'Ngày nghỉ dự kiến', cell: (r) => r.expectedLeaveDate },
    { header: 'Lý do', cell: (r) => r.reason ?? '—' },
    {
      header: 'Trạng thái',
      cell: (r) => (
        <Badge variant={r.status === 'completed' ? 'default' : 'secondary'}>
          {STATUS_LABEL[r.status] ?? r.status}
        </Badge>
      )
    },
    ...(canManage
      ? [
          {
            header: '',
            cell: (r: Row) => (
              <AdvanceButton
                id={r.id}
                disabled={
                  r.status ===
                  OFFBOARDING_FLOW[OFFBOARDING_FLOW.length - 1]
                }
              />
            )
          }
        ]
      : [])
  ];

  return (
    <PageContainer
      pageTitle='Thôi việc (Offboarding)'
      pageDescription='Quản lý quy trình nghỉ việc: phê duyệt, bàn giao tài sản/công việc và quyết toán.'
      pageHeaderAction={
        canManage ? (
          <EntityFormDialog
            triggerLabel='Tạo hồ sơ nghỉ việc'
            title='Tạo hồ sơ thôi việc'
            action={createOffboarding}
            fields={[
              { name: 'employeeId', label: 'Nhân viên', type: 'select', options: empOpts, required: true, colSpan: 2 },
              { name: 'resignationDate', label: 'Ngày nộp đơn', type: 'date', required: true },
              { name: 'expectedLeaveDate', label: 'Ngày nghỉ dự kiến', type: 'date', required: true },
              { name: 'reason', label: 'Lý do', type: 'textarea' }
            ]}
          />
        ) : undefined
      }
    >
      <SimpleTable columns={columns} rows={rows} emptyText='Chưa có hồ sơ thôi việc nào.' />
    </PageContainer>
  );
}
