'use client';

import { ConfirmActionButton } from '@/features/hr/common/confirm-action-button';

type Result = { ok: true } | { ok: false; error: string };

export function LeaveRequestActions({
  leaveId,
  canCancel,
  cancel
}: {
  leaveId: string;
  canCancel: boolean;
  cancel: (id: string) => Promise<Result>;
}) {
  if (!canCancel) {
    return null;
  }

  return (
    <ConfirmActionButton
      title='Xác nhận hủy đơn nghỉ'
      description='Đơn nghỉ này sẽ bị hủy và không còn chờ duyệt nữa.'
      confirmLabel='Hủy đơn'
      pendingLabel='Đang hủy...'
      successMessage='Đã hủy đơn nghỉ.'
      action={() => cancel(leaveId)}
      triggerLabel='Hủy đơn'
      triggerVariant='ghost'
    />
  );
}
