import Image from 'next/image';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Metadata } from 'next';
import Link from 'next/link';

import { InteractiveGridPattern } from './interactive-grid';
import { PasswordSignInForm } from './password-sign-in-form';

export const metadata: Metadata = {
  title: 'Authentication',
  description: 'Internal account sign-in for HRM.'
};

export default function SignInViewPage() {
  return (
    <div className='relative flex min-h-screen flex-col items-center justify-center overflow-hidden md:grid lg:max-w-none lg:grid-cols-2 lg:px-0'>
      <Link
        href='/auth/sign-up'
        className={cn(
          buttonVariants({ variant: 'ghost' }),
          'absolute top-4 right-4 hidden md:top-8 md:right-8'
        )}
      >
        Cấp tài khoản
      </Link>
      <div className='relative hidden h-full flex-col p-10 lg:flex dark:border-r'>
        <div className='absolute inset-0 bg-sidebar' />
        <div className='text-sidebar-foreground relative z-20 flex items-center gap-3 text-lg font-medium'>
          <div className='bg-sidebar-primary/8 ring-sidebar-primary/12 flex size-12 shrink-0 items-center justify-center rounded-2xl ring-1'>
            <Image
              src='/brand/app-logo.png'
              alt='Nhân sự HRM'
              width={36}
              height={36}
              className='size-9 object-contain'
              priority
            />
          </div>
          <div className='space-y-0.5'>
            <div className='text-xl font-semibold'>Nhân sự HRM</div>
            <div className='text-sidebar-foreground/70 text-sm'>
              Hệ thống quản lý nguồn nhân lực
            </div>
          </div>
        </div>
        <InteractiveGridPattern
          className={cn(
            'mask-[radial-gradient(400px_circle_at_center,white,transparent)]',
            'inset-x-0 inset-y-[0%] h-full skew-y-12'
          )}
        />
        <div className='text-sidebar-foreground relative z-20 mt-auto'>
          <blockquote className='space-y-2'>
            <p className='text-lg'>&ldquo;Nền tảng vận hành nhân sự nội bộ của công ty.&rdquo;</p>
            <footer className='text-sidebar-foreground/70 text-sm'>Nhân sự HRM</footer>
          </blockquote>
        </div>
      </div>
      <div className='flex h-full items-center justify-center p-4 lg:p-8'>
        <div className='flex w-full max-w-md flex-col items-center justify-center space-y-6'>
          <div className='flex flex-col items-center gap-3 lg:hidden'>
            <div className='bg-primary/5 ring-primary/10 flex size-14 items-center justify-center rounded-2xl ring-1'>
              <Image
                src='/brand/app-logo.png'
                alt='Nhân sự HRM'
                width={40}
                height={40}
                className='size-10 object-contain'
                priority
              />
            </div>
            <div className='space-y-1 text-center'>
              <div className='text-lg font-semibold'>Nhân sự HRM</div>
              <p className='text-muted-foreground text-sm'>Đăng nhập vào không gian làm việc</p>
            </div>
          </div>
          <PasswordSignInForm />
          <p className='text-muted-foreground px-8 text-center text-sm'>
            Khi tiếp tục, bạn đồng ý với{' '}
            <Link
              href='/terms-of-service'
              className='hover:text-primary underline underline-offset-4'
            >
              Điều khoản dịch vụ
            </Link>{' '}
            và{' '}
            <Link
              href='/privacy-policy'
              className='hover:text-primary underline underline-offset-4'
            >
              Chính sách bảo mật
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
