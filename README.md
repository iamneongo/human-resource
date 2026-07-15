# human-resource - Hệ thống Quản lý Nhân sự (HRM)

Hệ thống HRM cho nhân sự, chấm công và tiền lương xây trên **Next.js 16 · React 19 · Better Auth · Resend · Drizzle ORM · PostgreSQL · shadcn/ui**, chạy bằng **bun**.

## Cài đặt

```bash
bun install
cp .env.example .env
bun run db:migrate
bun run dev
```

Các biến môi trường tối thiểu:

```env
BETTER_AUTH_SECRET=change-me
BETTER_AUTH_URL="http://localhost:3000"
AUTH_FROM_EMAIL="HRM <onboarding@resend.dev>"
RESEND_API_KEY=
DATABASE_URL="postgresql://user:password@host/db?sslmode=require"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Nếu chưa cấu hình `RESEND_API_KEY`, mã OTP sẽ được log ra console để test local.

## Đăng nhập và phân quyền

- Đăng nhập dùng **email OTP** qua Better Auth.
- Lần đăng nhập đầu tiên sẽ tự tạo tài khoản nội bộ.
- Role hệ thống lưu trực tiếp trong bảng `user.role`.

Gán role cho tài khoản:

```bash
bun run scripts/set-role.ts hr@congty.com admin
```

Roles hợp lệ:

- `admin`
- `hr`
- `manager`
- `employee`

## Migration đã thêm

Migration mới: [src/db/migrations/0004_mushy_sebastian_shaw.sql](/C:/CongViec/nhansu/src/db/migrations/0004_mushy_sebastian_shaw.sql)

Nội dung chính:

- Tạo bảng `user`, `session`, `account`, `verification` cho Better Auth
- Thêm cột `employees.auth_user_id`
- Giữ `employees.clerk_user_id` ở trạng thái legacy để tránh mất dữ liệu cũ

## Scripts

```bash
bun run dev
bun run build
bun run db:generate
bun run db:migrate
bun run db:push
bun run db:seed
```

## Ghi chú

- Route `/dashboard/workspaces/team` hiện đã tách khỏi embedded UI của Clerk và đang chạy theo mô hình workspace nội bộ.
- Billing theo organization của Clerk đã được gỡ; nếu cần thu phí theo workspace, nên nối cổng thanh toán riêng ở bước tiếp theo.
