import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { EntityFormDialog } from '@/features/hr/common/entity-form-dialog';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import { PAYROLL_RUN_STATUS_LABEL } from '@/features/hr/payroll/constants';
import { RunActions } from '@/features/hr/payroll/run-actions';
import { createPayrollRun, listPayrollRuns } from '@/features/hr/payroll/runs';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';

export const metadata = { title: 'HRM: Kỳ lương & chốt lương' };

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  draft: 'outline',
  previewed: 'secondary',
  locked: 'secondary',
  approved: 'default',
  paid: 'default'
};

type Row = Awaited<ReturnType<typeof listPayrollRuns>>[number];

export default async function PayrollRunsPage() {
  const role = await getCurrentRole();
  if (!roleAtLeast(role, 'hr')) {
    return (
      <PageContainer
        pageTitle='Kỳ lương & chốt lương'
        access={false}
        accessFallback={
          <div className='text-muted-foreground text-center text-lg'>
            Bạn cần quyền HR trở lên để xem và vận hành kỳ lương.
          </div>
        }
      >
        <div />
      </PageContainer>
    );
  }

  const rows = await listPayrollRuns();

  const columns: Column<Row>[] = [
    { header: 'Kỳ lương', cell: (row) => row.period, className: 'font-medium' },
    { header: 'Tên kỳ lương', cell: (row) => row.name },
    {
      header: 'Trạng thái',
      cell: (row) => (
        <Badge variant={STATUS_VARIANT[row.status] ?? 'outline'}>
          {PAYROLL_RUN_STATUS_LABEL[row.status] ?? row.status}
        </Badge>
      )
    },
    {
      header: 'Preview gần nhất',
      cell: (row) =>
        row.status === 'previewed' ||
        row.status === 'locked' ||
        row.status === 'approved' ||
        row.status === 'paid'
          ? new Date(row.updatedAt).toLocaleString('vi-VN')
          : '—'
    },
    {
      header: 'Chốt lúc',
      cell: (row) => (row.lockedAt ? new Date(row.lockedAt).toLocaleString('vi-VN') : '—')
    },
    { header: '', cell: (row) => <RunActions id={row.id} status={row.status} /> }
  ];

  return (
    <PageContainer
      pageTitle='Kỳ lương & chốt lương'
      pageDescription='Luồng payroll chuẩn của hệ thống là Nháp -> Preview -> Chốt -> Duyệt. Forecast theo ngày chỉ để tham khảo và không thay thế bước chốt kỳ lương.'
      pageHeaderAction={
        <EntityFormDialog
          triggerLabel='Tạo kỳ lương'
          title='Tạo kỳ lương mới'
          description='Mỗi kỳ lương là một lần snapshot dữ liệu công và lương để HR preview, chốt và trình duyệt.'
          action={createPayrollRun}
          fields={[
            { name: 'period', label: 'Kỳ lương (YYYY-MM)', required: true, placeholder: '2026-07' },
            { name: 'name', label: 'Tên kỳ lương' }
          ]}
          successMessage='Đã tạo kỳ lương'
        />
      }
    >
      <SimpleTable
        columns={columns}
        rows={rows}
        emptyText='Chưa có kỳ lương nào. Hãy tạo kỳ lương mới để preview hoặc chốt bảng lương.'
      />
    </PageContainer>
  );
}
