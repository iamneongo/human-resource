'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { advanceOffboarding } from './actions';

export function AdvanceButton({
  id,
  disabled
}: {
  id: string;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  if (disabled) {
    return (
      <Button size='sm' variant='ghost' disabled>
        Hoàn tất
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
          const res = await advanceOffboarding(id);
          if (res.ok) {
            toast.success('Đã chuyển bước');
            router.refresh();
          } else {
            toast.error(res.error);
          }
        })
      }
    >
      {pending ? '...' : 'Chuyển bước →'}
    </Button>
  );
}
