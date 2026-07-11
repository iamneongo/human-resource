import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import { hrReport } from '@/features/hr/reports/actions';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';

export const metadata = { title: 'HRM: Báo cáo nhân sự' };

const STATUS_LABEL: Record<string, string> = {
  active: 'Đang làm việc',
  probation: 'Thử việc',
  on_leave: 'Nghỉ phép',
  terminated: 'Đã nghỉ'
};

export default async function HrReportsPage() {
  const role = await getCurrentRole();
  if (!roleAtLeast(role, 'manager')) {
    return <PageContainer pageTitle='Báo cáo nhân sự' access={false}><div /></PageContainer>;
  }
  const r = await hrReport();

  const deptRows = r.byDept.map((d, i) => ({ id: String(i), ...d }));
  const statusRows = r.byStatus.map((s, i) => ({
    id: String(i),
    label: STATUS_LABEL[s.status] ?? s.status,
    total: s.total
  }));

  const deptCols: Column<{ id: string; department: string; total: number }>[] = [
    { header: 'Phòng ban', cell: (x) => x.department },
    { header: 'Số nhân sự', cell: (x) => x.total }
  ];
  const statusCols: Column<{ id: string; label: string; total: number }>[] = [
    { header: 'Trạng thái', cell: (x) => x.label },
    { header: 'Số lượng', cell: (x) => x.total }
  ];

  return (
    <PageContainer
      pageTitle='Báo cáo nhân sự'
      pageDescription='Báo cáo động về biến động nhân sự, cơ cấu phòng ban và tỷ lệ nghỉ việc (turnover).'
    >
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <StatCard title='Tổng nhân sự' value={r.total} />
        <StatCard title='Đang làm việc' value={r.active} />
        <StatCard title='Đã nghỉ' value={r.terminated} />
        <StatCard title='Tỷ lệ nghỉ việc' value={`${r.turnoverRate.toFixed(1)}%`} />
      </div>

      <div className='mt-6 grid gap-6 lg:grid-cols-2'>
        <div>
          <h3 className='mb-2 text-sm font-medium'>Cơ cấu theo phòng ban</h3>
          <SimpleTable columns={deptCols} rows={deptRows} />
        </div>
        <div>
          <h3 className='mb-2 text-sm font-medium'>Cơ cấu theo trạng thái</h3>
          <SimpleTable columns={statusCols} rows={statusRows} />
        </div>
      </div>
    </PageContainer>
  );
}

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardTitle className='text-muted-foreground text-sm font-medium'>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className='text-2xl font-bold'>{value}</div>
      </CardContent>
    </Card>
  );
}
