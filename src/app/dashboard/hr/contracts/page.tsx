import { differenceInCalendarDays, parseISO } from 'date-fns';

import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { EntityFormDialog } from '@/features/hr/common/entity-form-dialog';
import { employeeOptions } from '@/features/hr/common/lookups';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import { createContract, listContracts } from '@/features/hr/contracts/actions';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';

export const metadata = { title: 'HRM: Hợp đồng lao động' };

const TYPE_LABEL: Record<string, string> = {
  probation: 'Thử việc',
  fixed_term: 'Xác định thời hạn',
  indefinite: 'Không xác định thời hạn',
  seasonal: 'Thời vụ'
};

type Row = Awaited<ReturnType<typeof listContracts>>[number];

export default async function ContractsPage() {
  const role = await getCurrentRole();
  if (!roleAtLeast(role, 'manager')) {
    return (
      <PageContainer pageTitle='Hợp đồng lao động' access={false}>
        <div />
      </PageContainer>
    );
  }
  const rows = await listContracts();
  const canCreate = roleAtLeast(role, 'hr');
  const empOpts = canCreate ? await employeeOptions() : [];

  const columns: Column<Row>[] = [
    { header: 'Số HĐ', cell: (r) => r.contractNumber, className: 'font-medium' },
    { header: 'Nhân viên', cell: (r) => `${r.employeeCode ?? ''} ${r.employeeName ?? ''}` },
    { header: 'Loại', cell: (r) => TYPE_LABEL[r.type] ?? r.type },
    { header: 'Bắt đầu', cell: (r) => r.startDate },
    { header: 'Kết thúc', cell: (r) => renderExpiry(r.endDate) },
    {
      header: 'Lương cơ bản',
      cell: (r) => Number(r.baseSalary).toLocaleString('vi-VN') + ' ₫'
    }
  ];

  return (
    <PageContainer
      pageTitle='Hợp đồng lao động'
      pageDescription='Theo dõi loại hợp đồng, thời hạn và cảnh báo gia hạn hợp đồng sắp hết hạn (≤ 30 ngày).'
      pageHeaderAction={
        canCreate ? (
          <EntityFormDialog
            triggerLabel='Thêm hợp đồng'
            title='Thêm hợp đồng lao động'
            action={createContract}
            fields={[
              { name: 'employeeId', label: 'Nhân viên', type: 'select', options: empOpts, required: true, colSpan: 2 },
              { name: 'contractNumber', label: 'Số hợp đồng', required: true },
              {
                name: 'type',
                label: 'Loại hợp đồng',
                type: 'select',
                required: true,
                options: Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label }))
              },
              { name: 'startDate', label: 'Ngày bắt đầu', type: 'date', required: true },
              { name: 'endDate', label: 'Ngày kết thúc', type: 'date' },
              { name: 'baseSalary', label: 'Lương cơ bản (₫)', type: 'number', required: true }
            ]}
          />
        ) : undefined
      }
    >
      <SimpleTable columns={columns} rows={rows} emptyText='Chưa có hợp đồng nào.' />
    </PageContainer>
  );
}

function renderExpiry(endDate: string | null) {
  if (!endDate) return <span className='text-muted-foreground'>Vô thời hạn</span>;
  const days = differenceInCalendarDays(parseISO(endDate), new Date());
  if (days < 0) return <Badge variant='destructive'>Hết hạn ({endDate})</Badge>;
  if (days <= 30)
    return <Badge variant='secondary'>Sắp hết hạn: {endDate} ({days} ngày)</Badge>;
  return <span>{endDate}</span>;
}
