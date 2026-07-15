import type { SearchParams } from 'nuqs/server';

import Link from 'next/link';

import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ApprovalActions } from '@/features/hr/common/approval-actions';
import { EntityFormDialog } from '@/features/hr/common/entity-form-dialog';
import { departmentOptions, employeeOptions } from '@/features/hr/common/lookups';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import { LeaveRequestActions } from '@/features/hr/attendance/leave-request-actions';
import { LeaveRequestDetailDialog } from '@/features/hr/attendance/leave-request-detail-dialog';
import {
  approveLeave,
  cancelLeave,
  createLeave,
  listLeaves,
  rejectLeave
} from '@/features/hr/attendance/leaves';
import { getCurrentEmployeeId, getCurrentRole, roleAtLeast } from '@/lib/rbac';
import { cn } from '@/lib/utils';

export const metadata = { title: 'HRM: Nghỉ phép' };

const TYPE_LABEL: Record<string, string> = {
  annual: 'Phép năm',
  sick: 'Nghỉ ốm',
  maternity: 'Thai sản',
  unpaid: 'Không lương',
  other: 'Khác'
};

const STATUS_META: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  draft: { label: 'Nháp', variant: 'secondary' },
  pending: { label: 'Chờ duyệt', variant: 'outline' },
  approved: { label: 'Đã duyệt', variant: 'default' },
  rejected: { label: 'Từ chối', variant: 'destructive' },
  cancelled: { label: 'Đã hủy', variant: 'secondary' }
};

type Row = Awaited<ReturnType<typeof listLeaves>>[number];

type PageProps = {
  searchParams?: Promise<SearchParams>;
};

function getQueryValue(value: string | string[] | undefined) {
  return typeof value === 'string' ? value : Array.isArray(value) ? value[0] : '';
}

