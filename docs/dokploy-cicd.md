# GitHub Actions + Dokploy

Pipeline nay chay theo dung thu tu:

1. GitHub Actions checkout code
2. `bun install --frozen-lockfile`
3. `bun run build` tren GitHub
4. Neu build xanh, build Docker image
5. Push image len `ghcr.io/<github-owner>/<github-repo>`
6. Goi Dokploy API de redeploy application hien co

Dokploy chi keo image moi sau khi buoc build tren GitHub da thanh cong.

## Canonical production URL

Production canonical domain duoc chot la:

```env
BETTER_AUTH_URL=https://human-resource.apps.neooi.com
NEXT_PUBLIC_APP_URL=https://human-resource.apps.neooi.com
```

`https://apps.neooi.com` chi duoc giu trong Better Auth `trustedOrigins` de compatibility tam thoi. Khong dung domain nay lam `baseURL`, metadata URL, auth invite link, hay runtime production default.

## 1. Chuan bi tren Dokploy

Tao hoac chinh application theo kieu:

- `Source Type`: `Docker`
- `Docker Image`: `ghcr.io/<github-owner>/<github-repo>:latest`
- `Port`: `3000`

Application phai ton tai san tren Dokploy. Workflow nay khong tu tao app moi.

Neu image la private tren GHCR, can dam bao Dokploy da co quyen pull.

## 2. GitHub Actions workflow

Workflow nam tai:

- [deploy.yml](/C:/CongViec/nhansu/.github/workflows/deploy.yml)

Workflow tu chay khi push vao `main`, va co the chay tay bang `workflow_dispatch`.

## 3. Secrets can them trong GitHub

Vao `Settings -> Secrets and variables -> Actions` va tao cac secret sau.

### Bat buoc de build tren GitHub

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `NEXT_PUBLIC_APP_URL`

### Nen them de build giong production

- `NEXT_PUBLIC_SENTRY_DISABLED`
- `NEXT_PUBLIC_SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_ORG`
- `NEXT_PUBLIC_SENTRY_PROJECT`
- `SENTRY_AUTH_TOKEN`
- `AUTH_FROM_EMAIL`
- `RESEND_API_KEY`

### Bat buoc de trigger Dokploy

- `DOKPLOY_URL`
- `DOKPLOY_API_KEY`
- `DOKPLOY_APPLICATION_ID`

## 4. Runtime env phai dat o Dokploy

Nhung bien nay khong duoc chi ton tai o GitHub. Chung cung phai co o Dokploy runtime:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL=https://human-resource.apps.neooi.com`
- `NEXT_PUBLIC_APP_URL=https://human-resource.apps.neooi.com`
- `AUTH_FROM_EMAIL`
- `RESEND_API_KEY`
- `NEXT_PUBLIC_SENTRY_DISABLED`
- cac bien Sentry khac neu dang dung

Ly do:

- GitHub can env de `next build`
- Dokploy can env de container chay that sau khi pull image

## 5. Luong deploy thuc te

Khi push len `main`:

1. Job `verify` chay `bun run build`
2. Neu fail, pipeline dung ngay, Dokploy khong bi goi
3. Neu pass, job `docker` build/push image len GHCR
4. Khi image da co tren GHCR, job `deploy` goi `POST /api/application.redeploy`
5. Dokploy pull tag `latest` va restart app

## 6. Checklist tranh lap lai loi 403 OTP

- [ ] GitHub Actions secrets dung canonical production URL:
  - `BETTER_AUTH_URL=https://human-resource.apps.neooi.com`
  - `NEXT_PUBLIC_APP_URL=https://human-resource.apps.neooi.com`
- [ ] Dokploy runtime env dung y chang 2 gia tri tren
- [ ] Better Auth `trustedOrigins` co:
  - `https://human-resource.apps.neooi.com`
  - `https://apps.neooi.com`
  - cac localhost/dev origins dang dung
- [ ] Khong con bat ky vi du production nao dung `https://apps.neooi.com` lam canonical URL
- [ ] Neu doi domain Dokploy, phai doi dong thoi code + GitHub secrets + Dokploy runtime env
