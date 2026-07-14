'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

import { sendPayslip } from './payslips';

export function SendButton({
  id,
  sent,
  isPreview
}: {
  id: string;
  sent: boolean;
  isPreview: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  if (isPreview) {
    return (
      <Button size='sm' variant='ghost' disabled>
        Preview
      </Button>
    );
  }
  if (sent) {
    return (
      <Button size='sm' variant='ghost' disabled>
        Đã phát hành
      </Button>
    );
  }
  return (
    <Button
      size='sm'
      variant='outline'
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await sendPayslip(id);
          if (res.ok) {
            toast.success('Đã đánh dấu phát hành nội bộ');
            router.refresh();
          } else {
            toast.error(res.error);
          }
        })
      }
    >
      {pending ? '...' : 'Phát hành nội bộ'}
    </Button>
  );
}