export default async function LeavesPage(props: PageProps) {
  const role = await getCurrentRole();
  if (!role) {
    return (
      <PageContainer pageTitle='Nghỉ phép' access={false}>
        <div />
      </PageContainer>
    );
  }

  const isManager = roleAtLeast(role, 'manager');
  const isHr = roleAtLeast(role, 'hr');
  const selfId = await getCurrentEmployeeId();

  if (!isManager && !selfId) {
    return (
      <PageContainer
        pageTitle='Nghỉ phép'
        access={false}
        accessFallback={
          <div className='text-muted-foreground text-center text-lg'>
            Tài khoản của bạn chưa được liên kết với hồ sơ nhân sự. Vui lòng liên hệ HR.
          </div>
        }
      >
        <div />
      </PageContainer>
    );
  }

  const searchParams = await props.searchParams;
  const employeeId = getQueryValue(searchParams?.employeeId);
  const departmentId = getQueryValue(searchParams?.departmentId);
  const type = getQueryValue(searchParams?.type);
  const status = getQueryValue(searchParams?.status);
  const search = getQueryValue(searchParams?.search);

  const [rows, empOpts, deptOpts] = await Promise.all([
    listLeaves({
      onlyEmployeeId: isManager ? undefined : (selfId ?? undefined),
      employeeId: isManager ? employeeId || undefined : undefined,
      departmentId: isManager ? departmentId || undefined : undefined,
      type: type || undefined,
      status: status || undefined,
      search: search || undefined
    }),
    isHr ? employeeOptions() : Promise.resolve([]),
    isManager ? departmentOptions() : Promise.resolve([])
  ]);

  const columns: Column<Row>[] = [
    {
      header: 'Đơn nghỉ',
      cell: (row) => (
        <div className='min-w-[220px] space-y-1'>
          <div className='font-medium'>{TYPE_LABEL[row.type] ?? row.type}</div>
          <div className='text-muted-foreground text-xs'>
            {row.startDate} → {row.endDate} · {row.days} ngày
          </div>
        </div>
      )
    },
    {
      header: 'Nhân sự',
      cell: (row) => (
        <div className='min-w-[180px]'>
          <div className='font-medium'>{row.employeeName ?? '—'}</div>
          <div className='text-muted-foreground text-xs'>{row.employeeCode ?? '—'}</div>
        </div>
      )
    },
    { header: 'Bộ phận', cell: (row) => row.departmentName ?? '—' },
    {
      header: 'Tác động phép',
      cell: (row) => (
        <div className='min-w-[160px] space-y-1'>
          <div className='font-medium'>{row.remainingDays ?? '0'} ngày còn lại</div>
          <div className='text-muted-foreground text-xs'>
            {row.status === 'approved'
              ? 'Đã trừ số dư phép và phản ánh vào cảnh báo công'
              : 'Sẽ cập nhật sau khi đơn được duyệt'}
          </div>
        </div>
      )
    },
    {
      header: 'Trạng thái',
      cell: (row) => {
        const statusMeta = STATUS_META[row.status] ?? {
          label: row.status,
          variant: 'outline' as const
        };
        return <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>;
      }
    },
    {
      header: 'Chi tiết',
      cell: (row) => {
        const statusMeta = STATUS_META[row.status] ?? {
          label: row.status,
          variant: 'outline' as const
        };
        return (
          <LeaveRequestDetailDialog
            row={{
              typeLabel: TYPE_LABEL[row.type] ?? row.type,
              statusLabel: statusMeta.label,
              statusVariant: statusMeta.variant,
              employeeName: row.employeeName ?? '—',
              employeeCode: row.employeeCode ?? '—',
              departmentName: row.departmentName ?? '—',
              startDate: row.startDate,
              endDate: row.endDate,
              days: row.days,
              reason: row.reason,
              remainingDays: row.remainingDays,
              entitledDays: row.entitledDays,
              usedDays: row.usedDays
            }}
          />
        );
      }
    },
    {
      header: 'Thao tác',
      cell: (row) => (
        <div className='flex flex-wrap gap-2'>
          {isManager ? (
            <ApprovalActions
              id={row.id}
              status={row.status}
              approve={approveLeave}
              reject={rejectLeave}
            />
          ) : null}
          <LeaveRequestActions
            leaveId={row.id}
            canCancel={
              Boolean(selfId) &&
              row.employeeId === selfId &&
              ['draft', 'pending'].includes(row.status)
            }
            cancel={cancelLeave}
          />
        </div>
      )
    }
  ];

  return (
    <PageContainer
      pageTitle='Nghỉ phép'
      pageHeaderAction={
        <div data-tour='leaves-create'>
          <EntityFormDialog
            triggerLabel='Tạo đơn nghỉ'
            title='Tạo đơn nghỉ phép'
            action={createLeave}
            defaults={{ type: 'annual' }}
            fields={[
              ...(isHr
                ? [
                    {
                      name: 'employeeId',
                      label: 'Nhân sự',
                      type: 'select' as const,
                      options: empOpts,
                      colSpan: 2 as const
                    }
                  ]
                : []),
              {
                name: 'type',
                label: 'Loại phép',
                type: 'select',
                required: true,
                options: Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label }))
              },
              { name: 'startDate', label: 'Từ ngày', type: 'date', required: true },
              { name: 'endDate', label: 'Đến ngày', type: 'date', required: true },
              { name: 'reason', label: 'Lý do', type: 'textarea' }
            ]}
          />
        </div>
      }
    >
      <div className='space-y-4'>
        <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-4' data-tour='leaves-summary'>
          <SummaryCard
            label='Tổng đơn đang hiển thị'
            value={rows.length}
            helper='Theo bộ lọc hiện tại'
          />
          <SummaryCard
            label='Chờ duyệt'
            value={rows.filter((row) => row.status === 'pending').length}
            helper='Cần quản lý xử lý'
          />
          <SummaryCard
            label='Đã duyệt'
            value={rows.filter((row) => row.status === 'approved').length}
            helper='Đã phản ánh vào phép và cảnh báo công'
          />
          <SummaryCard
            label='Phép năm'
            value={rows.filter((row) => row.type === 'annual').length}
            helper='Theo dõi chặt số dư phép năm'
          />
        </div>

        <div className='rounded-2xl border bg-card p-4 text-sm'>
          Đơn nghỉ đã duyệt sẽ ảnh hưởng tới số dư phép năm và cảnh báo trên bảng chấm công tuần.
        </div>

        {isManager ? (
          <form
            className='grid gap-3 rounded-2xl border bg-card p-4 md:grid-cols-2 xl:grid-cols-5'
            data-tour='leaves-filters'
          >
            <div className='space-y-1.5'>
              <Label htmlFor='search'>Tìm nhân sự</Label>
              <input
                id='search'
                name='search'
                defaultValue={search}
                placeholder='Mã NV, họ tên, bộ phận...'
                className='border-input bg-background ring-offset-background flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
              />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='employeeId'>Nhân sự</Label>
              <select
                id='employeeId'
                name='employeeId'
                defaultValue={employeeId}
                className='border-input bg-background ring-offset-background flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
              >
                <option value=''>Tất cả nhân sự</option>
                {empOpts.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='departmentId'>Bộ phận</Label>
              <select
                id='departmentId'
                name='departmentId'
                defaultValue={departmentId}
                className='border-input bg-background ring-offset-background flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
              >
                <option value=''>Tất cả bộ phận</option>
                {deptOpts.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='type'>Loại phép</Label>
              <select
                id='type'
                name='type'
                defaultValue={type}
                className='border-input bg-background ring-offset-background flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
              >
                <option value=''>Tất cả loại phép</option>
                {Object.entries(TYPE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='status'>Trạng thái</Label>
              <select
                id='status'
                name='status'
                defaultValue={status}
                className='border-input bg-background ring-offset-background flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
              >
                <option value=''>Tất cả trạng thái</option>
                {Object.entries(STATUS_META).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </div>
            <div className='flex gap-2 md:col-span-2 xl:col-span-5'>
              <Button type='submit'>Áp dụng bộ lọc</Button>
              <Link
                href='/dashboard/attendance/leaves'
                className={cn(buttonVariants({ variant: 'outline' }))}
              >
                Xóa lọc
              </Link>
            </div>
          </form>
        ) : (
          <div className='flex items-center justify-between rounded-2xl border bg-card p-4 text-sm'>
            <span>Chỉ hiển thị các đơn nghỉ của chính bạn.</span>
            <Link
              href='/dashboard/attendance/leave-balances'
              className={cn(buttonVariants({ variant: 'outline' }))}
            >
              Xem số dư phép
            </Link>
          </div>
        )}

        <div data-tour='leaves-table'>
          <SimpleTable
            columns={columns}
            rows={rows}
            emptyText={
              isManager
                ? 'Chưa có đơn nghỉ phù hợp với bộ lọc hiện tại.'
                : 'Bạn chưa có đơn nghỉ nào. Hãy tạo đơn đầu tiên để bắt đầu quy trình nghỉ phép.'
            }
          />
        </div>
      </div>
    </PageContainer>
  );
}

function SummaryCard({ label, value, helper }: { label: string; value: number; helper: string }) {
  return (
    <div className='rounded-xl border bg-card p-4'>
      <div className='text-muted-foreground text-xs uppercase tracking-wide'>{label}</div>
      <div className='mt-2 text-2xl font-semibold'>{value}</div>
      <div className='text-muted-foreground mt-1 text-sm'>{helper}</div>
    </div>
  );
}
