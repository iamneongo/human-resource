import PageContainer from '@/components/layout/page-container';
import { EntityFormDialog } from '@/features/hr/common/entity-form-dialog';
import { ConfirmDeleteDialog } from '@/features/hr/common/confirm-delete-dialog';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import {
  createSalaryScale,
  deleteSalaryScale,
  listSalaryScales,
  updateSalaryScale
} from '@/features/hr/payroll/salary-scales';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';
import { formatVND } from '@/lib/format';

export const metadata = { title: 'HRM: Thang bảng lương' };

const vnd = formatVND;
type Row = Awaited<ReturnType<typeof listSalaryScales>>[number];

const SCALE_FIELDS = [
  { name: 'grade', label: 'Ngạch', required: true },
  { name: 'step', label: 'Bậc', type: 'number' as const, required: true },
  { name: 'minSalary', label: 'Lương tối thiểu (₫)', type: 'number' as const, required: true },
  { name: 'maxSalary', label: 'Lương tối đa (₫)', type: 'number' as const, required: true },
  { name: 'coefficient', label: 'Hệ số', type: 'number' as const }
];

export default async function SalaryScalesPage() {
  const role = await getCurrentRole();
  if (!roleAtLeast(role, 'hr')) {
    return (
      <PageContainer pageTitle='Thang bảng lương' access={false}>
        <div />
      </PageContainer>
    );
  }
  const rows = await listSalaryScales();

  const columns: Column<Row>[] = [
    { header: 'Mã', cell: (r) => r.code, className: 'font-medium' },
    { header: 'Ngạch', cell: (r) => r.grade },
    { header: 'Bậc', cell: (r) => r.step },
    { header: 'Lương tối thiểu', cell: (r) => vnd(r.minSalary) },
    { header: 'Lương tối đa', cell: (r) => vnd(r.maxSalary) },
    { header: 'Hệ số', cell: (r) => r.coefficient ?? '—' },
    {
      header: '',
      cell: (r) => (
        <div className='flex justify-end gap-1'>
          <EntityFormDialog
            mode='edit'
            title={`Sửa: ${r.code}`}
            action={updateSalaryScale.bind(null, r.id)}
            defaults={{
              grade: r.grade,
              step: String(r.step),
              minSalary: r.minSalary,
              maxSalary: r.maxSalary,
              coefficient: r.coefficient ?? ''
            }}
            fields={SCALE_FIELDS}
          />
          <ConfirmDeleteDialog
            label={`${r.code} - ${r.grade} bậc ${r.step}`}
            action={deleteSalaryScale.bind(null, r.id)}
          />
        </div>
      )
    }
  ];

  return (
    <PageContainer
      pageTitle='Thang bảng lương'
      pageHeaderAction={
        <EntityFormDialog
          triggerLabel='Thêm ngạch/bậc'
          title='Thêm ngạch bậc lương'
          action={createSalaryScale}
          fields={[{ name: 'code', label: 'Mã', required: true }, ...SCALE_FIELDS]}
        />
      }
    >
      <SimpleTable columns={columns} rows={rows} emptyText='Chưa có ngạch bậc nào.' />
    </PageContainer>
  );
}
