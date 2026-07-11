'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { sendPayslip } from './payslips';

export function SendButton({ id, sent }: { id: string; sent: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  if (sent) {
    return (
      <Button size='sm' variant='ghost' disabled>
        Đã gửi
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
            toast.success('Đã gửi phiếu lương');
            router.refresh();
          } else {
            toast.error(res.error);
          }
        })
      }
    >
      {pending ? '...' : 'Gửi'}
    </Button>
  );
}
