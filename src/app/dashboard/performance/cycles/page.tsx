import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { EntityFormDialog } from '@/features/hr/common/entity-form-dialog';
import { employeeOptions } from '@/features/hr/common/lookups';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import { createCycle, listCycles } from '@/features/hr/performance/cycles';
import {
  createEvaluation,
  listEvaluations
} from '@/features/hr/performance/evaluations';
import { ScoreDialog } from '@/features/hr/performance/score-dialog';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';

export const metadata = { title: 'HRM: Chu kỳ đánh giá' };

const TYPE_LABEL: Record<string, string> = {
  monthly: 'Tháng',
  quarterly: 'Quý',
  yearly: 'Năm',
  probation: 'Thử việc',
  review_360: '360 độ'
};
const EVAL_STATUS: Record<string, string> = {
  pending: 'Chờ',
  self_done: 'Đã tự đánh giá',
  manager_done: 'QL đã chấm',
  finalized: 'Đã chốt'
};

type CycleRow = Awaited<ReturnType<typeof listCycles>>[number];
type EvalRow = Awaited<ReturnType<typeof listEvaluations>>[number];

export default async function CyclesPage() {
  const role = await getCurrentRole();
  if (!roleAtLeast(role, 'manager')) {
    return <PageContainer pageTitle='Chu kỳ đánh giá' access={false}><div /></PageContainer>;
  }
  const [cycles, evals] = await Promise.all([listCycles(), listEvaluations()]);
  const canManage = roleAtLeast(role, 'hr');
  const canScore = roleAtLeast(role, 'manager');
  const empOpts = canManage ? await employeeOptions() : [];
  const cycleOpts = cycles.map((c) => ({ value: c.id, label: c.name }));

  const cycleCols: Column<CycleRow>[] = [
    { header: 'Tên chu kỳ', cell: (r) => r.name, className: 'font-medium' },
    { header: 'Loại', cell: (r) => <Badge variant='secondary'>{TYPE_LABEL[r.type] ?? r.type}</Badge> },
    { header: 'Từ', cell: (r) => r.startDate },
    { header: 'Đến', cell: (r) => r.endDate },
    { header: 'Trạng thái', cell: (r) => r.status }
  ];

  const evalCols: Column<EvalRow>[] = [
    { header: 'Chu kỳ', cell: (r) => r.cycleName ?? '—', className: 'font-medium' },
    { header: 'Nhân viên', cell: (r) => r.employeeName ?? '—' },
    { header: 'Self', cell: (r) => r.selfScore ?? '—' },
    { header: 'Quản lý', cell: (r) => r.managerScore ?? '—' },
    { header: 'Điểm cuối', cell: (r) => r.finalScore ?? '—' },
    { header: 'Xếp loại', cell: (r) => (r.ranking ? <Badge>{r.ranking}</Badge> : '—') },
    { header: 'Trạng thái', cell: (r) => EVAL_STATUS[r.status] ?? r.status },
    ...(canScore
      ? [{
          header: '',
          cell: (r: EvalRow) => (
            <ScoreDialog id={r.id} selfScore={r.selfScore} managerScore={r.managerScore} />
          )
        }]
      : [])
  ];

  return (
    <PageContainer
      pageTitle='Chu kỳ đánh giá'
      pageDescription='Cấu hình các đợt đánh giá (định kỳ / thử việc / 360°); nhân viên tự đánh giá, quản lý chấm điểm, chốt kết quả.'
      pageHeaderAction={
        canManage ? (
          <EntityFormDialog
            triggerLabel='Tạo chu kỳ'
            title='Tạo chu kỳ đánh giá'
            action={createCycle}
            defaults={{ type: 'quarterly' }}
            fields={[
              { name: 'name', label: 'Tên chu kỳ', required: true, colSpan: 2 },
              { name: 'type', label: 'Loại', type: 'select', required: true, options: Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label })) },
              { name: 'startDate', label: 'Từ ngày', type: 'date', required: true },
              { name: 'endDate', label: 'Đến ngày', type: 'date', required: true }
            ]}
          />
        ) : undefined
      }
    >
      <SimpleTable columns={cycleCols} rows={cycles} emptyText='Chưa có chu kỳ nào.' />

      <div className='mt-8 flex items-center justify-between'>
        <h3 className='text-sm font-medium'>Danh sách đánh giá</h3>
        {canManage ? (
          <EntityFormDialog
            triggerLabel='Thêm đánh giá'
            title='Thêm phiếu đánh giá'
            action={createEvaluation}
            fields={[
              { name: 'cycleId', label: 'Chu kỳ', type: 'select', options: cycleOpts, required: true, colSpan: 2 },
              { name: 'employeeId', label: 'Nhân viên', type: 'select', options: empOpts, required: true, colSpan: 2 }
            ]}
          />
        ) : null}
      </div>
      <div className='mt-2'>
        <SimpleTable columns={evalCols} rows={evals} emptyText='Chưa có phiếu đánh giá nào.' />
      </div>
    </PageContainer>
  );
}
