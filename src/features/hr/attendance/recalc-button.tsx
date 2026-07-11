'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { recalcLeaveBalances } from './leave-balances';

export function RecalcButton() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <Button
      className='text-xs md:text-sm'
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await recalcLeaveBalances();
          if (res.ok) {
            toast.success('Đã tính lại số dư phép theo thâm niên');
            router.refresh();
          } else {
            toast.error(res.error);
          }
        })
      }
    >
      {pending ? 'Đang tính...' : 'Tính lại theo thâm niên'}
    </Button>
  );
}
