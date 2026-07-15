import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Metadata } from 'next';
import Link from 'next/link';

import { InteractiveGridPattern } from './interactive-grid';

export const metadata: Metadata = {
  title: 'Authentication',
  description: 'Internal account provisioning notice for HRM.'
};

export default function SignUpViewPage() {
  return (
    <div className='relative h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0'>
      <Link
        href='/auth/sign-in'
        className={cn(
          buttonVariants({ variant: 'ghost' }),
          'absolute top-4 right-4 hidden md:top-8 md:right-8'
        )}
      >
        Đăng nhập
      </Link>
      <div className='relative hidden h-full flex-col p-10 lg:flex dark:border-r'>
        <div className='absolute inset-0 bg-sidebar' />
        <div className='text-sidebar-foreground relative z-20 flex items-center text-lg font-medium'>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
            className='mr-2 h-6 w-6'
          >
            <path d='M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3' />
          </svg>
          Nhân sự HRM
        </div>
        <InteractiveGridPattern
          className={cn(
            'mask-[radial-gradient(400px_circle_at_center,white,transparent)]',
            'inset-x-0 inset-y-[0%] h-full skew-y-12'
          )}
        />
        <div className='text-sidebar-foreground relative z-20 mt-auto'>
          <blockquote className='space-y-2'>
            <p className='text-lg'>&ldquo;Tài khoản được cấp tập trung bởi quản trị viên.&rdquo;</p>
            <footer className='text-sidebar-foreground/70 text-sm'>Nhân sự HRM</footer>
          </blockquote>
        </div>
      </div>
      <div className='flex h-full items-center justify-center p-4 lg:p-8'>
        <Card className='w-full max-w-md border-border/60 shadow-lg'>
          <CardHeader className='space-y-2'>
            <CardTitle className='text-2xl'>Không mở đăng ký công khai</CardTitle>
            <CardDescription>Liên hệ quản trị viên hoặc HR để được cấp tài khoản.</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <Link href='/auth/sign-in' className={cn(buttonVariants(), 'w-full')}>
              Quay về đăng nhập
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
