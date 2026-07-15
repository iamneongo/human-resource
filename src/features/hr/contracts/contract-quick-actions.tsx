'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

import {
  createContractAppendix,
  renewContract,
  reissueContract,
  terminateContract
} from './actions';

type Props = {
  contractId: string;
};

export function ContractQuickActions({ contractId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(
    action: (id: string) => Promise<{ ok: true } | { ok: false; error: string }>,
    successMessage: string
  ) {
    startTransition(async () => {
      const result = await action(contractId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(successMessage);
      router.refresh();
    });
  }

  return (
    <div className='flex flex-wrap justify-end gap-2'>
      <Button variant='outline' size='sm' onClick={() => run(renewContract, 'Đã tạo bản gia hạn')}>
        Gia hạn
      </Button>
      <Button variant='outline' size='sm' onClick={() => run(reissueContract, 'Đã tạo bản tái ký')}>
        Tái ký
      </Button>
      <Button
        variant='outline'
        size='sm'
        onClick={() => run(createContractAppendix, 'Đã tạo phụ lục hợp đồng')}
      >
        Tạo phụ lục
      </Button>
      <Button
        variant='destructive'
        size='sm'
        disabled={pending}
        onClick={() => run(terminateContract, 'Đã chấm dứt hợp đồng')}
      >
        Chấm dứt
      </Button>
    </div>
  );
}
