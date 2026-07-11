import PageContainer from '@/components/layout/page-container';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import { payrollReport } from '@/features/hr/payroll/payslips';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';

export const metadata = { title: 'HRM: Báo cáo lương' };

const vnd = (n: number) => n.toLocaleString('vi-VN') + ' ₫';
type Row = Awaited<ReturnType<typeof payrollReport>>[number];

export default async function PayrollReportsPage() {
  const role = await getCurrentRole();
  if (!roleAtLeast(role, 'hr')) {
    return <PageContainer pageTitle='Báo cáo lương' access={false}><div /></PageContainer>;
  }
  const rows = await payrollReport();

  const columns: Column<Row>[] = [
    { header: 'Kỳ', cell: (r) => r.period, className: 'font-medium' },
    { header: 'Số phiếu', cell: (r) => r.count },
    { header: 'Tổng quỹ lương (gross)', cell: (r) => vnd(r.gross) },
    { header: 'Tổng BHXH', cell: (r) => vnd(r.insurance) },
    { header: 'Tổng thuế TNCN', cell: (r) => vnd(r.tax) },
    { header: 'Tổng thực chi (net)', cell: (r) => <span className='font-semibold'>{vnd(r.net)}</span> }
  ];

  return (
    <PageContainer
      pageTitle='Báo cáo lương'
      pageDescription='Tổng hợp chi phí lương, BHXH và thuế TNCN theo từng kỳ lương.'
    >
      <SimpleTable columns={columns} rows={rows} emptyText='Chưa có dữ liệu lương.' />
    </PageContainer>
  );
}
