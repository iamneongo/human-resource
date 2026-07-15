'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { ConfirmActionButton } from '@/features/hr/common/confirm-action-button';

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
        <ConfirmActionButton
          title='Xác nhận chốt bảng lương'
          description='Kỳ lương này sẽ được chốt theo dữ liệu hiện tại để chuyển sang bước duyệt.'
          confirmLabel='Chốt bảng lương'
          pendingLabel='Đang chốt...'
          successMessage='Đã chốt bảng lương'
          action={() => computeAndLockRun(id)}
          triggerLabel='Chốt bảng lương'
          disabled={pending}
        />
      </div>
    );
  }

  if (status === 'locked') {
    return (
      <ConfirmActionButton
        title='Xác nhận duyệt bảng lương'
        description='Sau khi duyệt, kỳ lương sẽ trở thành dữ liệu chính thức để phát hành nội bộ.'
        confirmLabel='Duyệt bảng lương'
        pendingLabel='Đang duyệt...'
        successMessage='Đã duyệt bảng lương'
        action={() => approvePayrollRun(id)}
        triggerLabel='Duyệt bảng lương'
        disabled={pending}
      />
    );
  }

  return null;
}
