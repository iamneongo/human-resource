import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { EntityFormDialog } from '@/features/hr/common/entity-form-dialog';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import { createFormula, listFormulas } from '@/features/hr/payroll/formulas';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';

export const metadata = { title: 'HRM: Công thức tính lương' };

type Row = Awaited<ReturnType<typeof listFormulas>>[number];

export default async function FormulasPage() {
  const role = await getCurrentRole();
  if (!roleAtLeast(role, 'hr')) {
    return <PageContainer pageTitle='Công thức tính lương' access={false}><div /></PageContainer>;
  }
  const rows = await listFormulas();
  const columns: Column<Row>[] = [
    { header: 'Mã', cell: (r) => r.code, className: 'font-medium' },
    { header: 'Tên', cell: (r) => r.name },
    { header: 'Biểu thức', cell: (r) => <code className='text-xs'>{r.expression}</code> },
    { header: 'Trạng thái', cell: (r) => r.isActive ? <Badge>Đang dùng</Badge> : <Badge variant='secondary'>Tạm dừng</Badge> }
  ];
  return (
    <PageContainer
      pageTitle='Công thức tính lương'
      pageDescription='Định nghĩa công thức lương động dựa trên ngày công thực tế, KPI, doanh số, lương sản phẩm.'
      pageHeaderAction={
        <EntityFormDialog
          triggerLabel='Thêm công thức'
          title='Thêm công thức tính lương'
          action={createFormula}
          fields={[
            { name: 'code', label: 'Mã', required: true },
            { name: 'name', label: 'Tên công thức', required: true },
            { name: 'expression', label: 'Biểu thức', required: true, colSpan: 2, placeholder: 'base * workedDays / standardDays + kpi * bonusRate' },
            { name: 'description', label: 'Mô tả', type: 'textarea' }
          ]}
        />
      }
    >
      <SimpleTable columns={columns} rows={rows} emptyText='Chưa có công thức nào.' />
    </PageContainer>
  );
}
