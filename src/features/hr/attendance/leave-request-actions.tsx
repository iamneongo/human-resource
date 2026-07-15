'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

type Result = { ok: true } | { ok: false; error: string };

export function LeaveRequestActions({
  leaveId,
  canCancel,
  cancel
}: {
  leaveId: string;
  canCancel: boolean;
  cancel: (id: string) => Promise<Result>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (!canCancel) {
    return null;
  }

  return (
    <Button
      size='sm'
      variant='ghost'
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await cancel(leaveId);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }

          toast.success('Đã hủy đơn nghỉ.');
          router.refresh();
        })
      }
    >
      Hủy đơn
    </Button>
  );
}
