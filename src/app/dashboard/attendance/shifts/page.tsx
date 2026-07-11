import PageContainer from '@/components/layout/page-container';
import { EntityFormDialog } from '@/features/hr/common/entity-form-dialog';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import { createShift, listShifts } from '@/features/hr/attendance/shifts';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';

export const metadata = { title: 'HRM: Cấu hình ca làm việc' };

const TYPE_LABEL: Record<string, string> = {
  office: 'Hành chính',
  split: 'Ca gãy',
  night: 'Ca đêm',
  rotating: 'Xoay ca'
};

type Row = Awaited<ReturnType<typeof listShifts>>[number];

export default async function ShiftsPage() {
  const role = await getCurrentRole();
  if (!roleAtLeast(role, 'manager')) {
    return <PageContainer pageTitle='Cấu hình ca làm việc' access={false}><div /></PageContainer>;
  }
  const rows = await listShifts();
  const canCreate = roleAtLeast(role, 'hr');

  const columns: Column<Row>[] = [
    { header: 'Mã ca', cell: (r) => r.code, className: 'font-medium' },
    { header: 'Tên ca', cell: (r) => r.name },
    { header: 'Loại', cell: (r) => TYPE_LABEL[r.type] ?? r.type },
    { header: 'Giờ vào', cell: (r) => r.startTime },
    { header: 'Giờ ra', cell: (r) => r.endTime },
    { header: 'Nghỉ (phút)', cell: (r) => r.breakMinutes },
    { header: 'Công chuẩn (giờ)', cell: (r) => r.standardHours }
  ];

  return (
    <PageContainer
      pageTitle='Cấu hình ca làm việc'
      pageDescription='Thiết lập ca hành chính, ca gãy, ca đêm, xoay ca; định mức công.'
      pageHeaderAction={
        canCreate ? (
          <EntityFormDialog
            triggerLabel='Thêm ca'
            title='Thêm ca làm việc'
            action={createShift}
            defaults={{ type: 'office', breakMinutes: '60', standardHours: '8' }}
            fields={[
              { name: 'code', label: 'Mã ca', required: true },
              { name: 'name', label: 'Tên ca', required: true },
              { name: 'type', label: 'Loại ca', type: 'select', required: true, options: Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label })) },
              { name: 'startTime', label: 'Giờ vào (HH:MM)', required: true, placeholder: '08:00' },
              { name: 'endTime', label: 'Giờ ra (HH:MM)', required: true, placeholder: '17:00' },
              { name: 'breakMinutes', label: 'Nghỉ giữa ca (phút)', type: 'number' },
              { name: 'standardHours', label: 'Công chuẩn (giờ)', type: 'number' }
            ]}
          />
        ) : undefined
      }
    >
      <SimpleTable columns={columns} rows={rows} emptyText='Chưa cấu hình ca nào.' />
    </PageContainer>
  );
}
