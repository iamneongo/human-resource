'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

type Result = { ok: true } | { ok: false; error: string };

/**
 * Nút duyệt / từ chối cho các bản ghi chờ phê duyệt (OT, nghỉ phép, điều chỉnh).
 * `approve`/`reject` là Server Actions truyền từ trang.
 */
export function ApprovalActions({
  id,
  status,
  approve,
  reject
}: {
  id: string;
  status: string;
  approve: (id: string) => Promise<Result>;
  reject: (id: string) => Promise<Result>;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (status !== 'pending') {
    return null;
  }

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

  return (
    <div className='flex gap-2'>
      <Button
        size='sm'
        variant='outline'
        disabled={pending}
        onClick={() => run(approve, 'Đã duyệt')}
      >
        Duyệt
      </Button>
      <Button
        size='sm'
        variant='ghost'
        disabled={pending}
        onClick={() => run(reject, 'Đã từ chối')}
      >
        Từ chối
      </Button>
    </div>
  );
}
