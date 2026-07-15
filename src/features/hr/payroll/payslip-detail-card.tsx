import { Badge } from '@/components/ui/badge';
import { formatNumber, formatVND } from '@/lib/format';

export type PayslipDetailRow = {
  payrollRunId?: string;
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

export function PayslipDetailCard({
  row,
  showStatusBadge = true,
  viewer = 'hr'
}: {
  row: PayslipDetailRow;
  showStatusBadge?: boolean;
  viewer?: 'hr' | 'employee';
}) {
  return (
    <div className='space-y-4'>
      <div className='flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-start sm:justify-between'>
        <div className='space-y-1'>
          <div className='text-xl font-semibold'>
            Phiếu lương {row.period ?? '—'} · {row.employeeName ?? 'Nhân sự'}
          </div>
          <div className='text-muted-foreground text-sm'>
            {row.employeeCode ?? '—'} · {row.departmentName ?? '—'}
          </div>
        </div>
        {showStatusBadge ? (
          <Badge variant={row.isPreview ? 'outline' : 'default'}>
            {row.isPreview
              ? 'Bản preview'
              : viewer === 'employee'
                ? 'Đã phát hành nội bộ'
                : 'Bản chính thức'}
          </Badge>
        ) : null}
      </div>

      <div className='grid gap-3 md:grid-cols-2'>
        <Info label='Mã nhân sự' value={row.employeeCode ?? '—'} />
        <Info label='Bộ phận' value={row.departmentName ?? '—'} />
        <Info label='Trạng thái kỳ lương' value={row.runStatus ?? '—'} />
        <Info
          label='Loại phiếu'
          value={
            row.isPreview
              ? 'Bản preview'
              : viewer === 'employee'
                ? 'Bản đã phát hành'
                : 'Bản chính thức'
          }
        />
      </div>

      <div className='rounded-xl border'>
        <div className='grid grid-cols-2 gap-x-4 gap-y-3 p-4 text-sm md:grid-cols-3'>
          <Info label='Lương cơ bản tháng' value={formatVND(row.monthlyBaseSalary)} />
          <Info label='Lương ngày' value={formatVND(row.salaryPerDay)} />
          <Info label='Số công thực tế' value={`${formatNumber(row.workedDays)} công`} />
          <Info label='Công thủ công' value={`${formatNumber(row.manualDays)} công`} />
          <Info label='Công máy' value={`${formatNumber(row.timesheetDays)} công`} />
          <Info label='Lương theo công' value={formatVND(row.salaryByAttendance)} />
          <Info label='Phụ cấp cố định' value={formatVND(row.fixedAllowance)} />
          <Info label='OT' value={`${formatNumber(row.overtimeHours)} giờ`} />
          <Info label='Tiền OT' value={formatVND(row.overtimePay)} />
          <Info label='Điều chỉnh khác' value={formatVND(row.otherAdjustments)} />
          <Info label='Tổng thu nhập' value={formatVND(row.grossPay)} />
          <Info label='BHXH/BHYT/BHTN' value={formatVND(row.insuranceDeduction)} />
          <Info label='Thuế TNCN' value={formatVND(row.taxDeduction)} />
          <Info label='Khấu trừ khác' value={formatVND(row.otherDeduction)} />
          <Info label='Thực nhận' value={formatVND(row.netPay)} className='md:col-span-3' strong />
        </div>
      </div>
    </div>
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
