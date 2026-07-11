import PageContainer from '@/components/layout/page-container';
import { EntityFormDialog } from '@/features/hr/common/entity-form-dialog';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import { createBudget, listBudgets } from '@/features/hr/training/actions';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';

export const metadata = { title: 'HRM: Ngân sách đào tạo' };

const vnd = (n: string) => Number(n).toLocaleString('vi-VN') + ' ₫';
type Row = Awaited<ReturnType<typeof listBudgets>>[number];

export default async function BudgetPage() {
  const role = await getCurrentRole();
  if (!roleAtLeast(role, 'hr')) {
    return <PageContainer pageTitle='Ngân sách đào tạo' access={false}><div /></PageContainer>;
  }
  const rows = await listBudgets();

  const columns: Column<Row>[] = [
    { header: 'Năm', cell: (r) => r.year, className: 'font-medium' },
    { header: 'Tổng ngân sách', cell: (r) => vnd(r.totalBudget) },
    { header: 'Đã chi', cell: (r) => vnd(r.spent) },
    {
      header: 'Còn lại',
      cell: (r) => (
        <span className='font-semibold'>
          {vnd(String(Number(r.totalBudget) - Number(r.spent)))}
        </span>
      )
    },
    {
      header: 'Tỷ lệ dùng',
      cell: (r) => {
        const p = Number(r.totalBudget) > 0 ? Math.round((Number(r.spent) / Number(r.totalBudget)) * 100) : 0;
        return `${p}%`;
      }
    }
  ];

  return (
    <PageContainer
      pageTitle='Ngân sách đào tạo'
      pageDescription='Kiểm soát tổng ngân sách đào tạo năm, theo dõi chi phí thực tế và tính hiệu quả (ROI).'
      pageHeaderAction={
        <EntityFormDialog
          triggerLabel='Thêm ngân sách'
          title='Thêm ngân sách đào tạo'
          action={createBudget}
          defaults={{ year: String(new Date().getFullYear()), spent: '0' }}
          fields={[
            { name: 'year', label: 'Năm', type: 'number', required: true },
            { name: 'totalBudget', label: 'Tổng ngân sách (₫)', type: 'number', required: true },
            { name: 'spent', label: 'Đã chi (₫)', type: 'number' },
            { name: 'note', label: 'Ghi chú', type: 'textarea' }
          ]}
        />
      }
    >
      <SimpleTable columns={columns} rows={rows} emptyText='Chưa có ngân sách nào.' />
    </PageContainer>
  );
}
