import PageContainer from '@/components/layout/page-container';
import { EntityFormDialog } from '@/features/hr/common/entity-form-dialog';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import {
  createInsuranceTaxConfig,
  listInsuranceTaxConfigs
} from '@/features/hr/payroll/insurance-tax';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';
import { formatVND } from '@/lib/format';

export const metadata = { title: 'HRM: BHXH & Thuế TNCN' };

const pct = (n: string) => `${(Number(n) * 100).toFixed(2)}%`;
const vnd = formatVND;
type Row = Awaited<ReturnType<typeof listInsuranceTaxConfigs>>[number];

export default async function InsuranceTaxPage() {
  const role = await getCurrentRole();
  if (!roleAtLeast(role, 'hr')) {
    return (
      <PageContainer pageTitle='BHXH & Thuế TNCN' access={false}>
        <div />
      </PageContainer>
    );
  }
  const rows = await listInsuranceTaxConfigs();
  const columns: Column<Row>[] = [
    { header: 'Hiệu lực từ', cell: (r) => r.effectiveFrom, className: 'font-medium' },
    { header: 'BHXH', cell: (r) => pct(r.socialInsuranceRate) },
    { header: 'BHYT', cell: (r) => pct(r.healthInsuranceRate) },
    { header: 'BHTN', cell: (r) => pct(r.unemploymentRate) },
    { header: 'Giảm trừ bản thân', cell: (r) => vnd(r.personalDeduction) },
    { header: 'Giảm trừ NPT', cell: (r) => vnd(r.dependentDeduction) }
  ];
  return (
    <PageContainer
      pageTitle='BHXH & Thuế TNCN'
      pageHeaderAction={
        <EntityFormDialog
          triggerLabel='Thêm cấu hình'
          title='Thêm cấu hình BHXH & thuế'
          action={createInsuranceTaxConfig}
          defaults={{
            socialInsuranceRate: '0.08',
            healthInsuranceRate: '0.015',
            unemploymentRate: '0.01',
            personalDeduction: '11000000',
            dependentDeduction: '4400000'
          }}
          fields={[
            {
              name: 'effectiveFrom',
              label: 'Hiệu lực từ',
              type: 'date',
              required: true,
              colSpan: 2
            },
            { name: 'socialInsuranceRate', label: 'Tỷ lệ BHXH (vd 0.08)', type: 'number' },
            { name: 'healthInsuranceRate', label: 'Tỷ lệ BHYT (vd 0.015)', type: 'number' },
            { name: 'unemploymentRate', label: 'Tỷ lệ BHTN (vd 0.01)', type: 'number' },
            { name: 'personalDeduction', label: 'Giảm trừ bản thân (₫)', type: 'number' },
            { name: 'dependentDeduction', label: 'Giảm trừ NPT (₫)', type: 'number' }
          ]}
        />
      }
    >
      <SimpleTable
        columns={columns}
        rows={rows}
        emptyText='Chưa có cấu hình. Thêm 1 cấu hình để engine tính lương sử dụng.'
      />
    </PageContainer>
  );
}
