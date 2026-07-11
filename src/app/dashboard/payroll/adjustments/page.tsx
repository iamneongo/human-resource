import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { EntityFormDialog } from '@/features/hr/common/entity-form-dialog';
import { employeeOptions } from '@/features/hr/common/lookups';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import {
  createSalaryAdjustment,
  listSalaryAdjustments
} from '@/features/hr/payroll/salary-adjustments';
import { SALARY_ADJUSTMENT_LABEL } from '@/features/hr/payroll/constants';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';

export const metadata = { title: 'HRM: Biến động lương' };

const vnd = (n: string) => Number(n).toLocaleString('vi-VN') + ' ₫';
type Row = Awaited<ReturnType<typeof listSalaryAdjustments>>[number];

export default async function PayrollAdjustmentsPage() {
  const role = await getCurrentRole();
  if (!roleAtLeast(role, 'hr')) {
    return <PageContainer pageTitle='Biến động lương' access={false}><div /></PageContainer>;
  }
  const rows = await listSalaryAdjustments();
  const empOpts = await employeeOptions();

  const columns: Column<Row>[] = [
    { header: 'Tháng', cell: (r) => String(r.effectiveMonth).slice(0, 7), className: 'font-medium' },
    { header: 'Nhân viên', cell: (r) => r.employeeName ?? '—' },
    {
      header: 'Loại',
      cell: (r) => {
        const neg = r.type === 'penalty' || r.type === 'cut';
        return <Badge variant={neg ? 'destructive' : 'default'}>{SALARY_ADJUSTMENT_LABEL[r.type] ?? r.type}</Badge>;
      }
    },
    { header: 'Số tiền', cell: (r) => vnd(r.amount) },
    { header: 'Ghi chú', cell: (r) => r.note ?? '—' }
  ];

  return (
    <PageContainer
      pageTitle='Biến động lương'
      pageDescription='Ghi nhận tăng/giảm lương, phụ cấp đột xuất, thưởng, phạt trong tháng — được engine cộng/trừ khi chạy lương.'
      pageHeaderAction={
        <EntityFormDialog
          triggerLabel='Thêm biến động'
          title='Thêm biến động lương'
          action={createSalaryAdjustment}
          fields={[
            { name: 'employeeId', label: 'Nhân viên', type: 'select', options: empOpts, required: true, colSpan: 2 },
            { name: 'type', label: 'Loại', type: 'select', required: true, options: Object.entries(SALARY_ADJUSTMENT_LABEL).map(([value, label]) => ({ value, label })) },
            { name: 'amount', label: 'Số tiền (₫)', type: 'number', required: true },
            { name: 'effectiveMonth', label: 'Tháng áp dụng', type: 'date', required: true, colSpan: 2 },
            { name: 'note', label: 'Ghi chú', type: 'textarea' }
          ]}
        />
      }
    >
      <SimpleTable columns={columns} rows={rows} emptyText='Chưa có biến động lương nào.' />
    </PageContainer>
  );
}
