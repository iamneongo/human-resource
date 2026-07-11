'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { syncDevice } from './devices';

export function SyncButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <Button
      size='sm'
      variant='outline'
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await syncDevice(id);
          if (res.ok) {
            toast.success('Đã đồng bộ dữ liệu');
            router.refresh();
          } else {
            toast.error(res.error);
          }
        })
      }
    >
      {pending ? '...' : 'Đồng bộ'}
    </Button>
  );
}
