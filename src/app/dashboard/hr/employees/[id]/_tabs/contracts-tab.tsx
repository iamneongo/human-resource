import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Icons } from '@/components/icons';
import { EntityFormDialog } from '@/features/hr/common/entity-form-dialog';
import { ConfirmDeleteDialog } from '@/features/hr/common/confirm-delete-dialog';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import { StatusBadge } from '@/features/hr/common/status-badge';
import { ContractExpiryBadge } from '@/features/hr/employees/components/contract-expiry-badge';
import { createContract, updateContract, deleteContract } from '@/features/hr/contracts/actions';
import { getEmployeeContracts } from '@/features/hr/employees/actions';
import { getContractExpiryStatus } from '@/lib/contract-utils';
import { formatVND } from '@/lib/format';

const CONTRACT_TYPE_OPTS = [
  { value: 'probation', label: 'Thử việc' },
  { value: 'fixed_term', label: 'XĐ thời hạn' },
  { value: 'term_1y', label: 'HĐLĐ 1 năm' },
  { value: 'term_3y', label: 'HĐLĐ 3 năm' },
  { value: 'indefinite', label: 'KXĐ thời hạn' },
  { value: 'until_retirement', label: 'Đến hưu' },
  { value: 'seasonal', label: 'Thời vụ' }
];

const CONTRACT_TYPE: Record<string, string> = Object.fromEntries(
  CONTRACT_TYPE_OPTS.map((o) => [o.value, o.label])
);

const STATUS_OPTS = [
  { value: 'active', label: 'Hiệu lực' },
  { value: 'expired', label: 'Hết hạn' },
  { value: 'terminated', label: 'Chấm dứt' }
];

const CONTRACT_FIELDS = [
  { name: 'contractNumber', label: 'Số hợp đồng', required: true },
  {
    name: 'type',
    label: 'Loại hợp đồng',
    type: 'select' as const,
    required: true,
    options: CONTRACT_TYPE_OPTS
  },
  { name: 'startDate', label: 'Ngày bắt đầu', type: 'date' as const, required: true },
  { name: 'endDate', label: 'Ngày kết thúc', type: 'date' as const },
  { name: 'baseSalary', label: 'Lương cơ bản (₫)', type: 'number' as const, required: true },
  { name: 'status', label: 'Trạng thái', type: 'select' as const, options: STATUS_OPTS }
];

type Row = Awaited<ReturnType<typeof getEmployeeContracts>>[number];

export async function ContractsTab({
  employeeId,
  canEdit
}: {
  employeeId: string;
  canEdit: boolean;
}) {
  const contracts = await getEmployeeContracts(employeeId);
  const expiring = contracts.filter(
    (c) => c.status === 'active' && getContractExpiryStatus(c.endDate) === 'warning'
  );

  async function addContract(v: Record<string, string>) {
    'use server';
    return createContract({ ...v, employeeId });
  }

  const cols: Column<Row>[] = [
    { header: 'Số HĐ', cell: (c) => c.contractNumber, className: 'font-medium' },
    { header: 'Loại', cell: (c) => CONTRACT_TYPE[c.type] ?? c.type },
    { header: 'Từ ngày', cell: (c) => c.startDate },
    { header: 'Đến ngày', cell: (c) => c.endDate ?? '—' },
    { header: 'Lương HĐ', cell: (c) => formatVND(c.baseSalary) },
    { header: 'Trạng thái', cell: (c) => <StatusBadge status={c.status} prefix='contract' /> },
    { header: 'Hạn', cell: (c) => <ContractExpiryBadge endDate={c.endDate} /> },
    ...(canEdit
      ? [
          {
            header: '',
            cell: (c: Row) => (
              <div className='flex justify-end gap-1'>
                <EntityFormDialog
                  mode='edit'
                  title={`Sửa HĐ: ${c.contractNumber}`}
                  action={updateContract.bind(null, c.id)}
                  defaults={{
                    contractNumber: c.contractNumber,
                    type: c.type,
                    startDate: c.startDate,
                    endDate: c.endDate ?? '',
                    baseSalary: c.baseSalary,
                    status: c.status
                  }}
                  fields={CONTRACT_FIELDS}
                />
                <ConfirmDeleteDialog
                  label={`HĐ ${c.contractNumber}`}
                  action={deleteContract.bind(null, c.id)}
                />
              </div>
            )
          }
        ]
      : [])
  ];

  return (
    <div className='space-y-4'>
      {expiring.length > 0 && (
        <Alert className='border-amber-300 bg-amber-50 dark:bg-amber-950/20'>
          <Icons.notification className='h-4 w-4 text-amber-600' />
          <AlertTitle className='text-amber-800 dark:text-amber-400'>
            Hợp đồng sắp hết hạn
          </AlertTitle>
          <AlertDescription className='text-amber-700 dark:text-amber-300'>
            {expiring.map((c) => `HĐ ${c.contractNumber} hết hạn ${c.endDate}`).join(' · ')}
          </AlertDescription>
        </Alert>
      )}
      <div className='flex items-center justify-between'>
        <p className='text-muted-foreground text-sm'>{contracts.length} hợp đồng</p>
        {canEdit && (
          <EntityFormDialog
            triggerLabel='Thêm hợp đồng'
            title='Thêm hợp đồng lao động'
            action={addContract}
            fields={CONTRACT_FIELDS}
          />
        )}
      </div>
      <SimpleTable columns={cols} rows={contracts} emptyText='Chưa có hợp đồng lao động.' />
    </div>
  );
}
