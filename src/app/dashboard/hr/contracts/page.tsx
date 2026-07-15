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
  getContractOverview,
  listContracts,
  updateContract
} from '@/features/hr/contracts/actions';
import { ContractFileCell } from '@/features/hr/contracts/contract-file-cell';
import { ContractQuickActions } from '@/features/hr/contracts/contract-quick-actions';
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

function getLifecycleStatus(row: Row) {
  if (row.status === 'terminated') return { label: 'Chấm dứt', variant: 'destructive' as const };
  if (!row.endDate) return { label: 'Đang hiệu lực', variant: 'default' as const };

  const days = differenceInCalendarDays(parseISO(row.endDate), new Date());
  if (days < 0) return { label: 'Đã hết hạn', variant: 'destructive' as const };
  if (days <= 15) return { label: 'Cần tái ký', variant: 'destructive' as const };
  if (days <= 45) return { label: 'Sắp hết hạn', variant: 'outline' as const };
  return { label: 'Đang hiệu lực', variant: 'default' as const };
}

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

  const [rows, overview] = await Promise.all([listContracts(), getContractOverview()]);
  const canCreate = roleAtLeast(role, 'hr');
  const employeeSelectOptions = canCreate ? await employeeOptions() : [];

  const columns: Column<Row>[] = [
    { header: 'Số hợp đồng', cell: (row) => row.contractNumber, className: 'font-medium' },
    {
      header: 'Nhân sự',
      cell: (row) => `${row.employeeCode ?? ''} ${row.employeeName ?? ''}`.trim()
    },
    { header: 'Loại hợp đồng', cell: (row) => TYPE_LABEL[row.type] ?? row.type },
    { header: 'Bắt đầu', cell: (row) => row.startDate },
    { header: 'Kết thúc', cell: (row) => row.endDate ?? 'Không thời hạn' },
    { header: 'Lương cơ bản', cell: (row) => formatVND(row.baseSalary) },
    {
      header: 'Hiệu lực',
      cell: (row) => {
        const meta = getLifecycleStatus(row);
        return <Badge variant={meta.variant}>{meta.label}</Badge>;
      }
    },
    {
      header: 'Tài liệu',
      cell: (row) => (
        <div className='flex min-w-[180px] flex-col gap-1'>
          <ContractFileCell
            contractId={row.id}
            contractNumber={row.contractNumber}
            fileUrl={row.fileUrl ?? null}
            fileName={row.fileName ?? null}
            fileMimeType={row.fileMimeType ?? null}
            canUpload={canCreate}
          />
          {!row.fileUrl ? (
            <Badge variant='destructive' className='w-fit'>
              Chưa đính file
            </Badge>
          ) : null}
        </div>
      )
    },
    {
      header: 'Trạng thái ký',
      cell: () => <Badge variant='outline'>Chưa tích hợp ký số</Badge>
    },
    ...(canCreate
      ? [
          {
            header: 'Thao tác nhanh',
            cell: (row: Row) => <ContractQuickActions contractId={row.id} />
          },
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
      pageHeaderAction={
        canCreate ? (
          <div data-tour='contracts-create'>
            <CreateContractFlowDialog
              triggerLabel='Thêm hợp đồng'
              title='Thêm hợp đồng lao động'
              action={createContract}
              fields={[
                {
                  name: 'employeeId',
                  label: 'Nhân sự',
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
          </div>
        ) : undefined
      }
    >
      <div className='space-y-4'>
        <div className='grid gap-3 md:grid-cols-5' data-tour='contracts-summary'>
          <SummaryCard
            label='Tổng hợp đồng'
            value={overview.totalContracts}
            helper='Toàn bộ hồ sơ đang quản lý'
          />
          <SummaryCard
            label='Đang hiệu lực'
            value={overview.activeContracts}
            helper='Có thể dùng để chạy demo lifecycle'
          />
          <SummaryCard
            label='Chưa đính file'
            value={overview.missingFiles}
            helper='Cần xử lý bước upload tài liệu'
          />
          <SummaryCard
            label='Sắp hết hạn 30 ngày'
            value={overview.expiring30}
            helper='Case cảnh báo gấp'
          />
          <SummaryCard
            label='Sắp hết hạn 60/90 ngày'
            value={`${overview.expiring60}/${overview.expiring90}`}
            helper='Theo dõi gia hạn và tái ký'
          />
        </div>

        <div className='min-w-0 overflow-hidden' data-tour='contracts-table'>
          <SimpleTable
            columns={columns}
            rows={rows}
            emptyText='Chưa có hợp đồng nào. Hãy thêm hợp đồng đầu tiên để bắt đầu quản lý hồ sơ lao động.'
          />
        </div>
      </div>
    </PageContainer>
  );
}

function SummaryCard({
  label,
  value,
  helper
}: {
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <div className='rounded-xl border bg-card p-4'>
      <div className='text-muted-foreground text-xs uppercase tracking-wide'>{label}</div>
      <div className='mt-2 text-2xl font-semibold'>{value}</div>
      <div className='text-muted-foreground mt-1 text-sm'>{helper}</div>
    </div>
  );
}
