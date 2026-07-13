import PageContainer from '@/components/layout/page-container';
import { EntityFormDialog } from '@/features/hr/common/entity-form-dialog';
import { ConfirmDeleteDialog } from '@/features/hr/common/confirm-delete-dialog';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import {
  createPosition,
  deletePosition,
  listPositions,
  updatePosition
} from '@/features/hr/org/actions';
import { departmentOptions } from '@/features/hr/common/lookups';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';

export const metadata = { title: 'HRM: Chức vụ' };

type Pos = Awaited<ReturnType<typeof listPositions>>[number];

export default async function PositionsPage() {
  const role = await getCurrentRole();
  if (!roleAtLeast(role, 'admin')) {
    return (
      <PageContainer
        pageTitle='Chức vụ'
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

  const [poss, deptOpts] = await Promise.all([listPositions(), departmentOptions()]);

  const posCols: Column<Pos>[] = [
    { header: 'Mã', cell: (r) => r.code, className: 'font-medium' },
    { header: 'Chức vụ', cell: (r) => r.title },
    { header: 'Phòng ban', cell: (r) => r.departmentName ?? '—' },
    {
      header: '',
      cell: (r) => (
        <div className='flex justify-end gap-1'>
          <EntityFormDialog
            mode='edit'
            title={`Sửa: ${r.title}`}
            action={updatePosition.bind(null, r.id)}
            defaults={{ code: r.code, title: r.title, departmentId: r.departmentId ?? '' }}
            fields={[
              { name: 'code', label: 'Mã', required: true },
              { name: 'title', label: 'Tên chức vụ', required: true },
              {
                name: 'departmentId',
                label: 'Phòng ban',
                type: 'select',
                options: deptOpts,
                colSpan: 2
              }
            ]}
          />
          <ConfirmDeleteDialog label={r.title} action={deletePosition.bind(null, r.id)} />
        </div>
      )
    }
  ];

  return (
    <PageContainer
      pageTitle='Chức vụ'
      pageHeaderAction={
        <EntityFormDialog
          triggerLabel='Thêm chức vụ'
          title='Thêm chức vụ'
          action={createPosition}
          fields={[
            { name: 'code', label: 'Mã', required: true },
            { name: 'title', label: 'Tên chức vụ', required: true },
            {
              name: 'departmentId',
              label: 'Phòng ban',
              type: 'select',
              options: deptOpts,
              colSpan: 2
            }
          ]}
        />
      }
    >
      <SimpleTable columns={posCols} rows={poss} emptyText='Chưa có chức vụ.' />
    </PageContainer>
  );
}
