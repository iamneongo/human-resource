'use client';

import * as React from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { attachContractFile } from './actions';

const ACCEPT = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
};

type Props = {
  open: boolean;
  onClose: () => void;
  contractId: string;
  contractNumber: string;
  onUploaded: (url: string) => void;
};

export function ContractUploadDialog({
  open,
  onClose,
  contractId,
  contractNumber,
  onUploaded
}: Props) {
  const [file, setFile] = React.useState<File | null>(null);
  const [pending, setPending] = React.useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: ACCEPT,
    maxFiles: 1,
    onDrop: (accepted) => setFile(accepted[0] ?? null)
  });

  const handleUpload = async () => {
    if (!file) return;
    setPending(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok || !json.url) {
        toast.error(json.error ?? 'Upload thất bại.');
        return;
      }
      const result = await attachContractFile(contractId, json.url);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Đã đính kèm tài liệu hợp đồng.');
      onUploaded(json.url);
      onClose();
    } catch {
      toast.error('Lỗi kết nối.');
    } finally {
      setPending(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    onClose();
  };

  const formatSize = (bytes: number) =>
    bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(0)} KB`
      : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Đính kèm tài liệu hợp đồng</DialogTitle>
        </DialogHeader>
        <p className='text-muted-foreground -mt-1 text-sm'>
          Số HĐ: <strong className='text-foreground'>{contractNumber}</strong>
        </p>

        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-muted/40'
          )}
        >
          <input {...getInputProps()} />
          {file ? (
            <div className='flex flex-col items-center gap-2'>
              <Icons.fileTypePdf className='text-primary size-10' />
              <p className='text-sm font-medium'>{file.name}</p>
              <p className='text-muted-foreground text-xs'>{formatSize(file.size)}</p>
              <Button
                variant='ghost'
                size='sm'
                className='text-muted-foreground'
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
              >
                <Icons.close className='mr-1 size-3' />
                Xoá
              </Button>
            </div>
          ) : (
            <div className='flex flex-col items-center gap-2'>
              <Icons.upload className='text-muted-foreground size-10' />
              <p className='text-sm font-medium'>
                {isDragActive ? 'Thả file vào đây' : 'Kéo thả hoặc click để chọn file'}
              </p>
              <p className='text-muted-foreground text-xs'>PDF, DOC, DOCX</p>
            </div>
          )}
        </div>

        <div className='flex justify-end gap-2'>
          <Button variant='outline' onClick={handleClose} disabled={pending}>
            Huỷ
          </Button>
          <Button onClick={handleUpload} disabled={!file || pending}>
            {pending && <Icons.spinner className='mr-2 size-4 animate-spin' />}
            {pending ? 'Đang upload...' : 'Đính kèm'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
