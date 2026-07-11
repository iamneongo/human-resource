import PageContainer from '@/components/layout/page-container';
import { EntityFormDialog } from '@/features/hr/common/entity-form-dialog';
import { positionOptions } from '@/features/hr/common/lookups';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import { createJD, listJDs } from '@/features/hr/performance/jd';
import { getCurrentRole, roleAtLeast } from '@/lib/rbac';

export const metadata = { title: 'HRM: Mô tả công việc (JD)' };

type Row = Awaited<ReturnType<typeof listJDs>>[number];

export default async function JDPage() {
  const role = await getCurrentRole();
  if (!roleAtLeast(role, 'manager')) {
    return <PageContainer pageTitle='Mô tả công việc (JD)' access={false}><div /></PageContainer>;
  }
  const rows = await listJDs();
  const canCreate = roleAtLeast(role, 'hr');
  const posOpts = canCreate ? await positionOptions() : [];

  const columns: Column<Row>[] = [
    { header: 'Tiêu đề JD', cell: (r) => r.title, className: 'font-medium' },
    { header: 'Vị trí', cell: (r) => r.positionTitle ?? '—' },
    { header: 'Tóm tắt', cell: (r) => r.summary ?? '—' }
  ];

  return (
    <PageContainer
      pageTitle='Mô tả công việc (JD)'
      pageDescription='Thư viện mô tả công việc cho từng vị trí, liên kết bộ tiêu chuẩn đánh giá năng lực.'
      pageHeaderAction={
        canCreate ? (
          <EntityFormDialog
            triggerLabel='Thêm JD'
            title='Thêm mô tả công việc'
            action={createJD}
            fields={[
              { name: 'positionId', label: 'Vị trí', type: 'select', options: posOpts, required: true, colSpan: 2 },
              { name: 'title', label: 'Tiêu đề JD', required: true, colSpan: 2 },
              { name: 'summary', label: 'Tóm tắt', type: 'textarea' },
              { name: 'responsibilities', label: 'Trách nhiệm', type: 'textarea' },
              { name: 'requirements', label: 'Yêu cầu', type: 'textarea' }
            ]}
          />
        ) : undefined
      }
    >
      <SimpleTable columns={columns} rows={rows} emptyText='Chưa có JD nào.' />
    </PageContainer>
  );
}
