# human-resource — Hệ thống Quản lý Nhân sự (HRM)

Hệ thống HRM đầy đủ 5 phân hệ (HR-01…HR-05) xây trên **Next.js 16 (App Router) · React 19 · Clerk · Drizzle ORM · PostgreSQL (Neon) · shadcn/ui**, chạy bằng **bun**.

## Phân hệ

| Mã | Phân hệ | Chức năng chính |
|----|---------|-----------------|
| HR-01 | Quản lý Nhân sự | Hồ sơ, hợp đồng (cảnh báo hết hạn), điều chuyển, lương & phúc lợi, tài sản, khen thưởng/kỷ luật, offboarding, báo cáo |
| HR-02 | Chấm công | Ca làm việc, thiết bị, timesheet, OT (tự tính hệ số), nghỉ phép (duyệt + trừ số dư), số dư phép theo thâm niên, xử lý bất thường |
| HR-03 | Tính lương | Thang bảng lương, công thức, BHXH & thuế TNCN lũy tiến, biến động lương, **engine chốt lương**, phiếu lương, báo cáo |
| HR-04 | Hiệu suất | JD, khung năng lực, KPI/OKR, chu kỳ đánh giá 360°, báo cáo bell-curve |
| HR-05 | Đào tạo (L&D) | TNA, kế hoạch, khóa học, ghi danh, theo dõi học tập, ngân sách, lộ trình nghề nghiệp |

## Phân quyền (RBAC)

Một role lưu trong Clerk `publicMetadata.role`, enforce server-side (`src/lib/rbac.ts`):

- **admin** — toàn quyền + cấu hình cơ cấu tổ chức, duyệt bảng lương
- **hr** — nghiệp vụ nhân sự/lương/chấm công toàn công ty
- **manager** — duyệt phép/OT, xem dữ liệu
- **employee** — self-service (tự đăng ký OT/nghỉ phép, xem của bản thân)

## Cài đặt & chạy

```bash
# 1. Cài dependencies
bun install

# 2. Tạo file .env từ mẫu và điền khóa Clerk + DATABASE_URL
cp .env.example .env

# 3. Tạo schema trên database
bun run db:push

# 4. (Tuỳ chọn) Seed dữ liệu mẫu (3 phòng ban + 3 nhân viên)
bun run db:seed

# 5. Chạy
bun run dev            # http://localhost:3000
```

## Khởi tạo tài khoản đầu tiên

1. Truy cập app → **Đăng ký** tài khoản qua giao diện.
2. Cấp quyền admin:
   ```bash
   bun run scripts/set-role.ts <email-của-bạn> admin
   ```
3. Đăng nhập lại → menu 5 phân hệ hiển thị đầy đủ.

### Bật self-service cho nhân viên
Vào **Hệ thống → Cơ cấu tổ chức → Liên kết tài khoản**: gán email tài khoản đăng nhập cho hồ sơ nhân viên. Sau đó nhân viên (role `employee`) mới tự đăng ký OT/nghỉ phép và xem dữ liệu của mình.

## Luồng tính lương (demo)

1. **HR-03 → BHXH & Thuế** → thêm 1 cấu hình (mặc định chuẩn VN).
2. **HR-03 → Chốt bảng lương** → tạo kỳ `YYYY-MM` → **Tính & chốt** (engine sinh phiếu lương).
3. **Admin** duyệt bảng lương → xem **Phiếu lương** / **Báo cáo lương**.

## Scripts

| Lệnh | Mô tả |
|------|-------|
| `bun run dev` | Chạy dev server |
| `bun run build` | Build production |
| `bun run db:generate` | Sinh migration từ schema |
| `bun run db:push` | Đẩy schema lên DB |
| `bun run db:seed` | Seed dữ liệu mẫu |
| `bun run scripts/set-role.ts <email> <role>` | Gán role cho tài khoản |

## Kiến trúc

- `src/db/schema/` — Drizzle schema (1 file/phân hệ + `_shared`)
- `src/features/hr/` — logic từng phân hệ (server actions + components)
- `src/features/hr/common/` — primitive tái dùng: `EntityFormDialog`, `SimpleTable`, `ApprovalActions`, `lookups`
- `src/features/hr/payroll/calc.ts` — engine tính lương thuần (thuế lũy tiến + BHXH có trần)
- `src/lib/rbac.ts` — phân quyền
