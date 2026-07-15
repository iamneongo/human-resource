'use client';

import { ConfirmActionButton } from '@/features/hr/common/confirm-action-button';

type Result = { ok: true } | { ok: false; error: string };

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
  if (status !== 'pending') {
    return null;
  }

  return (
    <div className='flex gap-2'>
      <ConfirmActionButton
        title='Xác nhận duyệt'
        description='Bản ghi này sẽ được chuyển sang trạng thái đã duyệt và ảnh hưởng tới số liệu liên quan.'
        confirmLabel='Duyệt'
        pendingLabel='Đang duyệt...'
        successMessage='Đã duyệt'
        action={() => approve(id)}
        triggerLabel='Duyệt'
        triggerVariant='outline'
      />
      <ConfirmActionButton
        title='Xác nhận từ chối'
        description='Bản ghi này sẽ được chuyển sang trạng thái từ chối.'
        confirmLabel='Từ chối'
        pendingLabel='Đang từ chối...'
        successMessage='Đã từ chối'
        action={() => reject(id)}
        triggerLabel='Từ chối'
        triggerVariant='ghost'
      />
    </div>
  );
}
