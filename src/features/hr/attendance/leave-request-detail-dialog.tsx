'use client';

import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';

type LeaveDetailRow = {
  typeLabel: string;
  statusLabel: string;
  statusVariant: 'default' | 'secondary' | 'destructive' | 'outline';
  employeeName: string;
  employeeCode: string;
  departmentName: string;
  startDate: string;
  endDate: string;
  days: string | number;
  reason: string | null;
  remainingDays: string | null;
  entitledDays?: string | null;
  usedDays?: string | null;
};

export function LeaveRequestDetailDialog({ row }: { row: LeaveDetailRow }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size='sm' variant='outline'>
          Xem nhanh
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-xl'>
        <DialogHeader>
          <DialogTitle>Chi tiết đơn nghỉ phép</DialogTitle>
          <DialogDescription>
            Kiểm tra người tạo, số ngày nghỉ và tác động tới số dư phép.
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-3 sm:grid-cols-2'>
          <Info label='Nhân sự' value={row.employeeName} />
          <Info label='Mã nhân sự' value={row.employeeCode} />
          <Info label='Bộ phận' value={row.departmentName} />
          <Info label='Loại phép' value={row.typeLabel} />
          <Info label='Từ ngày' value={row.startDate} />
          <Info label='Đến ngày' value={row.endDate} />
          <Info label='Số ngày nghỉ' value={`${row.days} ngày`} />
          <div>
            <div className='text-muted-foreground text-xs uppercase tracking-wide'>Trạng thái</div>
            <div className='mt-1'>
              <Badge variant={row.statusVariant}>{row.statusLabel}</Badge>
            </div>
          </div>
        </div>

        <div className='grid gap-3 rounded-xl border p-4 sm:grid-cols-3'>
          <Info label='Tổng phép năm' value={`${row.entitledDays ?? '0'} ngày`} />
          <Info label='Đã dùng' value={`${row.usedDays ?? '0'} ngày`} />
          <Info label='Còn lại' value={`${row.remainingDays ?? '0'} ngày`} />
        </div>

        <div className='rounded-xl border p-4'>
          <div className='text-muted-foreground text-xs uppercase tracking-wide'>Lý do</div>
          <div className='mt-1 text-sm'>{row.reason || 'Không có ghi chú thêm.'}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className='text-muted-foreground text-xs uppercase tracking-wide'>{label}</div>
      <div className='mt-1 text-sm font-medium'>{value}</div>
    </div>
  );
}
