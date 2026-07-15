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
import { formatNumber, formatVND } from '@/lib/format';

type Props = {
  row: {
    period: string | null;
    employeeName: string | null;
    employeeCode: string | null;
    departmentName?: string | null;
    isPreview: boolean;
    runStatus: string | null;
    monthlyBaseSalary: number;
    salaryPerDay: number;
    workedDays: number;
    manualDays: number;
    timesheetDays: number;
    salaryByAttendance: number | string;
    fixedAllowance: number | string;
    overtimeHours: number;
    overtimePay: number | string;
    otherAdjustments: number | string;
    insuranceDeduction: number | string;
    taxDeduction: number | string;
    otherDeduction: number | string;
    grossPay: number | string;
    netPay: number | string;
  };
};

export function PayslipDetailDialog({ row }: Props) {
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
              ? 'Đây là bản preview để đối chiếu trước khi chốt bảng lương.'
              : 'Đây là phiếu lương chính thức dùng để phát hành nội bộ.'}
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-3 md:grid-cols-2'>
          <Info label='Mã nhân sự' value={row.employeeCode ?? '—'} />
          <Info label='Phòng ban' value={row.departmentName ?? '—'} />
          <Info label='Trạng thái kỳ lương' value={row.runStatus ?? '—'} />
          <Info label='Loại snapshot' value={row.isPreview ? 'Preview' : 'Chính thức'} />
        </div>

        <div className='rounded-xl border'>
          <div className='grid grid-cols-2 gap-x-4 gap-y-3 p-4 text-sm md:grid-cols-3'>
            <Info label='Lương cơ bản tháng' value={formatVND(row.monthlyBaseSalary)} />
            <Info label='Lương ngày' value={formatVND(row.salaryPerDay)} />
            <Info label='Số công thực tế' value={`${formatNumber(row.workedDays)} công`} />
            <Info label='Manual' value={`${formatNumber(row.manualDays)} công`} />
            <Info label='Timesheet' value={`${formatNumber(row.timesheetDays)} công`} />
            <Info label='Lương theo công' value={formatVND(row.salaryByAttendance)} />
            <Info label='Phụ cấp cố định' value={formatVND(row.fixedAllowance)} />
            <Info label='OT' value={`${formatNumber(row.overtimeHours)} giờ`} />
            <Info label='Tiền OT' value={formatVND(row.overtimePay)} />
            <Info label='Điều chỉnh khác' value={formatVND(row.otherAdjustments)} />
            <Info label='Gross pay' value={formatVND(row.grossPay)} />
            <Info label='BHXH/BHYT/BHTN' value={formatVND(row.insuranceDeduction)} />
            <Info label='Thuế TNCN' value={formatVND(row.taxDeduction)} />
            <Info label='Khấu trừ khác' value={formatVND(row.otherDeduction)} />
            <Info
              label='Thực nhận'
              value={formatVND(row.netPay)}
              className='md:col-span-3'
              strong
            />
          </div>
        </div>

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

function Info({
  label,
  value,
  className,
  strong
}: {
  label: string;
  value: string;
  className?: string;
  strong?: boolean;
}) {
  return (
    <div className={className}>
      <div className='text-muted-foreground text-xs uppercase tracking-wide'>{label}</div>
      <div className={strong ? 'mt-1 text-xl font-semibold' : 'mt-1 text-sm font-medium'}>
        {value}
      </div>
    </div>
  );
}
