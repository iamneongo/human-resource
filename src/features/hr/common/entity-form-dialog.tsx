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
import { Textarea } from '@/components/ui/textarea';

import { DatePickerVN } from '@/components/ui/date-picker-vn';
import { Combobox } from './combobox';
import { FileUpload } from './file-upload';

export type Option = { value: string; label: string };

export type FieldConfig = {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'email' | 'file';
  options?: Option[];
  required?: boolean;
  placeholder?: string;
  colSpan?: 1 | 2;
};

type ActionResult<TData = void> = { ok: true; data?: TData } | { ok: false; error: string };

export function EntityFormDialog({
  triggerLabel,
  title,
  description,
  fields,
  action,
  defaults = {},
  mode = 'create',
  triggerVariant = 'default',
  successMessage = 'Đã lưu',
  onSuccess
}: {
  triggerLabel?: string;
  title: string;
  description?: string;
  fields: FieldConfig[];
  action: (values: Record<string, string>) => Promise<ActionResult<any>>;
  defaults?: Record<string, string>;
  mode?: 'create' | 'edit';
  triggerVariant?: 'default' | 'outline' | 'ghost';
  successMessage?: string;
  onSuccess?: (result: ActionResult<any>) => void;
}) {
  const initial = () =>
    Object.fromEntries(fields.map((field) => [field.name, defaults[field.name] ?? '']));
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function set(name: string, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  function onSubmit() {
    for (const field of fields) {
      if (field.required && !values[field.name]) {
        toast.error(`Vui lòng nhập: ${field.label}`);
        return;
      }
    }

    startTransition(async () => {
      const result = await action(values);
      if (result.ok) {
        toast.success(successMessage);
        setValues(initial());
        setOpen(false);
        onSuccess?.(result);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function onOpenChange(nextOpen: boolean) {
    if (nextOpen) setValues(initial());
    setOpen(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {mode === 'edit' ? (
          <Button variant='ghost' size='icon' className='h-7 w-7' title='Chỉnh sửa'>
            <Icons.edit className='h-3.5 w-3.5' />
          </Button>
        ) : (
          <Button variant={triggerVariant} className='text-xs md:text-sm'>
            <Icons.add className='mr-2 h-4 w-4' /> {triggerLabel ?? 'Thêm mới'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
          {fields.map((field) => (
            <div
              key={field.name}
              className={
                field.colSpan === 2 || field.type === 'textarea'
                  ? 'flex flex-col gap-1.5 sm:col-span-2'
                  : 'flex flex-col gap-1.5'
              }
            >
              <Label className='text-xs'>
                {field.label}
                {field.required ? ' *' : ''}
              </Label>

              {field.type === 'select' && (field.options?.length ?? 0) > 8 ? (
                <Combobox
                  options={field.options ?? []}
                  value={values[field.name] ?? ''}
                  onChange={(value) => set(field.name, value)}
                  placeholder={field.placeholder ?? 'Chọn'}
                />
              ) : field.type === 'select' ? (
                <Select
                  value={values[field.name] ?? ''}
                  onValueChange={(value) => set(field.name, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={field.placeholder ?? 'Chọn'} />
                  </SelectTrigger>
                  <SelectContent>
                    {(field.options ?? []).map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field.type === 'textarea' ? (
                <Textarea
                  value={values[field.name] ?? ''}
                  onChange={(event) => set(field.name, event.target.value)}
                  placeholder={field.placeholder}
                />
              ) : field.type === 'file' ? (
                <FileUpload
                  value={values[field.name] || undefined}
                  onChange={(url) => set(field.name, url)}
                />
              ) : field.type === 'date' ? (
                <DatePickerVN
                  value={values[field.name] ?? ''}
                  onChange={(value) => set(field.name, value)}
                  placeholder={field.placeholder ?? 'Chọn ngày'}
                />
              ) : (
                <Input
                  type={field.type === 'number' ? 'number' : (field.type ?? 'text')}
                  value={values[field.name] ?? ''}
                  onChange={(event) => set(field.name, event.target.value)}
                  placeholder={field.placeholder}
                />
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => setOpen(false)} disabled={pending}>
            Hủy
          </Button>
          <Button onClick={onSubmit} disabled={pending}>
            {pending ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
