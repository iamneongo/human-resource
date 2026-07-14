import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import { PayrollChart } from '@/features/hr/payroll/payroll-chart';
import { payrollReport } from '@/features/hr/payroll/payslips';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';
import { formatNumber, formatVND } from '@/lib/format';

export const metadata = { title: 'HRM: Báo cáo lương' };

const vnd = formatVND;
const num = formatNumber;
type Row = Awaited<ReturnType<typeof payrollReport>>[number];

export default async function PayrollReportsPage() {
  const role = await getCurrentRole();
  if (!roleAtLeast(role, 'hr')) {
    return (
      <PageContainer
        pageTitle='Báo cáo lương'
        access={false}
        accessFallback={
          <div className='text-muted-foreground text-center text-lg'>
            Bạn cần quyền HR trở lên để xem báo cáo lương.
          </div>
        }
      >
        <div />
      </PageContainer>
    );
  }

  const rows = await payrollReport();
  const columns: Column<Row>[] = [
    { header: 'Kỳ lương', cell: (row) => row.period, className: 'font-medium' },
    { header: 'Số phiếu lương', cell: (row) => num(row.count) },
    { header: 'Tổng công', cell: (row) => `${num(row.workdays)} công` },
    { header: 'Tổng OT', cell: (row) => `${num(row.overtimeHours)} giờ` },
    { header: 'Tổng gross', cell: (row) => vnd(row.gross) },
    { header: 'Tổng BHXH', cell: (row) => vnd(row.insurance) },
    { header: 'Tổng thuế TNCN', cell: (row) => vnd(row.tax) },
    {
      header: 'Tổng thực chi',
      cell: (row) => <span className='font-semibold'>{vnd(row.net)}</span>
    }
  ];

  return (
    <PageContainer
      pageTitle='Báo cáo lương'
      pageDescription='Tổng hợp số liệu đã chốt theo kỳ lương. Chi phí forecast theo ngày ở màn định biên chỉ dùng để theo dõi vận hành, không thay thế báo cáo payroll chính thức.'
    >
      {rows.length > 0 ? (
        <Card className='mb-6'>
          <CardHeader>
            <CardTitle className='text-base'>Chi phí lương theo kỳ</CardTitle>
          </CardHeader>
          <CardContent>
            <PayrollChart data={rows} />
          </CardContent>
        </Card>
      ) : null}
      <SimpleTable
        columns={columns}
        rows={rows}
        emptyText='Chưa có dữ liệu lương đã chốt. Hãy preview và chốt ít nhất một kỳ lương.'
      />
    </PageContainer>
  );
}
