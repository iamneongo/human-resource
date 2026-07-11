import PageContainer from '@/components/layout/page-container';
import { EntityFormDialog } from '@/features/hr/common/entity-form-dialog';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import {
  createSalaryScale,
  listSalaryScales
} from '@/features/hr/payroll/salary-scales';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';

export const metadata = { title: 'HRM: Thang bảng lương' };

const vnd = (n: string | null) => (n == null ? '—' : Number(n).toLocaleString('vi-VN') + ' ₫');
type Row = Awaited<ReturnType<typeof listSalaryScales>>[number];

export default async function SalaryScalesPage() {
  const role = await getCurrentRole();
  if (!roleAtLeast(role, 'hr')) {
    return <PageContainer pageTitle='Thang bảng lương' access={false}><div /></PageContainer>;
  }
  const rows = await listSalaryScales();
  const columns: Column<Row>[] = [
    { header: 'Mã', cell: (r) => r.code, className: 'font-medium' },
    { header: 'Ngạch', cell: (r) => r.grade },
    { header: 'Bậc', cell: (r) => r.step },
    { header: 'Lương tối thiểu', cell: (r) => vnd(r.minSalary) },
    { header: 'Lương tối đa', cell: (r) => vnd(r.maxSalary) },
    { header: 'Hệ số', cell: (r) => r.coefficient ?? '—' }
  ];
  return (
    <PageContainer
      pageTitle='Thang bảng lương'
      pageDescription='Thiết lập hệ thống ngạch bậc lương, dải lương theo quy chế doanh nghiệp.'
      pageHeaderAction={
        <EntityFormDialog
          triggerLabel='Thêm ngạch/bậc'
          title='Thêm ngạch bậc lương'
          action={createSalaryScale}
          fields={[
            { name: 'code', label: 'Mã', required: true },
            { name: 'grade', label: 'Ngạch', required: true },
            { name: 'step', label: 'Bậc', type: 'number', required: true },
            { name: 'minSalary', label: 'Lương tối thiểu (₫)', type: 'number', required: true },
            { name: 'maxSalary', label: 'Lương tối đa (₫)', type: 'number', required: true },
            { name: 'coefficient', label: 'Hệ số', type: 'number' }
          ]}
        />
      }
    >
      <SimpleTable columns={columns} rows={rows} emptyText='Chưa có ngạch bậc nào.' />
    </PageContainer>
  );
}
