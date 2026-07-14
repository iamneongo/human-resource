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
  successMessage = 'Da luu',
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
  const initial = () => Object.fromEntries(fields.map((f) => [f.name, defaults[f.name] ?? '']));
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function set(name: string, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  function onSubmit() {
    for (const f of fields) {
      if (f.required && !values[f.name]) {
        toast.error(`Vui long nhap: ${f.label}`);
        return;
      }
    }

    startTransition(async () => {
      const res = await action(values);
      if (res.ok) {
        toast.success(successMessage);
        setValues(initial());
        setOpen(false);
        onSuccess?.(res);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  function onOpenChange(v: boolean) {
    if (v) setValues(initial());
    setOpen(v);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {mode === 'edit' ? (
          <Button variant='ghost' size='icon' className='h-7 w-7' title='Chinh sua'>
            <Icons.edit className='h-3.5 w-3.5' />
          </Button>
        ) : (
          <Button variant={triggerVariant} className='text-xs md:text-sm'>
            <Icons.add className='mr-2 h-4 w-4' /> {triggerLabel ?? 'Them moi'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
          {fields.map((f) => (
            <div
              key={f.name}
              className={
                f.colSpan === 2 || f.type === 'textarea'
                  ? 'flex flex-col gap-1.5 sm:col-span-2'
                  : 'flex flex-col gap-1.5'
              }
            >
              <Label className='text-xs'>
                {f.label}
                {f.required ? ' *' : ''}
              </Label>
              {f.type === 'select' && (f.options?.length ?? 0) > 8 ? (
                <Combobox
                  options={f.options ?? []}
                  value={values[f.name] ?? ''}
                  onChange={(v) => set(f.name, v)}
                  placeholder={f.placeholder ?? 'Chon'}
                />
              ) : f.type === 'select' ? (
                <Select value={values[f.name] ?? ''} onValueChange={(v) => set(f.name, v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={f.placeholder ?? 'Chon'} />
                  </SelectTrigger>
                  <SelectContent>
                    {(f.options ?? []).map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : f.type === 'textarea' ? (
                <Textarea
                  value={values[f.name] ?? ''}
                  onChange={(e) => set(f.name, e.target.value)}
                  placeholder={f.placeholder}
                />
              ) : f.type === 'file' ? (
                <FileUpload
                  value={values[f.name] || undefined}
                  onChange={(url) => set(f.name, url)}
                />
              ) : f.type === 'date' ? (
                <DatePickerVN
                  value={values[f.name] ?? ''}
                  onChange={(v) => set(f.name, v)}
                  placeholder={f.placeholder ?? 'Chon ngay'}
                />
              ) : (
                <Input
                  type={f.type === 'number' ? 'number' : (f.type ?? 'text')}
                  value={values[f.name] ?? ''}
                  onChange={(e) => set(f.name, e.target.value)}
                  placeholder={f.placeholder}
                />
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => setOpen(false)} disabled={pending}>
            Huy
          </Button>
          <Button onClick={onSubmit} disabled={pending}>
            {pending ? 'Dang luu...' : 'Luu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
