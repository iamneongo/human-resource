# human-resource - He thong Quan ly Nhan su (HRM)

Ung dung HRM cho nhan su, cham cong va tien luong xay tren **Next.js 16 · React 19 · Better Auth · Drizzle ORM · PostgreSQL · shadcn/ui**, chay bang **bun**.

## Cai dat

```bash
bun install
cp env.example.txt .env
bun run db:migrate
bun run dev
```

Moi truong toi thieu cho local:

```env
BETTER_AUTH_SECRET=change-me
BETTER_AUTH_URL="http://localhost:3000"
AUTH_FROM_EMAIL="HRM <onboarding@resend.dev>"
RESEND_API_KEY=
DATABASE_URL="postgresql://user:password@host/db?sslmode=require"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

`RESEND_API_KEY` khong con la bat buoc cho dang nhap. Bien nay chi can neu ban van muon gui email thong bao hoac cap tai khoan qua email.

## Canonical production URL

Production canonical domain duoc chot la:

```env
BETTER_AUTH_URL="https://human-resource.apps.neooi.com"
NEXT_PUBLIC_APP_URL="https://human-resource.apps.neooi.com"
```

`https://apps.neooi.com` chi con la trusted origin tam thoi cho Better Auth compatibility, khong duoc dung lam canonical URL cho metadata, auth links, invite links, hay runtime production.

## Dang nhap va phan quyen

- Dang nhap dung **tai khoan + mat khau** qua Better Auth.
- Role he thong luu truc tiep trong bang `user.role`.
- Tai khoan demo mac dinh:
  - `hrdemo`
  - `1234`
- Tai khoan ngan nhu `hrdemo` duoc map noi bo sang email hop le (`hrdemo@local.test`) de Better Auth xu ly, nhung nguoi dung van chi can nho ten dang nhap ngan.

Gan role cho tai khoan:

```bash
bun run scripts/set-role.ts hr@congty.com admin
```

Tao lai tai khoan demo:

```bash
bun run scripts/bootstrap-demo-account.ts
```

Roles hop le:

- `admin`
- `hr`
- `manager`
- `employee`

## Migration

Mot so migration dang su dung:

- [0004_mushy_sebastian_shaw.sql](/C:/CongViec/nhansu/src/db/migrations/0004_mushy_sebastian_shaw.sql)
- [0007_nimble_payroll_public_access.sql](/C:/CongViec/nhansu/src/db/migrations/0007_nimble_payroll_public_access.sql)

Noi dung chinh:

- Tao cac bang auth cho Better Auth
- Them cot lien ket auth cho nhan su
- Bo sung ma xem phieu luong cong khai cho payslip da phat hanh

## Scripts

```bash
bun run dev
bun run build
bun run db:generate
bun run db:migrate
bun run db:push
bun run db:seed
bun run scripts/bootstrap-demo-account.ts
```

## Deploy notes

- GitHub Actions build phai dung cung canonical URL production:
  - `BETTER_AUTH_URL=https://human-resource.apps.neooi.com`
  - `NEXT_PUBLIC_APP_URL=https://human-resource.apps.neooi.com`
- Dokploy runtime env cung phai dung dung 2 gia tri tren.
- Neu doi domain production, phai doi dong thoi:
  - `BETTER_AUTH_URL`
  - `NEXT_PUBLIC_APP_URL`
  - Better Auth `trustedOrigins`
