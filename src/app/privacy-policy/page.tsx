import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <main className='container mx-auto max-w-4xl px-4 py-10'>
      <div className='space-y-8'>
        <section className='space-y-3'>
          <h1 className='text-3xl font-bold'>Chính sách bảo mật</h1>
          <p className='text-muted-foreground leading-7'>
            Tài liệu này mô tả cách hệ thống HRM xử lý thông tin đăng nhập và dữ liệu nhân sự nội
            bộ.
          </p>
        </section>

        <section className='space-y-3'>
          <h2 className='text-xl font-semibold'>Xác thực và OTP</h2>
          <p className='text-muted-foreground leading-7'>
            Đăng nhập được xử lý qua Better Auth. Mã OTP được gửi bằng Resend tới email công việc mà
            người dùng cung cấp. Nếu chưa cấu hình Resend ở môi trường phát triển, OTP chỉ được ghi
            log nội bộ để phục vụ test.
          </p>
        </section>

        <section className='space-y-3'>
          <h2 className='text-xl font-semibold'>Dữ liệu lưu trữ</h2>
          <p className='text-muted-foreground leading-7'>
            Thông tin phiên đăng nhập, tài khoản, xác minh OTP và dữ liệu nghiệp vụ HRM được lưu
            trong PostgreSQL của hệ thống. Quyền truy cập được kiểm soát theo vai trò nội bộ.
          </p>
        </section>

        <section className='space-y-3'>
          <h2 className='text-xl font-semibold'>Liên hệ</h2>
          <p className='text-muted-foreground leading-7'>
            Nếu cần cập nhật hoặc xoá dữ liệu cá nhân, vui lòng liên hệ quản trị viên hệ thống của
            công ty.
          </p>
          <Link href='/' className='text-primary underline underline-offset-4'>
            Quay lại trang chủ
          </Link>
        </section>
      </div>
    </main>
  );
}
