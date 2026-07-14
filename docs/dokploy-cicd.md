# GitHub Actions + Dokploy

Pipeline này build image trên GitHub, push lên `GHCR`, sau đó gọi Dokploy API để redeploy application hiện có.

## 1. Chuẩn bị trên Dokploy

Tạo hoặc chỉnh application theo kiểu:

- `Source Type`: `Docker`
- `Docker Image`: `ghcr.io/<github-owner>/<github-repo>:latest`
- `Port`: `3000`

Application phải tồn tại sẵn trên Dokploy. Pipeline này không tự tạo application mới.

## 2. Secrets cần thêm trong GitHub

Vào `Settings -> Secrets and variables -> Actions` và tạo các secret sau:

### Build args cho Next.js

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL`
- `NEXT_PUBLIC_SENTRY_DISABLED`

### Deploy sang Dokploy

- `DOKPLOY_URL`
  Ví dụ: `https://dokploy.example.com`
- `DOKPLOY_API_KEY`
  API key của Dokploy. Theo docs API của Dokploy, request dùng header `x-api-key`.
- `DOKPLOY_APPLICATION_ID`
  ID application cần redeploy.

## 3. Cách lấy `applicationId`

Nếu có quyền truy cập Dokploy UI/API, lấy từ:

- Dokploy UI
- Swagger/API response
- Hoặc dùng MCP Dokploy để đọc application

## 4. Khi nào workflow chạy

- Tự động khi push vào branch `main`
- Có thể chạy tay qua `workflow_dispatch`

## 5. Luồng deploy

1. GitHub Actions checkout code
2. Build Docker image bằng `Dockerfile`
3. Push image lên `ghcr.io/<owner>/<repo>`
4. Gọi `POST /api/application.redeploy` trên Dokploy

## 6. Ghi chú vận hành

- App trên Dokploy nên dùng tag `latest` nếu muốn redeploy đơn giản như workflow hiện tại.
- Nếu muốn pin theo commit SHA, cần đổi chiến lược image tag trong Dokploy và workflow.
- Runtime env như `DATABASE_URL`, `CLERK_SECRET_KEY` nên tiếp tục quản lý trực tiếp trong Dokploy, không build vào image.
