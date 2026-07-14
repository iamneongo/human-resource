import { differenceInCalendarDays, parseISO } from 'date-fns';

import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { ConfirmDeleteDialog } from '@/features/hr/common/confirm-delete-dialog';
import { EntityFormDialog } from '@/features/hr/common/entity-form-dialog';
import { employeeOptions } from '@/features/hr/common/lookups';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import {
  createContract,
  deleteContract,
  listContracts,
  updateContract
} from '@/features/hr/contracts/actions';
import { ContractFileCell } from '@/features/hr/contracts/contract-file-cell';
import { CreateContractFlowDialog } from '@/features/hr/contracts/create-contract-flow-dialog';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';
import { formatVND } from '@/lib/format';

export const metadata = { title: 'HRM: Hợp đồng lao động' };

const TYPE_LABEL: Record<string, string> = {
  probation: 'Thử việc',
  fixed_term: 'Xác định thời hạn',
  term_1y: 'HĐLĐ 1 năm',
  term_3y: 'HĐLĐ 3 năm',
  indefinite: 'Không xác định thời hạn',
  until_retirement: 'Đến tuổi nghỉ hưu',
  seasonal: 'Thời vụ'
};

type Row = Awaited<ReturnType<typeof listContracts>>[number];

export default async function ContractsPage() {
  const role = await getCurrentRole();

  if (!roleAtLeast(role, 'manager')) {
    return (
      <PageContainer
        pageTitle='Hợp đồng lao động'
        access={false}
        accessFallback={
          <div className='text-muted-foreground text-center text-lg'>
            Bạn không có quyền xem danh sách hợp đồng lao động.
          </div>
        }
      >
        <div />
      </PageContainer>
    );
  }

  const rows = await listContracts();
  const canCreate = roleAtLeast(role, 'hr');
  const employeeSelectOptions = canCreate ? await employeeOptions() : [];

  const columns: Column<Row>[] = [
    { header: 'Số hợp đồng', cell: (row) => row.contractNumber, className: 'font-medium' },
    {
      header: 'Nhân viên',
      cell: (row) => `${row.employeeCode ?? ''} ${row.employeeName ?? ''}`.trim()
    },
    { header: 'Loại hợp đồng', cell: (row) => TYPE_LABEL[row.type] ?? row.type },
    { header: 'Bắt đầu', cell: (row) => row.startDate },
    { header: 'Kết thúc', cell: (row) => renderExpiry(row.endDate) },
    { header: 'Lương cơ bản', cell: (row) => formatVND(row.baseSalary) },
    {
      header: 'Tài liệu',
      cell: (row) => (
        <ContractFileCell
          contractId={row.id}
          contractNumber={row.contractNumber}
          fileUrl={row.fileUrl ?? null}
          fileName={row.fileName ?? null}
          fileMimeType={row.fileMimeType ?? null}
          canUpload={canCreate}
        />
      )
    },
    ...(canCreate
      ? [
          {
            header: '',
            cell: (row: Row) => (
              <div className='flex justify-end gap-1'>
                <EntityFormDialog
                  mode='edit'
                  title={`Sửa hợp đồng: ${row.contractNumber}`}
                  action={updateContract.bind(null, row.id)}
                  defaults={{
                    contractNumber: row.contractNumber,
                    type: row.type,
                    startDate: row.startDate,
                    endDate: row.endDate ?? '',
                    baseSalary: row.baseSalary,
                    status: row.status
                  }}
                  fields={[
                    { name: 'contractNumber', label: 'Số hợp đồng', required: true },
                    {
                      name: 'type',
                      label: 'Loại hợp đồng',
                      type: 'select' as const,
                      required: true,
                      options: Object.entries(TYPE_LABEL).map(([value, label]) => ({
                        value,
                        label
                      }))
                    },
                    {
                      name: 'startDate',
                      label: 'Ngày bắt đầu',
                      type: 'date' as const,
                      required: true
                    },
                    { name: 'endDate', label: 'Ngày kết thúc', type: 'date' as const },
                    {
                      name: 'baseSalary',
                      label: 'Lương cơ bản (₫)',
                      type: 'number' as const,
                      required: true
                    },
                    {
                      name: 'status',
                      label: 'Trạng thái',
                      type: 'select' as const,
                      options: [
                        { value: 'active', label: 'Hiệu lực' },
                        { value: 'expired', label: 'Hết hạn' },
                        { value: 'terminated', label: 'Chấm dứt' }
                      ]
                    }
                  ]}
                  successMessage='Đã cập nhật hợp đồng'
                />
                <ConfirmDeleteDialog
                  label={`hợp đồng ${row.contractNumber}`}
                  action={deleteContract.bind(null, row.id)}
                />
              </div>
            )
          }
        ]
      : [])
  ];

  return (
    <PageContainer
      pageTitle='Hợp đồng lao động'
      pageDescription='Lưu thông tin hợp đồng trước, sau đó tiếp tục đính kèm file để hoàn tất hồ sơ pháp lý. Cách này giúp người dùng không bị lạc flow khi nhập mới.'
      pageHeaderAction={
        canCreate ? (
          <CreateContractFlowDialog
            triggerLabel='Thêm hợp đồng'
            title='Thêm hợp đồng lao động'
            action={createContract}
            fields={[
              {
                name: 'employeeId',
                label: 'Nhân viên',
                type: 'select',
                options: employeeSelectOptions,
                required: true,
                colSpan: 2
              },
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
              {
                name: 'baseSalary',
                label: 'Lương cơ bản (₫)',
                type: 'number',
                required: true
              }
            ]}
          />
        ) : undefined
      }
    >
      <SimpleTable
        columns={columns}
        rows={rows}
        emptyText='Chưa có hợp đồng nào. Hãy thêm hợp đồng đầu tiên để bắt đầu quản lý hồ sơ lao động.'
      />
    </PageContainer>
  );
}

function renderExpiry(endDate: string | null) {
  if (!endDate) return <span className='text-muted-foreground'>Không thời hạn</span>;

  const days = differenceInCalendarDays(parseISO(endDate), new Date());

  if (days < 0) return <Badge variant='destructive'>Hết hạn ({endDate})</Badge>;

  if (days <= 30) {
    return (
      <Badge variant='secondary'>
        Sắp hết hạn: {endDate} ({days} ngày)
      </Badge>
    );
  }

  return <span>{endDate}</span>;
}
