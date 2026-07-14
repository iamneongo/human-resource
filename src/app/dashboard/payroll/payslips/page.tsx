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
      <PageContainer
        pageTitle='Phiếu lương'
        access={false}
        accessFallback={
          <div className='text-muted-foreground text-center text-lg'>
            Bạn cần quyền HR trở lên để xem phiếu lương.
          </div>
        }
      >
        <div />
      </PageContainer>
    );
  }

  const rows = await listPayslips();
  const columns: Column<Row>[] = [
    { header: 'Kỳ lương', cell: (row) => row.period ?? '—', className: 'font-medium' },
    {
      header: 'Nhân viên',
      cell: (row) => `${row.employeeCode ?? ''} ${row.employeeName ?? ''}`.trim()
    },
    {
      header: 'Loại snapshot',
      cell: (row) => (
        <Badge variant={row.isPreview ? 'outline' : 'default'}>
          {row.isPreview ? 'Preview' : 'Chính thức'}
        </Badge>
      )
    },
    {
      header: 'Nguồn dữ liệu công',
      cell: (row) => `${num(row.manualDays)} manual / ${num(row.timesheetDays)} timesheet`
    },
    { header: 'Số công', cell: (row) => (row.workedDays ? `${num(row.workedDays)} công` : '—') },
    { header: 'Lương ngày', cell: (row) => vnd(row.salaryPerDay) },
    { header: 'Lương theo công', cell: (row) => vnd(row.salaryByAttendance) },
    { header: 'OT', cell: (row) => (row.overtimeHours ? `${num(row.overtimeHours)} giờ` : '—') },
    { header: 'Tiền OT', cell: (row) => vnd(row.overtimePay) },
    { header: 'Phụ cấp', cell: (row) => vnd(row.fixedAllowance) },
    { header: 'Điều chỉnh', cell: (row) => vnd(row.otherAdjustments) },
    { header: 'Gross', cell: (row) => vnd(row.grossPay) },
    { header: 'BHXH', cell: (row) => vnd(row.insuranceDeduction) },
    { header: 'Thuế TNCN', cell: (row) => vnd(row.taxDeduction) },
    {
      header: 'Thực nhận',
      cell: (row) => <span className='font-semibold'>{vnd(row.netPay)}</span>
    },
    {
      header: '',
      cell: (row) => <SendButton id={row.id} sent={!!row.sentAt} isPreview={row.isPreview} />
    }
  ];

  return (
    <PageContainer
      pageTitle='Phiếu lương'
      pageDescription='Hiển thị cả bản preview và bản chính thức để HR đối chiếu sai lệch trước khi phát hành nội bộ.'
    >
      <SimpleTable
        columns={columns}
        rows={rows}
        emptyText='Chưa có phiếu lương. Hãy tạo kỳ lương rồi preview hoặc chốt bảng lương trước.'
      />
    </PageContainer>
  );
}
