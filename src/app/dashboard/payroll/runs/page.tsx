import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { EntityFormDialog } from '@/features/hr/common/entity-form-dialog';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import { PAYROLL_RUN_STATUS_LABEL } from '@/features/hr/payroll/constants';
import { RunActions } from '@/features/hr/payroll/run-actions';
import { createPayrollRun, listPayrollRuns } from '@/features/hr/payroll/runs';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';

export const metadata = { title: 'HRM: Chốt bảng lương' };

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  draft: 'outline',
  locked: 'secondary',
  approved: 'default',
  paid: 'default'
};

type Row = Awaited<ReturnType<typeof listPayrollRuns>>[number];

export default async function PayrollRunsPage() {
  const role = await getCurrentRole();
  if (!roleAtLeast(role, 'hr')) {
    return <PageContainer pageTitle='Chốt bảng lương' access={false}><div /></PageContainer>;
  }
  const rows = await listPayrollRuns();

  const columns: Column<Row>[] = [
    { header: 'Kỳ', cell: (r) => r.period, className: 'font-medium' },
    { header: 'Tên bảng lương', cell: (r) => r.name },
    {
      header: 'Trạng thái',
      cell: (r) => (
        <Badge variant={STATUS_VARIANT[r.status] ?? 'outline'}>
          {PAYROLL_RUN_STATUS_LABEL[r.status] ?? r.status}
        </Badge>
      )
    },
    { header: 'Chốt lúc', cell: (r) => (r.lockedAt ? new Date(r.lockedAt).toLocaleString('vi-VN') : '—') },
    { header: '', cell: (r) => <RunActions id={r.id} status={r.status} /> }
  ];

  return (
    <PageContainer
      pageTitle='Chốt bảng lương'
      pageDescription='Tạo kỳ lương → “Tính & chốt” để engine sinh phiếu lương (lương + phụ cấp + OT − BHXH − thuế TNCN) → Admin duyệt.'
      pageHeaderAction={
        <EntityFormDialog
          triggerLabel='Tạo kỳ lương'
          title='Tạo kỳ lương mới'
          action={createPayrollRun}
          fields={[
            { name: 'period', label: 'Kỳ lương (YYYY-MM)', required: true, placeholder: '2026-07' },
            { name: 'name', label: 'Tên bảng lương' }
          ]}
        />
      }
    >
      <SimpleTable columns={columns} rows={rows} emptyText='Chưa có kỳ lương nào.' />
    </PageContainer>
  );
}
