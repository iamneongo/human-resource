import Link from 'next/link';

export default function AboutPage() {
  return (
    <main className='container mx-auto max-w-4xl px-4 py-10'>
      <div className='space-y-8'>
        <section className='space-y-3'>
          <h1 className='text-3xl font-bold'>Giới thiệu hệ thống HRM</h1>
          <p className='text-muted-foreground leading-7'>
            Ứng dụng được xây cho quản lý nhân sự, chấm công, tiền lương và vận hành nội bộ trên một
            nền tảng thống nhất.
          </p>
        </section>

        <section className='space-y-3'>
          <h2 className='text-xl font-semibold'>Xác thực đăng nhập</h2>
          <p className='text-muted-foreground leading-7'>
            Hệ thống hiện dùng <strong>Better Auth</strong> kết hợp <strong>Resend OTP</strong> để
            đăng nhập bằng email công việc. Cách này giúp luồng truy cập nội bộ gọn hơn và dễ tự chủ
            hơn so với giải pháp cũ.
          </p>
        </section>

        <section className='space-y-3'>
          <h2 className='text-xl font-semibold'>Công nghệ chính</h2>
          <p className='text-muted-foreground leading-7'>
            Next.js 16, React 19, Drizzle ORM, PostgreSQL, shadcn/ui và Better Auth.
          </p>
        </section>

        <section className='space-y-3'>
          <h2 className='text-xl font-semibold'>Liên hệ</h2>
          <p className='text-muted-foreground leading-7'>
            Nếu cần tích hợp thêm billing, mời thành viên hoặc workflow phê duyệt sâu hơn, có thể mở
            rộng tiếp từ kiến trúc hiện tại.
          </p>
          <Link href='/' className='text-primary underline underline-offset-4'>
            Quay lại trang chủ
          </Link>
        </section>
      </div>
    </main>
  );
}
