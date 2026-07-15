import Link from 'next/link';

import type { SearchParams } from 'nuqs/server';

import { Icons } from '@/components/icons';
import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { departmentOptions } from '@/features/hr/common/lookups';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import { listEmployees } from '@/features/hr/employees/actions';
import { EmployeesFilters } from '@/features/hr/employees/components/employees-filters';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';
import { cn } from '@/lib/utils';

const STATUS_META: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
> = {
  active: { label: 'Đang làm việc', variant: 'default' },
  probation: { label: 'Thử việc', variant: 'secondary' },
  on_leave: { label: 'Đang nghỉ phép', variant: 'outline' },
  terminated: { label: 'Đã nghỉ việc', variant: 'destructive' }
};

const DOCUMENT_META: Record<
  string,
  { label: string; variant: 'default' | 'outline' | 'destructive' }
> = {
  complete: { label: 'Đủ hồ sơ', variant: 'default' },
  expiring: { label: 'Có giấy tờ sắp hết hạn', variant: 'outline' },
  missing: { label: 'Thiếu hồ sơ', variant: 'destructive' }
};

type Row = Awaited<ReturnType<typeof listEmployees>>[number];

export const metadata = {
  title: 'HRM: Hồ sơ nhân viên'
};

type PageProps = {
  searchParams: Promise<SearchParams>;
};

function getQueryValue(value: string | string[] | undefined) {
  return typeof value === 'string' ? value : Array.isArray(value) ? value[0] : '';
}

export default async function EmployeesPage(props: PageProps) {
  const role = await getCurrentRole();
  const canView = roleAtLeast(role, 'manager');

  if (!canView) {
    return (
      <PageContainer
        pageTitle='Hồ sơ nhân viên'
        access={false}
        accessFallback={
          <div className='text-muted-foreground text-center text-lg'>
            Bạn không có quyền xem danh sách nhân sự.
          </div>
        }
      >
        <div />
      </PageContainer>
    );
  }

  const searchParams = await props.searchParams;
  const departmentId = getQueryValue(searchParams.departmentId);
  const status = getQueryValue(searchParams.status);
  const documentStatus = getQueryValue(searchParams.documentStatus);
  const search = getQueryValue(searchParams.search);

  const [rows, departments] = await Promise.all([
    listEmployees({ departmentId, status, documentStatus, search }),
    departmentOptions()
  ]);
  const canCreate = roleAtLeast(role, 'hr');

  const departmentSummary = Array.from(
    rows.reduce((map, row) => {
      const key = row.departmentName ?? 'Chưa gán phòng ban';
      map.set(key, (map.get(key) ?? 0) + 1);
      return map;
    }, new Map<string, number>())
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const columns: Column<Row>[] = [
    {
      header: 'Mã nhân viên',
      cell: (row) => (
        <Link
          href={`/dashboard/hr/employees/${row.id}`}
          className='text-primary font-medium underline-offset-2 hover:underline'
        >
          {row.employeeCode}
        </Link>
      )
    },
    { header: 'Họ tên', cell: (row) => row.fullName },
    { header: 'Phòng ban', cell: (row) => row.departmentName ?? '-' },
    { header: 'Chức vụ', cell: (row) => row.positionTitle ?? '-' },
    { header: 'Email', cell: (row) => row.email ?? '-' },
    { header: 'Ngày vào làm', cell: (row) => row.hireDate ?? '-' },
    {
      header: 'Trạng thái',
      cell: (row) => {
        const meta = STATUS_META[row.status] ?? { label: row.status, variant: 'outline' as const };
        return <Badge variant={meta.variant}>{meta.label}</Badge>;
      }
    },
    {
      header: 'Hồ sơ số hóa',
      cell: (row) => {
        const meta = DOCUMENT_META[row.documentStatus] ?? {
          label: row.documentStatus,
          variant: 'outline' as const
        };
        return (
          <div className='flex min-w-[170px] flex-col gap-1'>
            <Badge variant={meta.variant}>{meta.label}</Badge>
            <span className='text-muted-foreground text-xs'>
              {row.documentCount} giấy tờ, thiếu {row.missingRequiredCount} nhóm
            </span>
          </div>
        );
      }
    }
  ];

  return (
    <PageContainer
      pageTitle='Hồ sơ nhân viên'
      pageHeaderAction={
        canCreate ? (
          <div data-tour='employees-create'>
            <Link
              href='/dashboard/hr/employees/create'
              className={cn(buttonVariants(), 'text-xs md:text-sm')}
            >
              <Icons.add className='mr-2 h-4 w-4' /> Thêm nhân sự
            </Link>
          </div>
        ) : undefined
      }
    >
      <div className='space-y-4'>
        <div className='grid gap-3 md:grid-cols-4' data-tour='employees-summary'>
          <SummaryCard
            label='Tổng nhân sự hiển thị'
            value={String(rows.length)}
            helper='Theo bộ lọc hiện tại'
          />
          <SummaryCard
            label='Đủ hồ sơ'
            value={String(rows.filter((row) => row.documentStatus === 'complete').length)}
            helper='Sẵn sàng trình diễn hồ sơ số hóa'
          />
          <SummaryCard
            label='Thiếu hồ sơ'
            value={String(rows.filter((row) => row.documentStatus === 'missing').length)}
            helper='Cần bổ sung giấy tờ bắt buộc'
          />
          <SummaryCard
            label='Giấy tờ sắp hết hạn'
            value={String(rows.filter((row) => row.documentStatus === 'expiring').length)}
            helper='Case đẹp để demo cảnh báo'
          />
        </div>

        <EmployeesFilters
          search={search}
          departmentId={departmentId}
          status={status}
          documentStatus={documentStatus}
          departments={departments}
          departmentSummary={departmentSummary}
          statusOptions={Object.entries(STATUS_META).map(([value, meta]) => ({
            value,
            label: meta.label
          }))}
          documentOptions={Object.entries(DOCUMENT_META).map(([value, meta]) => ({
            value,
            label: meta.label
          }))}
        />

        <div data-tour='employees-table'>
          <SimpleTable
            columns={columns}
            rows={rows}
            emptyText='Chưa có nhân sự phù hợp với bộ lọc hiện tại. Hãy đổi bộ lọc hoặc thêm nhân sự để tiếp tục demo.'
          />
        </div>
      </div>
    </PageContainer>
  );
}

function SummaryCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className='rounded-xl border bg-card p-4'>
      <div className='text-muted-foreground text-xs uppercase tracking-wide'>{label}</div>
      <div className='mt-2 text-2xl font-semibold'>{value}</div>
      <div className='text-muted-foreground mt-1 text-sm'>{helper}</div>
    </div>
  );
}
