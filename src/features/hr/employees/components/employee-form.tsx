'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePickerVN } from '@/components/ui/date-picker-vn';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

import {
  employeeFormSchema,
  employeeStatusValues,
  genderValues,
  type EmployeeFormValues
} from '../schema';
import type { ActionResult } from '../actions';

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

type Option = { value: string; label: string };

function Field({
  label,
  required,
  children
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className='flex flex-col gap-1.5'>
      <Label className='text-sm'>
        {label}
        {required ? ' *' : ''}
      </Label>
      {children}
    </div>
  );
}

export function EmployeeForm({
  mode,
  defaults,
  action,
  cancelHref,
  departmentOptions = [],
  positionOptions = []
}: {
  mode: 'create' | 'edit';
  defaults?: Partial<EmployeeFormValues>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  action: (values: EmployeeFormValues) => Promise<ActionResult<any>>;
  cancelHref: string;
  departmentOptions?: Option[];
  positionOptions?: Option[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [values, setValues] = useState<EmployeeFormValues>({
    employeeCode: defaults?.employeeCode ?? '',
    fullName: defaults?.fullName ?? '',
    email: defaults?.email ?? '',
    phone: defaults?.phone ?? '',
    soCccd: defaults?.soCccd ?? '',
    dateOfBirth: defaults?.dateOfBirth ?? '',
    gender: defaults?.gender,
    hireDate: defaults?.hireDate ?? '',
    status: defaults?.status ?? 'probation',
    departmentId: defaults?.departmentId ?? '',
    positionId: defaults?.positionId ?? ''
  });

  function set<K extends keyof EmployeeFormValues>(key: K, value: EmployeeFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = employeeFormSchema.safeParse(values);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ');
      return;
    }
    startTransition(async () => {
      const res = await action(parsed.data);
      if (res.ok) {
        toast.success(mode === 'create' ? 'Đã tạo nhân viên mới' : 'Đã cập nhật nhân viên');
        if (mode === 'create' && res.data && 'id' in res.data) {
          router.push(`/dashboard/hr/employees/${res.data.id}`);
        } else {
          router.push(cancelHref);
          router.refresh();
        }
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-6 max-w-3xl'>
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Thông tin cơ bản</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            <Field label='Mã nhân viên' required>
              <Input
                value={values.employeeCode}
                onChange={(e) => set('employeeCode', e.target.value)}
                placeholder='NV0001'
                disabled={mode === 'edit'}
              />
            </Field>
            <Field label='Họ và tên' required>
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
              <Input value={values.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
            </Field>
            <Field label='CMND / CCCD'>
              <Input value={values.soCccd ?? ''} onChange={(e) => set('soCccd', e.target.value)} />
            </Field>
            <Field label='Ngày sinh'>
              <DatePickerVN
                value={values.dateOfBirth ?? ''}
                onChange={(v) => set('dateOfBirth', v)}
                placeholder='Chọn ngày sinh'
              />
            </Field>
            <Field label='Giới tính'>
              <Select
                value={values.gender ?? ''}
                onValueChange={(v) => set('gender', v as EmployeeFormValues['gender'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Chọn giới tính' />
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
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Thông tin công tác</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            <Field label='Ngày vào làm'>
              <DatePickerVN
                value={values.hireDate ?? ''}
                onChange={(v) => set('hireDate', v)}
                placeholder='Chọn ngày vào làm'
              />
            </Field>
            <Field label='Trạng thái' required>
              <Select
                value={values.status}
                onValueChange={(v) => set('status', v as EmployeeFormValues['status'])}
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
            {departmentOptions.length > 0 && (
              <Field label='Phòng ban'>
                <Select
                  value={values.departmentId ?? ''}
                  onValueChange={(v) => set('departmentId', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Chọn phòng ban' />
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
            )}
            {positionOptions.length > 0 && (
              <Field label='Chức vụ'>
                <Select value={values.positionId ?? ''} onValueChange={(v) => set('positionId', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder='Chọn chức vụ' />
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
            )}
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className='flex gap-3'>
        <Button type='submit' disabled={pending}>
          {pending ? 'Đang lưu...' : mode === 'create' ? 'Tạo nhân viên' : 'Cập nhật'}
        </Button>
        <Button
          type='button'
          variant='outline'
          disabled={pending}
          onClick={() => router.push(cancelHref)}
        >
          Huỷ
        </Button>
      </div>
    </form>
  );
}
