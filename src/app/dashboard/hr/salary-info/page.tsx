import PageContainer from '@/components/layout/page-container';
import { EntityFormDialog } from '@/features/hr/common/entity-form-dialog';
import { employeeOptions } from '@/features/hr/common/lookups';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import {
  createSalaryInfo,
  listSalaryInfos
} from '@/features/hr/salary-info/actions';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';

export const metadata = { title: 'HRM: Lương & Phúc lợi' };

const vnd = (n: string | null) =>
  n == null ? '—' : Number(n).toLocaleString('vi-VN') + ' ₫';

type Row = Awaited<ReturnType<typeof listSalaryInfos>>[number];

export default async function SalaryInfoPage() {
  const role = await getCurrentRole();
  // Thông tin lương chỉ HR trở lên được xem.
  if (!roleAtLeast(role, 'hr')) {
    return (
      <PageContainer
        pageTitle='Lương & Phúc lợi'
        access={false}
        accessFallback={
          <div className='text-muted-foreground text-center text-lg'>
            Thông tin lương chỉ dành cho bộ phận Nhân sự.
          </div>
        }
      >
        <div />
      </PageContainer>
    );
  }
  const rows = await listSalaryInfos();
  const empOpts = await employeeOptions();

  const columns: Column<Row>[] = [
    { header: 'Nhân viên', cell: (r) => `${r.employeeCode ?? ''} ${r.employeeName ?? ''}`, className: 'font-medium' },
    { header: 'Lương gốc', cell: (r) => vnd(r.baseSalary) },
    { header: 'Phụ cấp cố định', cell: (r) => vnd(r.fixedAllowance) },
    { header: 'BH thương mại', cell: (r) => r.commercialInsurancePackage ?? '—' },
    { header: 'Hiệu lực từ', cell: (r) => r.effectiveFrom }
  ];

  return (
    <PageContainer
      pageTitle='Lương & Phúc lợi'
      pageDescription='Lưu trữ lương gốc, phụ cấp cố định, gói bảo hiểm thương mại và chế độ phúc lợi.'
      pageHeaderAction={
        <EntityFormDialog
          triggerLabel='Thêm bản ghi lương'
          title='Thêm thông tin lương & phúc lợi'
          action={createSalaryInfo}
          fields={[
            { name: 'employeeId', label: 'Nhân viên', type: 'select', options: empOpts, required: true, colSpan: 2 },
            { name: 'baseSalary', label: 'Lương gốc (₫)', type: 'number', required: true },
            { name: 'fixedAllowance', label: 'Phụ cấp cố định (₫)', type: 'number' },
            { name: 'commercialInsurancePackage', label: 'Gói BH thương mại', colSpan: 2 },
            { name: 'effectiveFrom', label: 'Hiệu lực từ', type: 'date', required: true }
          ]}
        />
      }
    >
      <SimpleTable columns={columns} rows={rows} emptyText='Chưa có bản ghi lương nào.' />
    </PageContainer>
  );
}
