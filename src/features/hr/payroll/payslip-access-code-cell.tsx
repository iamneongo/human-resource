'use client';

import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function PayslipAccessCodeCell({
  code,
  sent,
  isPreview
}: {
  code: string | null;
  sent: boolean;
  isPreview: boolean;
}) {
  if (isPreview) {
    return <span className='text-muted-foreground text-sm'>Chưa áp dụng</span>;
  }

  if (!sent) {
    return <span className='text-muted-foreground text-sm'>Phát hành để tạo mã</span>;
  }

  if (!code) {
    return <span className='text-muted-foreground text-sm'>Chưa có mã</span>;
  }

  return (
    <div className='flex min-w-[220px] items-center gap-2'>
      <code className='bg-muted inline-flex rounded-md px-2 py-1 text-xs font-medium'>{code}</code>
      <Button
        type='button'
        size='sm'
        variant='ghost'
        className={cn('h-8 px-2 text-xs')}
        onClick={async () => {
          await navigator.clipboard.writeText(code);
          toast.success('Đã sao chép mã xem phiếu lương');
        }}
      >
        Copy
      </Button>
    </div>
  );
}
