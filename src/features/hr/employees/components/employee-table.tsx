import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

type EmployeeRow = {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  status: string;
  hireDate: string | null;
  departmentName: string | null;
  positionTitle: string | null;
};

const STATUS_META: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
> = {
  active: { label: 'Đang làm việc', variant: 'default' },
  probation: { label: 'Thử việc', variant: 'secondary' },
  on_leave: { label: 'Nghỉ phép', variant: 'outline' },
  terminated: { label: 'Đã nghỉ', variant: 'destructive' }
};

export function EmployeeTable({ rows }: { rows: EmployeeRow[] }) {
  if (rows.length === 0) {
    return (
      <div className='text-muted-foreground rounded-lg border p-8 text-center text-sm'>
        Chưa có nhân viên nào. Nhấn “Thêm nhân viên” để bắt đầu.
      </div>
    );
  }

  return (
    <div className='rounded-lg border'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mã NV</TableHead>
            <TableHead>Họ tên</TableHead>
            <TableHead>Phòng ban</TableHead>
            <TableHead>Chức vụ</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Ngày vào làm</TableHead>
            <TableHead>Trạng thái</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const meta = STATUS_META[r.status] ?? {
              label: r.status,
              variant: 'outline' as const
            };
            return (
              <TableRow key={r.id}>
                <TableCell className='font-medium'>{r.employeeCode}</TableCell>
                <TableCell>{r.fullName}</TableCell>
                <TableCell>{r.departmentName ?? '—'}</TableCell>
                <TableCell>{r.positionTitle ?? '—'}</TableCell>
                <TableCell>{r.email ?? '—'}</TableCell>
                <TableCell>{r.hireDate ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
