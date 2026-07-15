'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { ConfirmActionButton } from '@/features/hr/common/confirm-action-button';

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
      <ConfirmActionButton
        title='Xác nhận chấm dứt hợp đồng'
        description='Hợp đồng này sẽ được chuyển sang trạng thái chấm dứt để theo dõi lịch sử và báo cáo.'
        confirmLabel='Chấm dứt'
        pendingLabel='Đang chấm dứt...'
        successMessage='Đã chấm dứt hợp đồng'
        action={() => terminateContract(contractId)}
        triggerLabel='Chấm dứt'
        triggerVariant='destructive'
        confirmClassName='bg-destructive text-white hover:bg-destructive/90'
        disabled={pending}
      />
    </div>
  );
}
