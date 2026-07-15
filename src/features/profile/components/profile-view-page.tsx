'use client';

import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { authClient } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

export default function ProfileViewPage() {
  const { data: currentSession, isPending } = authClient.useSession();
  const user = currentSession?.user;

  return (
    <div className='flex w-full flex-col gap-4 p-4'>
      <Card className='max-w-2xl'>
        <CardHeader>
          <CardTitle>Hồ sơ đăng nhập</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          {isPending ? (
            <div className='text-muted-foreground text-sm'>Đang tải thông tin tài khoản...</div>
          ) : user ? (
            <>
              <div className='grid gap-1'>
                <span className='text-muted-foreground text-sm'>Họ tên</span>
                <span className='font-medium'>{user.name || 'Chưa cập nhật'}</span>
              </div>
              <div className='grid gap-1'>
                <span className='text-muted-foreground text-sm'>Email</span>
                <span className='font-medium'>{user.email}</span>
              </div>
              <div className='grid gap-1'>
                <span className='text-muted-foreground text-sm'>Vai trò hệ thống</span>
                <Badge variant='secondary' className='w-fit'>
                  {user.role || 'employee'}
                </Badge>
              </div>
            </>
          ) : (
            <div className='text-muted-foreground text-sm'>
              Không tìm thấy phiên đăng nhập hiện tại.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className='max-w-2xl'>
        <CardHeader>
          <CardTitle>Phiếu lương của tôi</CardTitle>
        </CardHeader>
        <CardContent className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div className='text-muted-foreground text-sm'>
            Xem các phiếu lương đã được HR phát hành nội bộ cho tài khoản của bạn.
          </div>
          <Link href='/dashboard/profile/payslips' className={cn(buttonVariants())}>
            Mở phiếu lương
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
