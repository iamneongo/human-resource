import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Icons } from '@/components/icons';
import { ConfirmDeleteDialog } from '@/features/hr/common/confirm-delete-dialog';
import { EntityFormDialog } from '@/features/hr/common/entity-form-dialog';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import { CreateContractFlowDialog } from '@/features/hr/contracts/create-contract-flow-dialog';
import { ContractExpiryBadge } from '@/features/hr/employees/components/contract-expiry-badge';
import { StatusBadge } from '@/features/hr/common/status-badge';
import { createContract, deleteContract, updateContract } from '@/features/hr/contracts/actions';
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
  CONTRACT_TYPE_OPTS.map((option) => [option.value, option.label])
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
    (contract) =>
      contract.status === 'active' && getContractExpiryStatus(contract.endDate) === 'warning'
  );

  async function addContract(values: Record<string, string>) {
    'use server';
    return createContract({ ...values, employeeId });
  }

  const columns: Column<Row>[] = [
    { header: 'Số HĐ', cell: (contract) => contract.contractNumber, className: 'font-medium' },
    { header: 'Loại', cell: (contract) => CONTRACT_TYPE[contract.type] ?? contract.type },
    { header: 'Từ ngày', cell: (contract) => contract.startDate },
    { header: 'Đến ngày', cell: (contract) => contract.endDate ?? '—' },
    { header: 'Lương HĐ', cell: (contract) => formatVND(contract.baseSalary) },
    {
      header: 'Trạng thái',
      cell: (contract) => <StatusBadge status={contract.status} prefix='contract' />
    },
    { header: 'Hạn', cell: (contract) => <ContractExpiryBadge endDate={contract.endDate} /> },
    ...(canEdit
      ? [
          {
            header: '',
            cell: (contract: Row) => (
              <div className='flex justify-end gap-1'>
                <EntityFormDialog
                  mode='edit'
                  title={`Sửa HĐ: ${contract.contractNumber}`}
                  action={updateContract.bind(null, contract.id)}
                  defaults={{
                    contractNumber: contract.contractNumber,
                    type: contract.type,
                    startDate: contract.startDate,
                    endDate: contract.endDate ?? '',
                    baseSalary: contract.baseSalary,
                    status: contract.status
                  }}
                  fields={CONTRACT_FIELDS}
                />
                <ConfirmDeleteDialog
                  label={`HĐ ${contract.contractNumber}`}
                  action={deleteContract.bind(null, contract.id)}
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
            {expiring
              .map((contract) => `HĐ ${contract.contractNumber} hết hạn ${contract.endDate}`)
              .join(' · ')}
          </AlertDescription>
        </Alert>
      )}

      <div className='flex items-center justify-between gap-3'>
        <div className='space-y-1'>
          <p className='text-muted-foreground text-sm'>{contracts.length} hợp đồng</p>
          {canEdit ? (
            <p className='text-muted-foreground text-xs'>
              Sau khi lưu hợp đồng, hệ thống sẽ mở ngay bước đính kèm tài liệu nếu bạn muốn upload
              file.
            </p>
          ) : null}
        </div>
        {canEdit ? (
          <CreateContractFlowDialog
            triggerLabel='Thêm hợp đồng'
            title='Thêm hợp đồng lao động'
            action={addContract}
            fields={CONTRACT_FIELDS}
          />
        ) : null}
      </div>

      <SimpleTable columns={columns} rows={contracts} emptyText='Chưa có hợp đồng lao động.' />
    </div>
  );
}
