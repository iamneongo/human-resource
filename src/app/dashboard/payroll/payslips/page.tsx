import PageContainer from '@/components/layout/page-container';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import { listPayslips } from '@/features/hr/payroll/payslips';
import { SendButton } from '@/features/hr/payroll/send-button';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';

export const metadata = { title: 'HRM: Phiếu lương' };

const vnd = (n: string) => Number(n).toLocaleString('vi-VN') + ' ₫';
type Row = Awaited<ReturnType<typeof listPayslips>>[number];

export default async function PayslipsPage() {
  const role = await getCurrentRole();
  if (!roleAtLeast(role, 'hr')) {
    return <PageContainer pageTitle='Phiếu lương' access={false}><div /></PageContainer>;
  }
  const rows = await listPayslips();

  const columns: Column<Row>[] = [
    { header: 'Kỳ', cell: (r) => r.period ?? '—', className: 'font-medium' },
    { header: 'Nhân viên', cell: (r) => `${r.employeeCode ?? ''} ${r.employeeName ?? ''}` },
    { header: 'Tổng thu nhập', cell: (r) => vnd(r.grossPay) },
    { header: 'BHXH', cell: (r) => vnd(r.insuranceDeduction) },
    { header: 'Thuế TNCN', cell: (r) => vnd(r.taxDeduction) },
    { header: 'Thực nhận', cell: (r) => <span className='font-semibold'>{vnd(r.netPay)}</span> },
    { header: '', cell: (r) => <SendButton id={r.id} sent={!!r.sentAt} /> }
  ];

  return (
    <PageContainer
      pageTitle='Phiếu lương (Payslip)'
      pageDescription='Phiếu lương điện tử sinh tự động khi chốt bảng lương; gửi bảo mật tới từng nhân viên.'
    >
      <SimpleTable columns={columns} rows={rows} emptyText='Chưa có phiếu lương. Hãy tạo và chốt một kỳ lương.' />
    </PageContainer>
  );
}
