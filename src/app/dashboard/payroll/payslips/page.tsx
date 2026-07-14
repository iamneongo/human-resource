import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import { listPayslips } from '@/features/hr/payroll/payslips';
import { SendButton } from '@/features/hr/payroll/send-button';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';
import { formatNumber, formatVND } from '@/lib/format';

export const metadata = { title: 'HRM: Phiếu lương' };

const vnd = formatVND;
const num = formatNumber;
type Row = Awaited<ReturnType<typeof listPayslips>>[number];

export default async function PayslipsPage() {
  const role = await getCurrentRole();
  if (!roleAtLeast(role, 'hr')) {
    return (
      <PageContainer pageTitle='Phiếu lương' access={false}>
        <div />
      </PageContainer>
    );
  }

  const rows = await listPayslips();
  const columns: Column<Row>[] = [
    { header: 'Kỳ', cell: (r) => r.period ?? '—', className: 'font-medium' },
    { header: 'Nhân viên', cell: (r) => `${r.employeeCode ?? ''} ${r.employeeName ?? ''}` },
    {
      header: 'Loại snapshot',
      cell: (r) => (
        <Badge variant={r.isPreview ? 'outline' : 'default'}>
          {r.isPreview ? 'Preview' : 'Chính thức'}
        </Badge>
      )
    },
    {
      header: 'Nguồn công',
      cell: (r) => `${num(r.manualDays)} manual / ${num(r.timesheetDays)} timesheet`
    },
    { header: 'Công', cell: (r) => (r.workedDays ? `${num(r.workedDays)} công` : '—') },
    { header: 'Lương ngày', cell: (r) => vnd(r.salaryPerDay) },
    { header: 'Lương theo công', cell: (r) => vnd(r.salaryByAttendance) },
    { header: 'OT', cell: (r) => (r.overtimeHours ? `${num(r.overtimeHours)} giờ` : '—') },
    { header: 'Tiền OT', cell: (r) => vnd(r.overtimePay) },
    { header: 'Phụ cấp', cell: (r) => vnd(r.fixedAllowance) },
    { header: 'Điều chỉnh', cell: (r) => vnd(r.otherAdjustments) },
    { header: 'Gross', cell: (r) => vnd(r.grossPay) },
    { header: 'BHXH', cell: (r) => vnd(r.insuranceDeduction) },
    { header: 'Thuế TNCN', cell: (r) => vnd(r.taxDeduction) },
    { header: 'Thực nhận', cell: (r) => <span className='font-semibold'>{vnd(r.netPay)}</span> },
    { header: '', cell: (r) => <SendButton id={r.id} sent={!!r.sentAt} isPreview={r.isPreview} /> }
  ];

  return (
    <PageContainer
      pageTitle='Phiếu lương'
      pageDescription='Hiển thị cả preview và phiếu lương đã chốt để HR rà soát sai lệch trước khi phát hành nội bộ.'
    >
      <SimpleTable
        columns={columns}
        rows={rows}
        emptyText='Chưa có phiếu lương. Hãy tạo và preview/chốt một kỳ lương.'
      />
    </PageContainer>
  );
}
