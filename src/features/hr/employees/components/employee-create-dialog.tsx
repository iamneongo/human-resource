'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Icons } from '@/components/icons';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

import { createEmployee } from '../actions';
import {
  employeeFormSchema,
  employeeStatusValues,
  genderValues,
  type EmployeeFormValues
} from '../schema';

const STATUS_LABEL: Record<(typeof employeeStatusValues)[number], string> = {
  active: 'Đang làm việc',
  probation: 'Thử việc',
  on_leave: 'Nghỉ phép',
  terminated: 'Đã nghỉ'
};

const GENDER_LABEL: Record<(typeof genderValues)[number], string> = {
  male: 'Nam',
  female: 'Nữ',
  other: 'Khác'
};

const EMPTY: EmployeeFormValues = {
  employeeCode: '',
  fullName: '',
  email: '',
  phone: '',
  soCccd: '',
  dateOfBirth: '',
  gender: undefined,
  hireDate: '',
  status: 'probation',
  departmentId: '',
  positionId: ''
};

type Option = { value: string; label: string };

export function EmployeeCreateDialog({
  departmentOptions = [],
  positionOptions = []
}: {
  departmentOptions?: Option[];
  positionOptions?: Option[];
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<EmployeeFormValues>(EMPTY);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function set<K extends keyof EmployeeFormValues>(
    key: K,
    value: EmployeeFormValues[K]
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function onSubmit() {
    const parsed = employeeFormSchema.safeParse(values);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ');
      return;
    }
    startTransition(async () => {
      const res = await createEmployee(parsed.data);
      if (res.ok) {
        toast.success('Đã tạo nhân viên mới');
        setValues(EMPTY);
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className='text-xs md:text-sm'>
          <Icons.add className='mr-2 h-4 w-4' /> Thêm nhân viên
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Thêm nhân viên mới</DialogTitle>
          <DialogDescription>
            Nhập thông tin hồ sơ nhân viên điện tử.
          </DialogDescription>
        </DialogHeader>

        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
          <Field label='Mã nhân viên *'>
            <Input
              value={values.employeeCode}
              onChange={(e) => set('employeeCode', e.target.value)}
              placeholder='NV0001'
            />
          </Field>
          <Field label='Họ và tên *'>
            <Input
              value={values.fullName}
              onChange={(e) => set('fullName', e.target.value)}
              placeholder='Nguyễn Văn A'
            />
          </Field>
          <Field label='Email'>
            <Input
              type='email'
              value={values.email ?? ''}
              onChange={(e) => set('email', e.target.value)}
            />
          </Field>
          <Field label='Số điện thoại'>
            <Input
              value={values.phone ?? ''}
              onChange={(e) => set('phone', e.target.value)}
            />
          </Field>
          <Field label='CMND/CCCD'>
            <Input
              value={values.soCccd ?? ''}
              onChange={(e) => set('soCccd', e.target.value)}
            />
          </Field>
          <Field label='Ngày sinh'>
            <Input
              type='date'
              value={values.dateOfBirth ?? ''}
              onChange={(e) => set('dateOfBirth', e.target.value)}
            />
          </Field>
          <Field label='Giới tính'>
            <Select
              value={values.gender ?? ''}
              onValueChange={(v) =>
                set('gender', v as EmployeeFormValues['gender'])
              }
            >
              <SelectTrigger>
                <SelectValue placeholder='Chọn' />
              </SelectTrigger>
              <SelectContent>
                {genderValues.map((g) => (
                  <SelectItem key={g} value={g}>
                    {GENDER_LABEL[g]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label='Ngày vào làm'>
            <Input
              type='date'
              value={values.hireDate ?? ''}
              onChange={(e) => set('hireDate', e.target.value)}
            />
          </Field>
          <Field label='Trạng thái'>
            <Select
              value={values.status}
              onValueChange={(v) =>
                set('status', v as EmployeeFormValues['status'])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {employeeStatusValues.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {departmentOptions.length > 0 ? (
            <Field label='Phòng ban'>
              <Select
                value={values.departmentId ?? ''}
                onValueChange={(v) => set('departmentId', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Chọn' />
                </SelectTrigger>
                <SelectContent>
                  {departmentOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : null}
          {positionOptions.length > 0 ? (
            <Field label='Chức vụ'>
              <Select
                value={values.positionId ?? ''}
                onValueChange={(v) => set('positionId', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Chọn' />
                </SelectTrigger>
                <SelectContent>
                  {positionOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Huỷ
          </Button>
          <Button onClick={onSubmit} disabled={pending}>
            {pending ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className='flex flex-col gap-1.5'>
      <Label className='text-xs'>{label}</Label>
      {children}
    </div>
  );
}
