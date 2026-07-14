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
  title = 'Them hop dong lao dong',
  triggerLabel = 'Them hop dong'
}: Props) {
  const router = useRouter();
  const [uploadTarget, setUploadTarget] = React.useState<UploadTarget | null>(null);

  return (
    <>
      <EntityFormDialog
        triggerLabel={triggerLabel}
        title={title}
        description='Buoc 1: luu thong tin hop dong. Ngay sau khi luu xong, he thong se mo buoc dinh kem tai lieu de ban upload file ngay.'
        action={action}
        fields={fields}
        successMessage='Da tao hop dong. Tiep theo, hay dinh kem tai lieu neu ban co file san.'
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
