# GitHub Actions + Dokploy

Pipeline này chạy theo đúng thứ tự:

1. GitHub Actions checkout code
2. `bun install --frozen-lockfile`
3. `bun run build` trên GitHub
4. Nếu build xanh, build Docker image
5. Push image lên `ghcr.io/<github-owner>/<github-repo>`
6. Gọi Dokploy API để redeploy application hiện có

Dokploy chỉ kéo image mới sau khi bước build trên GitHub đã thành công.

## 1. Chuẩn bị trên Dokploy

Tạo hoặc chỉnh application theo kiểu:

- `Source Type`: `Docker`
- `Docker Image`: `ghcr.io/<github-owner>/<github-repo>:latest`
- `Port`: `3000`

Application phải tồn tại sẵn trên Dokploy. Workflow này không tự tạo app mới.

Nếu image là private trên GHCR, cần đảm bảo Dokploy đã có quyền pull:

- dùng GitHub personal access token hoặc registry credential trong Dokploy
- account/token đó phải có quyền đọc package của repo này

## 2. GitHub Actions workflow

Workflow nằm tại:

- [deploy.yml](/C:/CongViec/nhansu/.github/workflows/deploy.yml)

Workflow chỉ tự chạy khi push vào `main`.

Ngoài ra có thể chạy tay bằng `workflow_dispatch`.

## 3. Secrets cần thêm trong GitHub

Vào `Settings -> Secrets and variables -> Actions` và tạo các secret sau.

### Bắt buộc để build trên GitHub

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `NEXT_PUBLIC_APP_URL`

### Khuyên thêm để build giống production

- `NEXT_PUBLIC_SENTRY_DISABLED`
- `NEXT_PUBLIC_SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_ORG`
- `NEXT_PUBLIC_SENTRY_PROJECT`
- `SENTRY_AUTH_TOKEN`
- `AUTH_FROM_EMAIL`
- `RESEND_API_KEY`

### Bắt buộc để trigger Dokploy

- `DOKPLOY_URL`
  Ví dụ: `https://dokploy.neooi.com`
- `DOKPLOY_API_KEY`
- `DOKPLOY_APPLICATION_ID`

## 4. Runtime env nên đặt ở Dokploy

Các biến dưới đây không nên chỉ tồn tại ở GitHub. Chúng cũng phải có ở Dokploy runtime:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `NEXT_PUBLIC_APP_URL`
- `AUTH_FROM_EMAIL`
- `RESEND_API_KEY`
- `NEXT_PUBLIC_SENTRY_DISABLED`
- các biến Sentry khác nếu đang dùng

Lý do:

- GitHub cần env để `next build`
- Dokploy cần env để container chạy thật sau khi pull image

## 5. Cách lấy `applicationId`

Có thể lấy từ:

- Dokploy UI
- Dokploy API / Swagger
- hoặc MCP Dokploy nếu đang kết nối được

## 6. Luồng deploy thực tế

Khi push lên `main`:

1. Job `verify` chạy `bun run build`
2. Nếu fail, pipeline dừng luôn, Dokploy không bị gọi
3. Nếu pass, job `docker` build/push image lên GHCR
4. Khi image đã có trên GHCR, job `deploy` gọi `POST /api/application.redeploy`
5. Dokploy pull tag `latest` và restart app

## 7. Ghi chú vận hành

- App trên Dokploy nên dùng tag `latest` nếu muốn redeploy đơn giản theo workflow hiện tại.
- Nếu muốn pin theo commit SHA, cần đổi cả image tag trên Dokploy và cách Dokploy nhận version.
- Nếu GitHub build xanh nhưng Dokploy vẫn fail, thường nguyên nhân là:
  - thiếu runtime env trên Dokploy
  - Dokploy không pull được GHCR private image
  - `DOKPLOY_APPLICATION_ID` sai
  - app chưa map domain / port đúng

## 8. Checklist cấu hình nhanh

- [ ] Push code lên branch `main`
- [ ] Repo đã bật GitHub Actions
- [ ] GHCR package có thể được tạo từ workflow
- [ ] GitHub Secrets đã điền đủ
- [ ] Dokploy app đang trỏ tới `ghcr.io/<owner>/<repo>:latest`
- [ ] Dokploy có quyền pull private image
- [ ] Dokploy runtime env đã set đủ
- [ ] `DOKPLOY_APPLICATION_ID` đúng app hiện tại
