import PageContainer from '@/components/layout/page-container';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import { listTimesheets } from '@/features/hr/attendance/timesheets';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';

export const metadata = { title: 'HRM: Bảng công (Timesheet)' };

const fmt = (d: Date | string | null) =>
  d ? new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—';

type Row = Awaited<ReturnType<typeof listTimesheets>>[number];

export default async function TimesheetsPage() {
  const role = await getCurrentRole();
  if (!roleAtLeast(role, 'manager')) {
    return (
      <PageContainer pageTitle='Bảng công (Timesheet)' access={false}>
        <div />
      </PageContainer>
    );
  }
  const rows = await listTimesheets();

  const columns: Column<Row>[] = [
    { header: 'Ngày', cell: (r) => r.workDate, className: 'font-medium' },
    { header: 'Nhân viên', cell: (r) => r.employeeName ?? '—' },
    { header: 'Giờ vào', cell: (r) => fmt(r.checkIn) },
    { header: 'Giờ ra', cell: (r) => fmt(r.checkOut) },
    { header: 'Giờ công', cell: (r) => r.workedHours ?? '—' },
    { header: 'Đi muộn (phút)', cell: (r) => r.lateMinutes },
    { header: 'Về sớm (phút)', cell: (r) => r.earlyLeaveMinutes }
  ];

  return (
    <PageContainer pageTitle='Bảng công (Timesheet)'>
      <SimpleTable
        columns={columns}
        rows={rows}
        emptyText='Chưa có dữ liệu công. Dữ liệu được tổng hợp sau khi đồng bộ thiết bị chấm công.'
      />
    </PageContainer>
  );
}
