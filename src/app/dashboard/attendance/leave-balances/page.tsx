import PageContainer from '@/components/layout/page-container';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import { listLeaveBalances } from '@/features/hr/attendance/leave-balances';
import { RecalcButton } from '@/features/hr/attendance/recalc-button';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';

export const metadata = { title: 'HRM: Số dư phép' };

type Row = Awaited<ReturnType<typeof listLeaveBalances>>[number];

export default async function LeaveBalancesPage() {
  const role = await getCurrentRole();
  if (!roleAtLeast(role, 'manager')) {
    return <PageContainer pageTitle='Số dư phép' access={false}><div /></PageContainer>;
  }
  const year = new Date().getFullYear();
  const rows = await listLeaveBalances(year);
  const canManage = roleAtLeast(role, 'hr');

  const columns: Column<Row>[] = [
    { header: 'Nhân viên', cell: (r) => `${r.employeeCode ?? ''} ${r.employeeName ?? ''}`, className: 'font-medium' },
    { header: 'Năm', cell: (r) => r.year },
    { header: 'Được hưởng', cell: (r) => r.entitledDays },
    { header: 'Đã nghỉ', cell: (r) => r.usedDays },
    { header: 'Còn lại', cell: (r) => <span className='font-semibold'>{r.remaining}</span> }
  ];

  return (
    <PageContainer
      pageTitle={`Số dư phép ${year}`}
      pageDescription='Số dư phép năm tính theo thâm niên (12 ngày + 1 ngày mỗi 5 năm), trừ đi số ngày đã nghỉ.'
      pageHeaderAction={canManage ? <RecalcButton /> : undefined}
    >
      <SimpleTable columns={columns} rows={rows} emptyText='Chưa có dữ liệu. Nhấn “Tính lại theo thâm niên”.' />
    </PageContainer>
  );
}
