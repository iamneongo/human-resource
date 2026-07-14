# Vercel Deploy Checklist

Tai lieu nay dung de dam bao app build va chay on dinh tren Vercel.

## 1. Muc tieu

- Build production thanh cong tren local truoc khi deploy.
- Start production thanh cong tu output cua `next build`.
- Moi bien moi truong quan trong deu duoc khai bao day du tren Vercel.
- Tranh lap lai cac loi da gap voi `DATABASE_URL`, `bun.lock`, va Clerk localization.

## 2. Bien moi truong bat buoc

Can set day du cho ca `Preview` va `Production` tren Vercel:

```env
DATABASE_URL=

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/auth/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard/overview
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard/overview
```

Ghi chu:

- App nay can `DATABASE_URL` ngay trong luc `next build`, khong chi luc runtime.
- Neu thieu `DATABASE_URL`, build co the fail ngay tai buoc prerender hoac page data collection.
- Cac bien `NEXT_PUBLIC_*` phai duoc set dung tren Vercel vi chung duoc expose ra client bundle.

## 3. Bien moi truong tuy chon

Neu dang dung Sentry thi set them:

```env
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_SENTRY_ORG=
NEXT_PUBLIC_SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=
NEXT_PUBLIC_SENTRY_DISABLED=false
```

Neu chua dung Sentry, co the dat:

```env
NEXT_PUBLIC_SENTRY_DISABLED=true
```

## 4. Preflight truoc khi push

Chay dung thu tu nay tren local:

```bash
bun install
bun run build
npx next start -p 3020
```

Sau khi `next start` len thanh cong, kiem tra toi thieu:

```bash
http://127.0.0.1:3020/
http://127.0.0.1:3020/about
http://127.0.0.1:3020/auth/sign-in
```

Neu ca 3 route deu tra `200`, co the xem nhu output production co ban da on.

## 5. Cac loi build da gap va cach tranh

### Loi 1: Thieu `DATABASE_URL`

Trieu chung:

- `bun run build` fail.
- Loi xuat hien trong qua trinh collect page data hoac khoi tao DB layer.

Cach tranh:

- Luon set `DATABASE_URL` trong local `.env`.
- Luon set `DATABASE_URL` cho ca Preview va Production tren Vercel.

### Loi 2: `bun.lock` khong dong bo voi `package.json`

Trieu chung:

- CI hoac remote install fail.
- Dependency version tren moi truong build khac local.

Cach tranh:

- Moi khi sua dependency, chay lai `bun install`.
- Commit ca `package.json` va `bun.lock` trong cung mot commit.

### Loi 3: Clerk localization mismatch

Trieu chung:

- TypeScript fail trong luc build.
- Thuong xuat hien khi version `@clerk/localizations` khong tuong thich voi `@clerk/nextjs`.

Cach tranh:

- Khong nang cap rieng `@clerk/localizations` neu chua kiem tra compatibility.
- Sau moi lan cap nhat Clerk, chay lai `bun run build` truoc khi push.

## 6. Cau hinh Vercel khuyen nghi

- Framework Preset: `Next.js`
- Install Command: `bun install`
- Build Command: `bun run build`
- Output Command: de mac dinh cua Next.js

Khong can them buoc build Docker neu muc tieu la deploy len Vercel.

## 7. Quy trinh deploy de xuat

1. Cap nhat code va dependency.
2. Chay `bun install`.
3. Chay `bun run build`.
4. Chay `npx next start -p 3020` de verify runtime production.
5. Kiem tra env tren Vercel.
6. Push len GitHub.
7. Deploy tren Vercel.
8. Kiem tra lai `Production` va `Preview` sau deploy.

## 8. Checklist nhanh

- [ ] `bun install` chay xong khong loi
- [ ] `bun.lock` da duoc cap nhat neu co sua dependency
- [ ] `bun run build` pass
- [ ] `npx next start -p 3020` pass
- [ ] Trang `/`, `/about`, `/auth/sign-in` tra `200`
- [ ] `DATABASE_URL` da set tren Vercel
- [ ] Clerk keys da set tren Vercel
- [ ] Neu dung Sentry, cac key da set dung moi truong

