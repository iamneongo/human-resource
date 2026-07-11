'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { scoreEvaluation } from './evaluations';

export function ScoreDialog({
  id,
  selfScore,
  managerScore
}: {
  id: string;
  selfScore: string | null;
  managerScore: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [self, setSelf] = useState(selfScore ?? '');
  const [manager, setManager] = useState(managerScore ?? '');
  const [comment, setComment] = useState('');
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    startTransition(async () => {
      const res = await scoreEvaluation({
        id,
        selfScore: self,
        managerScore: manager,
        comment
      });
      if (res.ok) {
        toast.success('Đã lưu điểm đánh giá');
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
        <Button size='sm' variant='outline'>
          Chấm điểm
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Chấm điểm đánh giá (thang 100)</DialogTitle>
        </DialogHeader>
        <div className='grid gap-4'>
          <div className='flex flex-col gap-1.5'>
            <Label className='text-xs'>Tự đánh giá (self)</Label>
            <Input type='number' value={self} onChange={(e) => setSelf(e.target.value)} />
          </div>
          <div className='flex flex-col gap-1.5'>
            <Label className='text-xs'>Quản lý chấm (chỉ manager+)</Label>
            <Input type='number' value={manager} onChange={(e) => setManager(e.target.value)} />
          </div>
          <div className='flex flex-col gap-1.5'>
            <Label className='text-xs'>Nhận xét</Label>
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} />
          </div>
          <p className='text-muted-foreground text-xs'>
            Điểm cuối = trung bình self và manager; tự động xếp loại A/B/C/D.
          </p>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => setOpen(false)} disabled={pending}>
            Huỷ
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
