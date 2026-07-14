'use client';

import * as React from 'react';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';

import { ContractUploadDialog } from './contract-upload-dialog';
import { ContractViewerSheet } from './contract-viewer';

type Props = {
  contractId: string;
  contractNumber: string;
  fileUrl: string | null;
  fileName?: string | null;
  fileMimeType?: string | null;
  canUpload: boolean;
};

export function ContractFileCell({
  contractId,
  contractNumber,
  fileUrl: initialFileUrl,
  fileName,
  fileMimeType,
  canUpload
}: Props) {
  const [fileUrl, setFileUrl] = React.useState(initialFileUrl);
  const [viewerOpen, setViewerOpen] = React.useState(false);
  const [uploadOpen, setUploadOpen] = React.useState(false);

  if (fileUrl) {
    return (
      <>
        <Button
          variant='ghost'
          size='sm'
          className='text-primary h-7 gap-1 px-2 text-xs'
          onClick={() => setViewerOpen(true)}
        >
          <Icons.fileTypePdf className='size-3.5' />
          Xem file
        </Button>
        <ContractViewerSheet
          open={viewerOpen}
          onClose={() => setViewerOpen(false)}
          fileUrl={fileUrl}
          title={`Hợp đồng ${contractNumber}`}
          filename={fileName}
          mimeType={fileMimeType}
        />
      </>
    );
  }

  if (!canUpload) return <span className='text-muted-foreground'>—</span>;

  return (
    <>
      <Button
        variant='ghost'
        size='sm'
        className='text-muted-foreground h-7 gap-1 px-2 text-xs'
        onClick={() => setUploadOpen(true)}
      >
        <Icons.upload className='size-3.5' />
        Đính kèm
      </Button>
      <ContractUploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        contractId={contractId}
        contractNumber={contractNumber}
        onUploaded={(url) => setFileUrl(url)}
      />
    </>
  );
}
