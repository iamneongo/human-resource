'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { approvePayrollRun, computeAndLockRun } from './runs';

type Result = { ok: true } | { ok: false; error: string };

export function RunActions({
  id,
  status
}: {
  id: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function run(fn: (id: string) => Promise<Result>, okMsg: string) {
    startTransition(async () => {
      const res = await fn(id);
      if (res.ok) {
        toast.success(okMsg);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  if (status === 'draft') {
    return (
      <Button
        size='sm'
        variant='outline'
        disabled={pending}
        onClick={() => run(computeAndLockRun, 'Đã tính & chốt bảng lương')}
      >
        {pending ? '...' : 'Tính & chốt'}
      </Button>
    );
  }
  if (status === 'locked') {
    return (
      <Button
        size='sm'
        disabled={pending}
        onClick={() => run(approvePayrollRun, 'Đã duyệt bảng lương')}
      >
        {pending ? '...' : 'Duyệt'}
      </Button>
    );
  }
  return null;
}
