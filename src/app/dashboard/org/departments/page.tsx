import PageContainer from '@/components/layout/page-container';
import { EntityFormDialog } from '@/features/hr/common/entity-form-dialog';
import { ConfirmDeleteDialog } from '@/features/hr/common/confirm-delete-dialog';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import {
  createDepartment,
  deleteDepartment,
  listDepartments,
  updateDepartment
} from '@/features/hr/org/actions';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';

export const metadata = { title: 'HRM: Phòng ban' };

type Dept = Awaited<ReturnType<typeof listDepartments>>[number];

export default async function DepartmentsPage() {
  const role = await getCurrentRole();
  if (!roleAtLeast(role, 'admin')) {
    return (
      <PageContainer
        pageTitle='Phòng ban'
        access={false}
        accessFallback={
          <div className='text-muted-foreground text-center text-lg'>
            Chỉ Admin được truy cập cấu hình cơ cấu tổ chức.
          </div>
        }
      >
        <div />
      </PageContainer>
    );
  }

  const depts = await listDepartments();

  const deptCols: Column<Dept>[] = [
    { header: 'Mã', cell: (r) => r.code, className: 'font-medium' },
    { header: 'Tên phòng ban', cell: (r) => r.name },
    {
      header: '',
      cell: (r) => (
        <div className='flex justify-end gap-1'>
          <EntityFormDialog
            mode='edit'
            title={`Sửa: ${r.name}`}
            action={updateDepartment.bind(null, r.id)}
            defaults={{ code: r.code, name: r.name }}
            fields={[
              { name: 'code', label: 'Mã', required: true },
              { name: 'name', label: 'Tên phòng ban', required: true }
            ]}
          />
          <ConfirmDeleteDialog label={r.name} action={deleteDepartment.bind(null, r.id)} />
        </div>
      )
    }
  ];

  return (
    <PageContainer
      pageTitle='Phòng ban'
      pageHeaderAction={
        <EntityFormDialog
          triggerLabel='Thêm phòng ban'
          title='Thêm phòng ban'
          action={createDepartment}
          fields={[
            { name: 'code', label: 'Mã', required: true },
            { name: 'name', label: 'Tên phòng ban', required: true }
          ]}
        />
      }
    >
      <SimpleTable columns={deptCols} rows={depts} emptyText='Chưa có phòng ban.' />
    </PageContainer>
  );
}
