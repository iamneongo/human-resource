import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { EntityFormDialog } from '@/features/hr/common/entity-form-dialog';
import {
  departmentOptions,
  employeeOptions,
  positionOptions
} from '@/features/hr/common/lookups';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import {
  createAssignment,
  listAssignments
} from '@/features/hr/assignments/actions';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';

export const metadata = { title: 'HRM: Điều chuyển / Bổ nhiệm' };

const TYPE_LABEL: Record<string, string> = {
  hire: 'Tuyển dụng',
  transfer: 'Điều chuyển',
  promotion: 'Bổ nhiệm/Thăng chức',
  rotation: 'Luân chuyển'
};

type Row = Awaited<ReturnType<typeof listAssignments>>[number];

export default async function AssignmentsPage() {
  const role = await getCurrentRole();
  if (!roleAtLeast(role, 'manager')) {
    return <PageContainer pageTitle='Điều chuyển / Bổ nhiệm' access={false}><div /></PageContainer>;
  }
  const rows = await listAssignments();
  const canCreate = roleAtLeast(role, 'hr');
  const [empOpts, deptOpts, posOpts] = canCreate
    ? await Promise.all([employeeOptions(), departmentOptions(), positionOptions()])
    : [[], [], []];

  const columns: Column<Row>[] = [
    { header: 'Ngày hiệu lực', cell: (r) => r.effectiveDate, className: 'font-medium' },
    { header: 'Nhân viên', cell: (r) => r.employeeName ?? '—' },
    { header: 'Loại', cell: (r) => <Badge variant='secondary'>{TYPE_LABEL[r.type] ?? r.type}</Badge> },
    { header: 'Phòng ban', cell: (r) => r.departmentName ?? '—' },
    { header: 'Chức vụ', cell: (r) => r.positionTitle ?? '—' },
    { header: 'Ghi chú', cell: (r) => r.note ?? '—' }
  ];

  return (
    <PageContainer
      pageTitle='Điều chuyển / Bổ nhiệm'
      pageDescription='Lịch sử điều chuyển, bổ nhiệm, luân chuyển công tác của nhân viên.'
      pageHeaderAction={
        canCreate ? (
          <EntityFormDialog
            triggerLabel='Thêm điều chuyển'
            title='Thêm quyết định điều chuyển / bổ nhiệm'
            action={createAssignment}
            fields={[
              { name: 'employeeId', label: 'Nhân viên', type: 'select', options: empOpts, required: true, colSpan: 2 },
              { name: 'type', label: 'Loại', type: 'select', required: true, options: Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label })) },
              { name: 'effectiveDate', label: 'Ngày hiệu lực', type: 'date', required: true },
              { name: 'departmentId', label: 'Phòng ban', type: 'select', options: deptOpts },
              { name: 'positionId', label: 'Chức vụ', type: 'select', options: posOpts },
              { name: 'note', label: 'Ghi chú', type: 'textarea' }
            ]}
          />
        ) : undefined
      }
    >
      <SimpleTable columns={columns} rows={rows} emptyText='Chưa có điều chuyển nào.' />
    </PageContainer>
  );
}
