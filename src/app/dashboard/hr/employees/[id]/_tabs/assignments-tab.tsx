import { EntityFormDialog } from '@/features/hr/common/entity-form-dialog';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import { departmentOptions, positionOptions } from '@/features/hr/common/lookups';
import { createAssignment, getAssignmentsByEmployee } from '@/features/hr/assignments/actions';

const ASSIGNMENT_TYPE_OPTS = [
  { value: 'hire', label: 'Tuyển dụng' },
  { value: 'transfer', label: 'Điều chuyển' },
  { value: 'promotion', label: 'Bổ nhiệm' },
  { value: 'rotation', label: 'Luân chuyển' }
];

const ASSIGNMENT_TYPE: Record<string, string> = Object.fromEntries(
  ASSIGNMENT_TYPE_OPTS.map((o) => [o.value, o.label])
);

type Row = Awaited<ReturnType<typeof getAssignmentsByEmployee>>[number];

export async function AssignmentsTab({
  employeeId,
  canEdit
}: {
  employeeId: string;
  canEdit: boolean;
}) {
  const [rows, deptOpts, posOpts] = await Promise.all([
    getAssignmentsByEmployee(employeeId),
    canEdit ? departmentOptions() : Promise.resolve([]),
    canEdit ? positionOptions() : Promise.resolve([])
  ]);

  async function addAssignment(v: Record<string, string>) {
    'use server';
    return createAssignment({ ...v, employeeId });
  }

  const cols: Column<Row>[] = [
    { header: 'Ngày hiệu lực', cell: (r) => r.effectiveDate },
    { header: 'Loại', cell: (r) => ASSIGNMENT_TYPE[r.type] ?? r.type },
    { header: 'Phòng ban', cell: (r) => r.departmentName ?? '—' },
    { header: 'Chức vụ', cell: (r) => r.positionTitle ?? '—' },
    { header: 'Ghi chú', cell: (r) => r.note ?? '—' }
  ];

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <p className='text-muted-foreground text-sm'>{rows.length} bản ghi</p>
        {canEdit && (
          <EntityFormDialog
            triggerLabel='Thêm điều chuyển'
            title='Thêm điều chuyển / Bổ nhiệm'
            action={addAssignment}
            fields={[
              {
                name: 'type',
                label: 'Loại',
                type: 'select',
                required: true,
                options: ASSIGNMENT_TYPE_OPTS
              },
              { name: 'effectiveDate', label: 'Ngày hiệu lực', type: 'date', required: true },
              { name: 'departmentId', label: 'Phòng ban', type: 'select', options: deptOpts },
              { name: 'positionId', label: 'Chức vụ', type: 'select', options: posOpts },
              { name: 'note', label: 'Ghi chú', type: 'textarea', colSpan: 2 }
            ]}
          />
        )}
      </div>
      <SimpleTable columns={cols} rows={rows} emptyText='Chưa có lịch sử điều chuyển.' />
    </div>
  );
}
