import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { EntityFormDialog } from '@/features/hr/common/entity-form-dialog';
import {
  departmentOptions,
  employeeOptions
} from '@/features/hr/common/lookups';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import { createKpi, listKpis } from '@/features/hr/performance/kpis';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';

export const metadata = { title: 'HRM: KPI / OKR' };

const SCOPE_LABEL: Record<string, string> = {
  company: 'Công ty',
  department: 'Phòng ban',
  individual: 'Cá nhân'
};

type Row = Awaited<ReturnType<typeof listKpis>>[number];

export default async function KpisPage() {
  const role = await getCurrentRole();
  if (!roleAtLeast(role, 'manager')) {
    return <PageContainer pageTitle='KPI / OKR' access={false}><div /></PageContainer>;
  }
  const rows = await listKpis();
  const canCreate = roleAtLeast(role, 'hr');
  const [deptOpts, empOpts] = canCreate
    ? await Promise.all([departmentOptions(), employeeOptions()])
    : [[], []];

  const columns: Column<Row>[] = [
    { header: 'Chỉ tiêu', cell: (r) => r.name, className: 'font-medium' },
    { header: 'Cấp', cell: (r) => <Badge variant='secondary'>{SCOPE_LABEL[r.scope] ?? r.scope}</Badge> },
    { header: 'Đối tượng', cell: (r) => r.employeeName ?? r.departmentName ?? 'Toàn công ty' },
    { header: 'Chỉ tiêu', cell: (r) => (r.target ? `${r.target} ${r.unit ?? ''}` : '—') },
    { header: 'Trọng số', cell: (r) => (r.weight ? `${r.weight}%` : '—') },
    { header: 'Kỳ', cell: (r) => r.period ?? '—' }
  ];

  return (
    <PageContainer
      pageTitle='KPI / OKR'
      pageDescription='Thiết lập và giao chỉ tiêu KPI/OKR từ công ty xuống phòng ban và cá nhân; quản lý trọng số.'
      pageHeaderAction={
        canCreate ? (
          <EntityFormDialog
            triggerLabel='Thêm KPI'
            title='Thêm chỉ tiêu KPI/OKR'
            action={createKpi}
            defaults={{ scope: 'individual' }}
            fields={[
              { name: 'name', label: 'Tên chỉ tiêu', required: true, colSpan: 2 },
              { name: 'scope', label: 'Cấp giao', type: 'select', required: true, options: Object.entries(SCOPE_LABEL).map(([value, label]) => ({ value, label })) },
              { name: 'period', label: 'Kỳ (2026 / 2026-Q3)', placeholder: '2026-Q3' },
              { name: 'departmentId', label: 'Phòng ban (nếu có)', type: 'select', options: deptOpts },
              { name: 'employeeId', label: 'Cá nhân (nếu có)', type: 'select', options: empOpts },
              { name: 'target', label: 'Chỉ tiêu (số)', type: 'number' },
              { name: 'unit', label: 'Đơn vị' },
              { name: 'weight', label: 'Trọng số (%)', type: 'number' }
            ]}
          />
        ) : undefined
      }
    >
      <SimpleTable columns={columns} rows={rows} emptyText='Chưa có KPI nào.' />
    </PageContainer>
  );
}
