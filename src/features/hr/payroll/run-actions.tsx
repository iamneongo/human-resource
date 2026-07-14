'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

import { approvePayrollRun, computeAndLockRun, previewPayrollRun } from './runs';

type Result = { ok: true } | { ok: false; error: string };

export function RunActions({ id, status }: { id: string; status: string }) {
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
      <div className='flex justify-end gap-2'>
        <Button
          size='sm'
          variant='outline'
          disabled={pending}
          onClick={() => run(previewPayrollRun, 'Đã preview bảng lương')}
        >
          {pending ? '...' : 'Preview'}
        </Button>
      </div>
    );
  }
  if (status === 'previewed') {
    return (
      <div className='flex justify-end gap-2'>
        <Button
          size='sm'
          variant='outline'
          disabled={pending}
          onClick={() => run(previewPayrollRun, 'Đã cập nhật preview bảng lương')}
        >
          {pending ? '...' : 'Preview lại'}
        </Button>
        <Button
          size='sm'
          disabled={pending}
          onClick={() => run(computeAndLockRun, 'Đã chốt bảng lương')}
        >
          {pending ? '...' : 'Chốt'}
        </Button>
      </div>
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
