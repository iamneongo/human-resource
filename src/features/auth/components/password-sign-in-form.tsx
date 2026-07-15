'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';
import { normalizeAuthIdentifier } from '@/lib/auth-identity';

export function PasswordSignInForm() {
  const router = useRouter();
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [isPending, startTransition] = useTransition();

  function getErrorMessage(error: unknown) {
    if (error && typeof error === 'object') {
      const candidate = 'message' in error ? error.message : 'error' in error ? error.error : null;
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate;
      }
    }

    return 'Đăng nhập không thành công. Vui lòng kiểm tra lại tài khoản và mật khẩu.';
  }

  function handleSubmit() {
    const normalizedAccount = normalizeAuthIdentifier(account);
    if (!normalizedAccount) {
      toast.error('Vui lòng nhập tài khoản đăng nhập.');
      return;
    }

    if (!password.trim()) {
      toast.error('Vui lòng nhập mật khẩu.');
      return;
    }

    startTransition(async () => {
      try {
        const result = await authClient.signIn.email({
          email: normalizedAccount,
          password,
          callbackURL: '/dashboard/overview'
        });

        if (result.error) {
          throw result.error;
        }

        toast.success('Đăng nhập thành công.');
        router.push('/dashboard/overview');
        router.refresh();
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    });
  }

  return (
    <Card className='w-full border-border/60 shadow-lg'>
      <CardHeader className='space-y-2'>
        <CardTitle className='text-2xl'>Đăng nhập</CardTitle>
        <CardDescription>Nhập tài khoản và mật khẩu.</CardDescription>
      </CardHeader>
      <CardContent className='space-y-5'>
        <div className='space-y-2'>
          <Label htmlFor='account'>Tài khoản</Label>
          <Input
            id='account'
            type='text'
            autoComplete='username'
            placeholder='hrdemo hoặc ten@congty.com'
            value={account}
            onChange={(event) => setAccount(event.target.value)}
            disabled={isPending}
          />
        </div>

        <div className='space-y-2'>
          <Label htmlFor='password'>Mật khẩu</Label>
          <Input
            id='password'
            type='password'
            autoComplete='current-password'
            placeholder='Nhập mật khẩu'
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isPending}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleSubmit();
              }
            }}
          />
        </div>

        <Button type='button' className='w-full' onClick={handleSubmit} isLoading={isPending}>
          Đăng nhập
        </Button>
      </CardContent>
    </Card>
  );
}
