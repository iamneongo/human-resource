'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';

type Step = 'email' | 'otp';

export function OtpSignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<Step>('email');
  const [isPending, startTransition] = useTransition();

  function normalizeEmail(value: string) {
    return value.trim().toLowerCase();
  }

  function extractErrorMessage(payload: unknown, fallback: string) {
    if (payload && typeof payload === 'object' && 'message' in payload) {
      const message = payload.message;
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }
    return fallback;
  }

  async function sendOtp() {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      toast.error('Vui lòng nhập email đăng nhập.');
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch('/api/auth/email-otp/send-verification-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: normalizedEmail, type: 'sign-in' })
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(extractErrorMessage(payload, 'Không thể gửi OTP.'));
        }

        setEmail(normalizedEmail);
        setStep('otp');
        toast.success('OTP đã được gửi tới email của bạn.');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Không thể gửi OTP.');
      }
    });
  }

  async function verifyOtp() {
    if (otp.trim().length !== 6) {
      toast.error('Vui lòng nhập đủ 6 số OTP.');
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch('/api/auth/sign-in/email-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: normalizeEmail(email), otp: otp.trim() })
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(extractErrorMessage(payload, 'OTP không hợp lệ hoặc đã hết hạn.'));
        }

        toast.success('Đăng nhập thành công.');
        router.push('/dashboard/overview');
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Không thể đăng nhập.');
      }
    });
  }

  return (
    <Card className='w-full border-border/60 shadow-lg'>
      <CardHeader className='space-y-2'>
        <CardTitle className='text-2xl'>Đăng nhập bằng OTP</CardTitle>
        <CardDescription>
          Nhập email công việc để nhận mã OTP qua Resend. Nếu đây là lần đăng nhập đầu tiên, hệ
          thống sẽ tự tạo tài khoản nội bộ cho email đó.
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-5'>
        <div className='space-y-2'>
          <Label htmlFor='email'>Email</Label>
          <Input
            id='email'
            type='email'
            inputMode='email'
            autoComplete='email'
            placeholder='hr@congty.com'
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isPending || step === 'otp'}
          />
        </div>

        {step === 'otp' ? (
          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label>Mã OTP</Label>
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={setOtp}
                containerClassName='justify-center'
                disabled={isPending}
              >
                <InputOTPGroup>
                  {Array.from({ length: 6 }, (_, index) => (
                    <InputOTPSlot key={index} index={index} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            <div className='flex gap-3'>
              <Button
                type='button'
                variant='outline'
                className='flex-1'
                onClick={() => {
                  setOtp('');
                  setStep('email');
                }}
                disabled={isPending}
              >
                Đổi email
              </Button>
              <Button type='button' className='flex-1' onClick={verifyOtp} isLoading={isPending}>
                Xác nhận OTP
              </Button>
            </div>

            <Button type='button' variant='ghost' className='w-full' onClick={sendOtp}>
              Gửi lại OTP
            </Button>
          </div>
        ) : (
          <Button type='button' className='w-full' onClick={sendOtp} isLoading={isPending}>
            Gửi OTP đăng nhập
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
