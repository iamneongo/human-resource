import { EntityFormDialog } from '@/features/hr/common/entity-form-dialog';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import { createSalaryInfo } from '@/features/hr/salary-info/actions';
import { getEmployeeSalaryHistory } from '@/features/hr/employees/actions';
import { formatVND } from '@/lib/format';

type Row = Awaited<ReturnType<typeof getEmployeeSalaryHistory>>[number];

export async function SalaryTab({ employeeId, canEdit }: { employeeId: string; canEdit: boolean }) {
  const rows = await getEmployeeSalaryHistory(employeeId);

  async function addSalaryInfo(v: Record<string, string>) {
    'use server';
    return createSalaryInfo({ ...v, employeeId });
  }

  const cols: Column<Row>[] = [
    { header: 'Hiệu lực từ', cell: (r) => r.effectiveFrom, className: 'font-medium' },
    { header: 'Lương cơ bản', cell: (r) => formatVND(r.baseSalary) },
    { header: 'Phụ cấp cố định', cell: (r) => formatVND(r.fixedAllowance) },
    { header: 'BH thương mại', cell: (r) => r.commercialInsurancePackage ?? '—' }
  ];

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <p className='text-muted-foreground text-sm'>{rows.length} bản ghi lương</p>
        {canEdit && (
          <EntityFormDialog
            triggerLabel='Thêm thông tin lương'
            title='Thêm thông tin lương & phúc lợi'
            action={addSalaryInfo}
            fields={[
              { name: 'effectiveFrom', label: 'Hiệu lực từ ngày', type: 'date', required: true },
              { name: 'baseSalary', label: 'Lương cơ bản (₫)', type: 'number', required: true },
              { name: 'fixedAllowance', label: 'Phụ cấp cố định (₫)', type: 'number' },
              { name: 'commercialInsurancePackage', label: 'Gói BH thương mại', colSpan: 2 }
            ]}
          />
        )}
      </div>
      <SimpleTable columns={cols} rows={rows} emptyText='Chưa có thông tin lương & phúc lợi.' />
    </div>
  );
}
