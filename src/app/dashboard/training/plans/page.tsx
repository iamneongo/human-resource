import PageContainer from '@/components/layout/page-container';
import { EntityFormDialog } from '@/features/hr/common/entity-form-dialog';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import { createPlan, listPlans } from '@/features/hr/training/actions';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';

export const metadata = { title: 'HRM: Kế hoạch đào tạo' };

const vnd = (n: string | null) => (n == null ? '—' : Number(n).toLocaleString('vi-VN') + ' ₫');
type Row = Awaited<ReturnType<typeof listPlans>>[number];

export default async function PlansPage() {
  const role = await getCurrentRole();
  if (!roleAtLeast(role, 'manager')) {
    return <PageContainer pageTitle='Kế hoạch đào tạo' access={false}><div /></PageContainer>;
  }
  const rows = await listPlans();
  const canCreate = roleAtLeast(role, 'hr');

  const columns: Column<Row>[] = [
    { header: 'Tên kế hoạch', cell: (r) => r.name, className: 'font-medium' },
    { header: 'Năm', cell: (r) => r.year },
    { header: 'Từ', cell: (r) => r.startDate ?? '—' },
    { header: 'Đến', cell: (r) => r.endDate ?? '—' },
    { header: 'Dự trù chi phí', cell: (r) => vnd(r.estimatedCost) }
  ];

  return (
    <PageContainer
      pageTitle='Kế hoạch đào tạo'
      pageDescription='Lập lịch các khóa học ngắn/dài hạn, phân bổ nguồn lực và dự trù chi phí.'
      pageHeaderAction={
        canCreate ? (
          <EntityFormDialog
            triggerLabel='Thêm kế hoạch'
            title='Thêm kế hoạch đào tạo'
            action={createPlan}
            defaults={{ year: String(new Date().getFullYear()) }}
            fields={[
              { name: 'name', label: 'Tên kế hoạch', required: true, colSpan: 2 },
              { name: 'year', label: 'Năm', type: 'number', required: true },
              { name: 'estimatedCost', label: 'Dự trù chi phí (₫)', type: 'number' },
              { name: 'startDate', label: 'Từ ngày', type: 'date' },
              { name: 'endDate', label: 'Đến ngày', type: 'date' },
              { name: 'note', label: 'Ghi chú', type: 'textarea' }
            ]}
          />
        ) : undefined
      }
    >
      <SimpleTable columns={columns} rows={rows} emptyText='Chưa có kế hoạch nào.' />
    </PageContainer>
  );
}
