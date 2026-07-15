import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ConfirmDeleteDialog } from '@/features/hr/common/confirm-delete-dialog';
import { EntityFormDialog } from '@/features/hr/common/entity-form-dialog';
import { SimpleTable, type Column } from '@/features/hr/common/simple-table';
import {
  deleteEmployeeDocument,
  listEmployeeDocuments,
  upsertEmployeeDocument
} from '@/features/hr/employees/actions';

const DOCUMENT_TYPE_OPTIONS = [
  { value: 'id_card', label: 'CCCD / Hộ chiếu' },
  { value: 'social_insurance', label: 'Sổ BHXH' },
  { value: 'degree', label: 'Bằng cấp' },
  { value: 'certificate', label: 'Chứng chỉ' },
  { value: 'other', label: 'Hồ sơ khác' }
] as const;

const DOCUMENT_TYPE_LABEL = Object.fromEntries(
  DOCUMENT_TYPE_OPTIONS.map((option) => [option.value, option.label])
);

type Row = Awaited<ReturnType<typeof listEmployeeDocuments>>[number];

function getDocumentBadge(row: Row) {
  if (!row.expiryDate) return <Badge variant='secondary'>Đã lưu hồ sơ</Badge>;

  const daysLeft = Math.ceil((new Date(row.expiryDate).getTime() - Date.now()) / 86_400_000);
  if (daysLeft < 0) return <Badge variant='destructive'>Đã hết hạn</Badge>;
  if (daysLeft <= 45) return <Badge variant='outline'>Sắp hết hạn</Badge>;
  return <Badge variant='default'>Đủ hồ sơ</Badge>;
}

export async function DocumentsTab({
  employeeId,
  canEdit
}: {
  employeeId: string;
  canEdit: boolean;
}) {
  const documents = await listEmployeeDocuments(employeeId);
  const availableTypes = new Set(documents.map((row) => row.type));
  const missingGroups = DOCUMENT_TYPE_OPTIONS.filter(
    (option) => option.value !== 'other' && !availableTypes.has(option.value)
  );

  async function saveDocument(values: Record<string, string>) {
    'use server';
    return upsertEmployeeDocument(employeeId, values);
  }

  const columns: Column<Row>[] = [
    { header: 'Nhóm hồ sơ', cell: (row) => DOCUMENT_TYPE_LABEL[row.type] ?? row.type },
    { header: 'Tên giấy tờ', cell: (row) => row.name, className: 'font-medium' },
    { header: 'Ngày cấp', cell: (row) => row.issueDate ?? '—' },
    { header: 'Ngày hết hạn', cell: (row) => row.expiryDate ?? 'Không thời hạn' },
    { header: 'Tình trạng', cell: (row) => getDocumentBadge(row) },
    {
      header: 'Tệp đính kèm',
      cell: (row) => (
        <a
          href={row.fileUrl}
          target='_blank'
          rel='noreferrer'
          className='text-primary underline-offset-2 hover:underline'
        >
          Xem file
        </a>
      )
    },
    { header: 'Ghi chú', cell: (row) => row.note ?? '—' },
    ...(canEdit
      ? [
          {
            header: '',
            cell: (row: Row) => (
              <div className='flex justify-end gap-1'>
                <EntityFormDialog
                  mode='edit'
                  title={`Cập nhật hồ sơ: ${row.name}`}
                  action={saveDocument}
                  defaults={{
                    id: row.id,
                    type: row.type,
                    name: row.name,
                    fileUrl: row.fileUrl,
                    issueDate: row.issueDate ?? '',
                    expiryDate: row.expiryDate ?? '',
                    note: row.note ?? ''
                  }}
                  fields={[
                    {
                      name: 'type',
                      label: 'Nhóm hồ sơ',
                      type: 'select',
                      required: true,
                      options: [...DOCUMENT_TYPE_OPTIONS]
                    },
                    { name: 'name', label: 'Tên giấy tờ', required: true },
                    {
                      name: 'fileUrl',
                      label: 'Tệp đính kèm',
                      type: 'file',
                      required: true,
                      colSpan: 2
                    },
                    { name: 'issueDate', label: 'Ngày cấp', type: 'date' },
                    { name: 'expiryDate', label: 'Ngày hết hạn', type: 'date' },
                    { name: 'note', label: 'Ghi chú', type: 'textarea', colSpan: 2 }
                  ]}
                  successMessage='Đã cập nhật hồ sơ số hóa'
                />
                <ConfirmDeleteDialog
                  label={row.name}
                  action={deleteEmployeeDocument.bind(null, employeeId, row.id)}
                />
              </div>
            )
          }
        ]
      : [])
  ];

  return (
    <div className='space-y-4'>
      {missingGroups.length > 0 ? (
        <Alert>
          <AlertTitle>Hồ sơ còn thiếu</AlertTitle>
          <AlertDescription>
            Cần bổ sung: {missingGroups.map((item) => item.label).join(', ')}.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <AlertTitle>Hồ sơ đã đủ để demo</AlertTitle>
          <AlertDescription>
            Nhân sự này đã có đủ nhóm hồ sơ cốt lõi để trình diễn quy trình số hóa.
          </AlertDescription>
        </Alert>
      )}

      <div className='flex items-center justify-between gap-3'>
        <div className='space-y-1'>
          <p className='text-sm font-medium'>{documents.length} giấy tờ đã lưu</p>
          <p className='text-muted-foreground text-xs'>
            Theo dõi đủ hồ sơ, file đính kèm và cảnh báo hết hạn trên cùng một màn.
          </p>
        </div>
        {canEdit ? (
          <EntityFormDialog
            triggerLabel='Thêm giấy tờ'
            title='Thêm hồ sơ số hóa'
            action={saveDocument}
            fields={[
              {
                name: 'type',
                label: 'Nhóm hồ sơ',
                type: 'select',
                required: true,
                options: [...DOCUMENT_TYPE_OPTIONS]
              },
              { name: 'name', label: 'Tên giấy tờ', required: true },
              {
                name: 'fileUrl',
                label: 'Tệp đính kèm',
                type: 'file',
                required: true,
                colSpan: 2
              },
              { name: 'issueDate', label: 'Ngày cấp', type: 'date' },
              { name: 'expiryDate', label: 'Ngày hết hạn', type: 'date' },
              { name: 'note', label: 'Ghi chú', type: 'textarea', colSpan: 2 }
            ]}
            successMessage='Đã thêm hồ sơ số hóa'
          />
        ) : null}
      </div>

      <SimpleTable
        columns={columns}
        rows={documents}
        emptyText='Chưa có giấy tờ số hóa nào. Hãy thêm CCCD, BHXH, bằng cấp hoặc chứng chỉ để hoàn thiện hồ sơ demo.'
      />
    </div>
  );
}
