import PageContainer from '@/components/layout/page-container';
import { ConfirmDeleteDialog } from '@/features/hr/common/confirm-delete-dialog';
import { EntityFormDialog } from '@/features/hr/common/entity-form-dialog';
import { employeeOptions } from '@/features/hr/common/lookups';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import {
  createSalaryInfo,
  deleteSalaryInfo,
  listSalaryInfos,
  updateSalaryInfo
} from '@/features/hr/salary-info/actions';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';

export const metadata = { title: 'HRM: Lương & Phúc lợi' };

const fmt = (n: string | null) =>
  n
    ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(n))
    : '—';

type Row = Awaited<ReturnType<typeof listSalaryInfos>>[number];

export default async function SalaryInfoPage() {
  const role = await getCurrentRole();
  if (!roleAtLeast(role, 'hr')) {
    return (
      <PageContainer pageTitle='Lương & Phúc lợi' access={false}>
        <div />
      </PageContainer>
    );
  }

  const [rows, empOpts] = await Promise.all([listSalaryInfos(), employeeOptions()]);

  const columns: Column<Row>[] = [
    { header: 'Nhân viên', cell: (r) => `${r.employeeCode ?? ''} ${r.employeeName ?? ''}` },
    { header: 'Lương cơ bản', cell: (r) => fmt(r.baseSalary) },
    { header: 'Phụ cấp cố định', cell: (r) => fmt(r.fixedAllowance) },
    { header: 'BH thương mại', cell: (r) => r.commercialInsurancePackage ?? '—' },
    { header: 'Hiệu lực từ', cell: (r) => r.effectiveFrom },
    {
      header: '',
      cell: (r) => (
        <div className='flex justify-end gap-1'>
          <EntityFormDialog
            mode='edit'
            title={`Sửa lịch sử lương: ${r.employeeCode}`}
            action={updateSalaryInfo.bind(null, r.id)}
            defaults={{
              baseSalary: r.baseSalary,
              fixedAllowance: r.fixedAllowance,
              commercialInsurancePackage: r.commercialInsurancePackage ?? '',
              effectiveFrom: r.effectiveFrom
            }}
            fields={[
              { name: 'baseSalary', label: 'Lương cơ bản (₫)', type: 'number', required: true },
              { name: 'fixedAllowance', label: 'Phụ cấp cố định (₫)', type: 'number' },
              { name: 'commercialInsurancePackage', label: 'Gói BH thương mại' },
              { name: 'effectiveFrom', label: 'Hiệu lực từ ngày', type: 'date', required: true }
            ]}
          />
          <ConfirmDeleteDialog
            label={`lịch sử lương ${r.employeeCode}`}
            action={deleteSalaryInfo.bind(null, r.id)}
          />
        </div>
      )
    }
  ];

  return (
    <PageContainer
      pageTitle='Lương & Phúc lợi'
      pageDescription='Thông tin lương và phúc lợi nhân viên'
      pageHeaderAction={
        <EntityFormDialog
          triggerLabel='Thêm thông tin lương'
          title='Cập nhật thông tin lương'
          action={createSalaryInfo}
          fields={[
            {
              name: 'employeeId',
              label: 'Nhân viên',
              type: 'select',
              options: empOpts,
              required: true,
              colSpan: 2
            },
            { name: 'baseSalary', label: 'Lương cơ bản (₫)', type: 'number', required: true },
            { name: 'fixedAllowance', label: 'Phụ cấp cố định (₫)', type: 'number' },
            { name: 'commercialInsurancePackage', label: 'Gói BH thương mại' },
            { name: 'effectiveFrom', label: 'Hiệu lực từ ngày', type: 'date', required: true }
          ]}
        />
      }
    >
      <SimpleTable columns={columns} rows={rows} emptyText='Chưa có thông tin lương nào.' />
    </PageContainer>
  );
}
