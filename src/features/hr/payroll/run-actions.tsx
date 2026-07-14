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

  function run(fn: (id: string) => Promise<Result>, successMessage: string) {
    startTransition(async () => {
      const result = await fn(id);
      if (result.ok) {
        toast.success(successMessage);
        router.refresh();
      } else {
        toast.error(result.error);
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
          onClick={() => run(previewPayrollRun, 'Đã tạo preview bảng lương')}
        >
          {pending ? '...' : 'Preview bảng lương'}
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
          {pending ? '...' : 'Chốt bảng lương'}
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
        {pending ? '...' : 'Duyệt bảng lương'}
      </Button>
    );
  }

  return null;
}
