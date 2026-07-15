'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';

import { PayslipDetailCard, type PayslipDetailRow } from './payslip-detail-card';

type Props = {
  row: PayslipDetailRow;
  viewer?: 'hr' | 'employee';
};

export function PayslipDetailDialog({ row, viewer = 'hr' }: Props) {
  const [open, setOpen] = useState(false);

  function handlePrint() {
    window.print();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant='outline' size='sm'>
          Xem phiếu lương
        </Button>
      </DialogTrigger>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-2xl print:max-w-none'>
        <DialogHeader>
          <DialogTitle>
            Phiếu lương {row.period ?? '—'} · {row.employeeName ?? 'Nhân sự'}
          </DialogTitle>
          <DialogDescription>
            {row.isPreview
              ? 'Bản preview chỉ dùng để đối chiếu trước khi chốt bảng lương.'
              : viewer === 'employee'
                ? 'Đây là phiếu lương chính thức đã được phát hành nội bộ.'
                : 'Đây là phiếu lương chính thức dùng để phát hành nội bộ.'}
          </DialogDescription>
        </DialogHeader>

        <PayslipDetailCard row={row} viewer={viewer} />

        <DialogFooter className='gap-2 sm:justify-end'>
          <Button variant='outline' onClick={handlePrint}>
            In / Xuất PDF
          </Button>
          <Button onClick={() => setOpen(false)}>Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
