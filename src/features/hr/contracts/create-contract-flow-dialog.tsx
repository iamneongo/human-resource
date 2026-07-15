'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { EntityFormDialog, type FieldConfig } from '@/features/hr/common/entity-form-dialog';

import { ContractUploadDialog } from './contract-upload-dialog';
import { createContract } from './actions';

type CreateContractResult = Awaited<ReturnType<typeof createContract>>;

type UploadTarget = {
  id: string;
  contractNumber: string;
};

type Props = {
  action: (values: Record<string, string>) => Promise<CreateContractResult>;
  fields: FieldConfig[];
  title?: string;
  triggerLabel?: string;
};

export function CreateContractFlowDialog({
  action,
  fields,
  title = 'Thêm hợp đồng lao động',
  triggerLabel = 'Thêm hợp đồng'
}: Props) {
  const router = useRouter();
  const [uploadTarget, setUploadTarget] = React.useState<UploadTarget | null>(null);

  return (
    <>
      <EntityFormDialog
        triggerLabel={triggerLabel}
        title={title}
        description='Bước 1: lưu thông tin hợp đồng. Ngay sau khi lưu xong, hệ thống sẽ mở bước đính kèm tài liệu để bạn upload file ngay.'
        action={action}
        fields={fields}
        successMessage='Đã tạo hợp đồng. Tiếp theo, hãy đính kèm tài liệu nếu bạn đã có file sẵn.'
        onSuccess={(result) => {
          if (!result.ok || !result.data) return;

          setUploadTarget({
            id: result.data.id,
            contractNumber: result.data.contractNumber
          });
        }}
      />
      <ContractUploadDialog
        open={Boolean(uploadTarget)}
        onClose={() => setUploadTarget(null)}
        contractId={uploadTarget?.id ?? ''}
        contractNumber={uploadTarget?.contractNumber ?? ''}
        onUploaded={() => {
          setUploadTarget(null);
          router.refresh();
        }}
      />
    </>
  );
}
