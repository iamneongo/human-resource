'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';

type ActionResult = { ok: true } | { ok: false; error: string };

export function ConfirmDeleteDialog({
  label,
  action,
  disabled,
  triggerVariant = 'ghost'
}: {
  label: string;
  action: () => Promise<ActionResult>;
  disabled?: boolean;
  triggerVariant?: 'ghost' | 'outline' | 'destructive';
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onConfirm() {
    startTransition(async () => {
      const res = await action();
      if (res.ok) {
        toast.success('Đã xoá');
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant={triggerVariant}
          size='icon'
          className='text-destructive hover:text-destructive h-7 w-7'
          disabled={disabled}
          title='Xoá'
        >
          <Icons.trash className='h-3.5 w-3.5' />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xác nhận xoá</AlertDialogTitle>
          <AlertDialogDescription>
            Bạn có chắc muốn xoá <strong>{label}</strong>? Hành động này không thể hoàn tác.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Huỷ</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={pending}
            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
          >
            {pending ? 'Đang xoá...' : 'Xoá'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
