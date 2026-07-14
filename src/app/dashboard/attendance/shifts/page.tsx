import PageContainer from '@/components/layout/page-container';
import { EntityFormDialog } from '@/features/hr/common/entity-form-dialog';
import { ConfirmDeleteDialog } from '@/features/hr/common/confirm-delete-dialog';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import { createShift, deleteShift, listShifts, updateShift } from '@/features/hr/attendance/shifts';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';

export const metadata = { title: 'HRM: Ca làm việc' };

const TYPE_LABEL: Record<string, string> = {
  office: 'Hành chính',
  split: 'Ca gãy',
  night: 'Ca đêm',
  rotating: 'Xoay ca'
};

const SHIFT_FIELDS = [
  { name: 'name', label: 'Tên ca', required: true },
  {
    name: 'type',
    label: 'Loại ca',
    type: 'select' as const,
    required: true,
    options: Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label }))
  },
  { name: 'startTime', label: 'Giờ vào (HH:MM)', required: true, placeholder: '08:00' },
  { name: 'endTime', label: 'Giờ ra (HH:MM)', required: true, placeholder: '17:00' },
  { name: 'breakMinutes', label: 'Nghỉ giữa ca (phút)', type: 'number' as const },
  { name: 'standardHours', label: 'Giờ công chuẩn', type: 'number' as const }
];

type Row = Awaited<ReturnType<typeof listShifts>>[number];

export default async function ShiftsPage() {
  const role = await getCurrentRole();
  if (!roleAtLeast(role, 'manager')) {
    return (
      <PageContainer
        pageTitle='Ca làm việc'
        access={false}
        accessFallback={
          <div className='text-muted-foreground text-center text-lg'>
            Bạn không có quyền xem cấu hình ca làm việc.
          </div>
        }
      >
        <div />
      </PageContainer>
    );
  }

  const rows = await listShifts();
  const canEdit = roleAtLeast(role, 'hr');

  const columns: Column<Row>[] = [
    { header: 'Mã ca', cell: (row) => row.code, className: 'font-medium' },
    { header: 'Tên ca', cell: (row) => row.name },
    { header: 'Loại ca', cell: (row) => TYPE_LABEL[row.type] ?? row.type },
    { header: 'Giờ vào', cell: (row) => row.startTime },
    { header: 'Giờ ra', cell: (row) => row.endTime },
    { header: 'Nghỉ giữa ca', cell: (row) => `${row.breakMinutes} phút` },
    { header: 'Giờ công chuẩn', cell: (row) => `${row.standardHours} giờ` },
    ...(canEdit
      ? [
          {
            header: '',
            cell: (row: Row) => (
              <div className='flex justify-end gap-1'>
                <EntityFormDialog
                  mode='edit'
                  title={`Sửa ca: ${row.name}`}
                  action={updateShift.bind(null, row.id)}
                  defaults={{
                    name: row.name,
                    type: row.type,
                    startTime: row.startTime,
                    endTime: row.endTime,
                    breakMinutes: String(row.breakMinutes ?? ''),
                    standardHours: String(row.standardHours ?? '')
                  }}
                  fields={SHIFT_FIELDS}
                  successMessage='Đã cập nhật ca làm việc'
                />
                <ConfirmDeleteDialog label={row.name} action={deleteShift.bind(null, row.id)} />
              </div>
            )
          }
        ]
      : [])
  ];

  return (
    <PageContainer
      pageTitle='Ca làm việc'
      pageDescription='Quản lý cấu hình ca để chấm công thủ công, tracking định biên ngày và payroll có cùng một chuẩn giờ công.'
      pageHeaderAction={
        canEdit ? (
          <EntityFormDialog
            triggerLabel='Thêm ca'
            title='Thêm ca làm việc'
            action={createShift}
            defaults={{ type: 'office', breakMinutes: '60', standardHours: '8' }}
            fields={[{ name: 'code', label: 'Mã ca', required: true }, ...SHIFT_FIELDS]}
            successMessage='Đã tạo ca làm việc'
          />
        ) : undefined
      }
    >
      <SimpleTable
        columns={columns}
        rows={rows}
        emptyText='Chưa cấu hình ca làm việc nào. Hãy thêm ca đầu tiên trước khi chấm công hoặc khai báo định biên.'
      />
    </PageContainer>
  );
}
