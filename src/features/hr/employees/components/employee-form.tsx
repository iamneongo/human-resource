'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Icons } from '@/components/icons';
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
import { Textarea } from '@/components/ui/textarea';

import type { ActionResult } from '../actions';
import {
  employeeFormSchema,
  employeeStatusValues,
  genderValues,
  maritalStatusValues,
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

const MARITAL_LABEL: Record<(typeof maritalStatusValues)[number], string> = {
  single: 'Độc thân',
  married: 'Đã kết hôn',
  divorced: 'Ly hôn',
  widowed: 'Goá',
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
  action: (values: EmployeeFormValues) => Promise<ActionResult<unknown>>;
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
    address: defaults?.address ?? '',
    maritalStatus: defaults?.maritalStatus,
    hireDate: defaults?.hireDate ?? '',
    seniorityDate: defaults?.seniorityDate ?? '',
    probationEndDate: defaults?.probationEndDate ?? '',
    resignDate: defaults?.resignDate ?? '',
    resignReason: defaults?.resignReason ?? '',
    status: defaults?.status ?? 'probation',
    departmentId: defaults?.departmentId ?? '',
    positionId: defaults?.positionId ?? '',
    birthPlace: defaults?.birthPlace ?? '',
    cccdIssueDate: defaults?.cccdIssueDate ?? '',
    cccdIssuePlace: defaults?.cccdIssuePlace ?? '',
    nationality: defaults?.nationality ?? '',
    permanentAddress: defaults?.permanentAddress ?? '',
    educationLevel: defaults?.educationLevel ?? '',
    major: defaults?.major ?? '',
    jobTitle: defaults?.jobTitle ?? ''
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
        if (mode === 'create' && res.data && typeof res.data === 'object' && 'id' in res.data) {
          router.push(`/dashboard/hr/employees/${String(res.data.id)}`);
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
    <form onSubmit={handleSubmit} className='max-w-5xl space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Thông tin cơ bản</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
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
            <Field label='Tình trạng hôn nhân'>
              <Select
                value={values.maritalStatus ?? ''}
                onValueChange={(v) =>
                  set('maritalStatus', v as EmployeeFormValues['maritalStatus'])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder='Chọn tình trạng' />
                </SelectTrigger>
                <SelectContent>
                  {maritalStatusValues.map((status) => (
                    <SelectItem key={status} value={status}>
                      {MARITAL_LABEL[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label='Quốc tịch'>
              <Input
                value={values.nationality ?? ''}
                onChange={(e) => set('nationality', e.target.value)}
              />
            </Field>
          </div>
          <div className='mt-4 grid grid-cols-1 gap-4'>
            <Field label='Địa chỉ liên hệ'>
              <Textarea
                value={values.address ?? ''}
                onChange={(e) => set('address', e.target.value)}
                rows={3}
              />
            </Field>
            <Field label='Địa chỉ thường trú'>
              <Textarea
                value={values.permanentAddress ?? ''}
                onChange={(e) => set('permanentAddress', e.target.value)}
                rows={3}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Thông tin hành chính</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            <Field label='Nơi sinh'>
              <Input
                value={values.birthPlace ?? ''}
                onChange={(e) => set('birthPlace', e.target.value)}
              />
            </Field>
            <Field label='Ngày cấp CCCD'>
              <DatePickerVN
                value={values.cccdIssueDate ?? ''}
                onChange={(v) => set('cccdIssueDate', v)}
                placeholder='Chọn ngày cấp'
              />
            </Field>
            <Field label='Nơi cấp CCCD'>
              <Input
                value={values.cccdIssuePlace ?? ''}
                onChange={(e) => set('cccdIssuePlace', e.target.value)}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Thông tin công tác</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            <Field label='Ngày vào làm'>
              <DatePickerVN
                value={values.hireDate ?? ''}
                onChange={(v) => set('hireDate', v)}
                placeholder='Chọn ngày vào làm'
              />
            </Field>
            <Field label='Ngày tính thâm niên'>
              <DatePickerVN
                value={values.seniorityDate ?? ''}
                onChange={(v) => set('seniorityDate', v)}
                placeholder='Chọn ngày thâm niên'
              />
            </Field>
            <Field label='Hết thử việc'>
              <DatePickerVN
                value={values.probationEndDate ?? ''}
                onChange={(v) => set('probationEndDate', v)}
                placeholder='Chọn ngày hết thử việc'
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
            <Field label='Chức danh nội bộ'>
              <Input
                value={values.jobTitle ?? ''}
                onChange={(e) => set('jobTitle', e.target.value)}
              />
            </Field>
            <Field label='Ngày nghỉ việc'>
              <DatePickerVN
                value={values.resignDate ?? ''}
                onChange={(v) => set('resignDate', v)}
                placeholder='Chọn ngày nghỉ việc'
              />
            </Field>
          </div>
          <div className='mt-4'>
            <Field label='Lý do nghỉ việc'>
              <Textarea
                value={values.resignReason ?? ''}
                onChange={(e) => set('resignReason', e.target.value)}
                rows={3}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Học vấn và chuyên môn</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            <Field label='Trình độ học vấn'>
              <Input
                value={values.educationLevel ?? ''}
                onChange={(e) => set('educationLevel', e.target.value)}
              />
            </Field>
            <Field label='Chuyên ngành'>
              <Input value={values.major ?? ''} onChange={(e) => set('major', e.target.value)} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className='flex gap-3'>
        <Button type='submit' disabled={pending}>
          {pending ? (
            <>
              <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />
              Đang lưu...
            </>
          ) : mode === 'create' ? (
            'Tạo nhân viên'
          ) : (
            'Cập nhật'
          )}
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
