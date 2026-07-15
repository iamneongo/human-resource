'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

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

type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

interface ConfirmActionButtonProps {
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  pendingLabel?: string;
  successMessage: string;
  action: () => Promise<ActionResult>;
  triggerLabel: React.ReactNode;
  triggerVariant?: ButtonVariant;
  triggerSize?: ButtonSize;
  triggerClassName?: string;
  confirmClassName?: string;
  disabled?: boolean;
  refreshOnSuccess?: boolean;
}

export function ConfirmActionButton({
  title,
  description,
  confirmLabel,
  pendingLabel,
  successMessage,
  action,
  triggerLabel,
  triggerVariant = 'outline',
  triggerSize = 'sm',
  triggerClassName,
  confirmClassName,
  disabled,
  refreshOnSuccess = true
}: ConfirmActionButtonProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onConfirm() {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(successMessage);
      setOpen(false);

      if (refreshOnSuccess) {
        router.refresh();
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          type='button'
          variant={triggerVariant}
          size={triggerSize}
          className={triggerClassName}
          disabled={disabled}
        >
          {triggerLabel}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Hủy</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={pending} className={confirmClassName}>
            {pending ? (pendingLabel ?? 'Đang xử lý...') : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
