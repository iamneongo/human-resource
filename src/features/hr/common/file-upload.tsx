'use client';

import * as React from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';

import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

import { uploadFile } from './upload';

/** Vùng kéo-thả tải file, lưu vào Neon; trả URL qua onChange. */
export function FileUpload({
  value,
  onChange,
  accept
}: {
  value?: string;
  onChange: (url: string) => void;
  accept?: Record<string, string[]>;
}) {
  const [uploading, setUploading] = React.useState(false);
  const [name, setName] = React.useState<string>('');

  const onDrop = React.useCallback(
    async (accepted: File[]) => {
      const file = accepted[0];
      if (!file) return;
      setUploading(true);
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () =>
            resolve(String(reader.result).split(',')[1] ?? '');
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const res = await uploadFile({
          filename: file.name,
          mimeType: file.type,
          base64
        });
        if (res.ok) {
          setName(res.filename);
          onChange(res.url);
          toast.success('Đã tải lên');
        } else {
          toast.error(res.error);
        }
      } finally {
        setUploading(false);
      }
    },
    [onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles: 1,
    disabled: uploading
  });

  return (
    <div className='space-y-1.5'>
      <div
        {...getRootProps()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-4 py-5 text-center text-sm transition-colors',
          isDragActive ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
          uploading && 'pointer-events-none opacity-60'
        )}
      >
        <input {...getInputProps()} />
        <Icons.upload className='text-muted-foreground h-5 w-5' />
        <span className='text-muted-foreground'>
          {uploading
            ? 'Đang tải lên...'
            : 'Kéo-thả hoặc bấm để chọn file (≤ 8MB)'}
        </span>
      </div>
      {value ? (
        <a
          href={value}
          target='_blank'
          rel='noreferrer'
          className='text-primary inline-flex items-center gap-1 text-xs underline'
        >
          <Icons.page className='h-3 w-3' />
          {name || 'Xem file đã tải'}
        </a>
      ) : null}
    </div>
  );
}
