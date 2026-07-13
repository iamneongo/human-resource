'use client';

import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Icons } from '@/components/icons';

type Props = {
  open: boolean;
  onClose: () => void;
  fileUrl: string;
  title: string;
};

function isPdf(url: string) {
  return url.toLowerCase().includes('.pdf') || url.includes('application/pdf');
}

function isDocx(url: string) {
  return url.toLowerCase().match(/\.(docx?)$/);
}

export function ContractViewerSheet({ open, onClose, fileUrl, title }: Props) {
  const [docxHtml, setDocxHtml] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open || !isDocx(fileUrl)) return;
    setLoading(true);
    import('mammoth/mammoth.browser').then(async (mammoth) => {
      try {
        const res = await fetch(fileUrl);
        const buf = await res.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer: buf });
        setDocxHtml(result.value);
      } catch {
        setDocxHtml('<p class="text-red-500">Không thể hiển thị tài liệu.</p>');
      } finally {
        setLoading(false);
      }
    });
  }, [open, fileUrl]);

  const renderContent = () => {
    if (isPdf(fileUrl)) {
      return <iframe src={fileUrl} className='h-full w-full rounded-lg border' title={title} />;
    }
    if (isDocx(fileUrl)) {
      if (loading) {
        return (
          <div className='flex h-full items-center justify-center'>
            <Icons.spinner className='text-muted-foreground size-6 animate-spin' />
          </div>
        );
      }
      return (
        <div
          className='prose dark:prose-invert h-full max-w-none overflow-auto rounded-lg border bg-white p-6 dark:bg-zinc-900'
          dangerouslySetInnerHTML={{ __html: docxHtml ?? '' }}
        />
      );
    }
    // Fallback: download link
    return (
      <div className='flex h-full flex-col items-center justify-center gap-4'>
        <Icons.fileTypeDoc className='text-muted-foreground size-16' />
        <p className='text-muted-foreground text-sm'>Không hỗ trợ xem trực tiếp loại file này.</p>
        <Button asChild>
          <a href={fileUrl} download target='_blank' rel='noreferrer'>
            <Icons.upload className='mr-2 size-4' />
            Tải xuống
          </a>
        </Button>
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side='right' className='w-full max-w-3xl p-0 sm:max-w-3xl'>
        <SheetHeader className='flex flex-row items-center justify-between px-6 pt-6 pb-3'>
          <SheetTitle className='truncate'>{title}</SheetTitle>
          <Button variant='outline' size='sm' asChild>
            <a href={fileUrl} download target='_blank' rel='noreferrer'>
              <Icons.upload className='mr-1 size-3.5' />
              Tải xuống
            </a>
          </Button>
        </SheetHeader>
        <div className='h-[calc(100vh-80px)] px-4 pb-4'>{renderContent()}</div>
      </SheetContent>
    </Sheet>
  );
}
