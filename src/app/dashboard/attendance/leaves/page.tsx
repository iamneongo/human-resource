import type { SearchParams } from 'nuqs/server';

import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { buttonVariants } from '@/components/ui/button';
import { ApprovalActions } from '@/features/hr/common/approval-actions';
import { EntityFormDialog } from '@/features/hr/common/entity-form-dialog';
import { departmentOptions, employeeOptions } from '@/features/hr/common/lookups';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import {
  approveLeave,
  createLeave,
  listLeaves,
  rejectLeave
} from '@/features/hr/attendance/leaves';
import { getCurrentEmployeeId, getCurrentRole, roleAtLeast } from '@/lib/rbac';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export const metadata = { title: 'HRM: Nghỉ phép' };

const TYPE_LABEL: Record<string, string> = {
  annual: 'Phép năm',
  sick: 'Nghỉ ốm',
  maternity: 'Thai sản',
  unpaid: 'Không lương',
  other: 'Khác'
};
const STATUS: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
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
  const selfId = isManager ? undefined : await getCurrentEmployeeId();
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
      onlyEmployeeId: selfId ?? undefined,
      employeeId: isManager ? employeeId || undefined : undefined,
      departmentId: isManager ? departmentId || undefined : undefined,
      type: type || undefined,
      status: status || undefined,
      search: search || undefined
    }),
    roleAtLeast(role, 'hr') ? employeeOptions() : Promise.resolve([]),
    isManager ? departmentOptions() : Promise.resolve([])
  ]);

  const columns: Column<Row>[] = [
    { header: 'Loại phép', cell: (r) => TYPE_LABEL[r.type] ?? r.type, className: 'font-medium' },
    {
      header: 'Nhân sự',
      cell: (r) => `${r.employeeCode ?? ''} ${r.employeeName ?? ''}`.trim() || '—'
    },
    { header: 'Phòng ban', cell: (r) => r.departmentName ?? '—' },
    { header: 'Từ ngày', cell: (r) => r.startDate },
    { header: 'Đến ngày', cell: (r) => r.endDate },
    { header: 'Số ngày', cell: (r) => r.days },
    {
      header: 'Tác động số dư phép',
      cell: (r) => (
        <div className='flex min-w-[140px] flex-col gap-1'>
          <span className='font-medium'>{r.remainingDays ?? '0'} ngày còn lại</span>
          <span className='text-muted-foreground text-xs'>
            {r.status === 'approved'
              ? 'Đã phản ánh vào số dư phép'
              : 'Sẽ cập nhật khi đơn được duyệt'}
          </span>
        </div>
      )
    },
    {
      header: 'Trạng thái',
      cell: (r) => {
        const s = STATUS[r.status] ?? { label: r.status, variant: 'outline' as const };
        return <Badge variant={s.variant}>{s.label}</Badge>;
      }
    },
    ...(isManager
      ? [
          {
            header: '',
            cell: (r: Row) => (
              <ApprovalActions
                id={r.id}
                status={r.status}
                approve={approveLeave}
                reject={rejectLeave}
              />
            )
          }
        ]
      : [])
  ];

  return (
    <PageContainer
      pageTitle='Nghỉ phép'
      pageHeaderAction={
        <EntityFormDialog
          triggerLabel='Tạo đơn nghỉ'
          title='Tạo đơn nghỉ phép'
          action={createLeave}
          defaults={{ type: 'annual' }}
          fields={[
            ...(empOpts.length
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
      }
    >
      <div className='space-y-4'>
        <div className='grid gap-3 md:grid-cols-4'>
          <SummaryCard
            label='Tổng đơn hiển thị'
            value={rows.length}
            helper='Theo bộ lọc hiện tại'
          />
          <SummaryCard
            label='Đang chờ duyệt'
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
            helper='Dễ demo tác động số dư phép'
          />
        </div>

        {isManager ? (
          <form className='grid gap-3 rounded-2xl border bg-card p-4 md:grid-cols-2 xl:grid-cols-5'>
            <div className='space-y-1.5'>
              <Label htmlFor='search'>Tìm nhân sự</Label>
              <input
                id='search'
                name='search'
                defaultValue={search}
                placeholder='Mã NV, họ tên, phòng ban...'
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
              <Label htmlFor='departmentId'>Phòng ban</Label>
              <select
                id='departmentId'
                name='departmentId'
                defaultValue={departmentId}
                className='border-input bg-background ring-offset-background flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
              >
                <option value=''>Tất cả phòng ban</option>
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
                {Object.entries(STATUS).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </div>
            <div className='flex gap-2 md:col-span-2 xl:col-span-5'>
              <button type='submit' className={cn(buttonVariants())}>
                Áp dụng bộ lọc
              </button>
              <Link
                href='/dashboard/attendance/leaves'
                className={cn(buttonVariants({ variant: 'outline' }))}
              >
                Xóa lọc
              </Link>
            </div>
          </form>
        ) : null}

        <SimpleTable
          columns={columns}
          rows={rows}
          emptyText='Chưa có đơn nghỉ nào. Hãy tạo đơn nghỉ đầu tiên để bắt đầu demo quy trình phép.'
        />
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
