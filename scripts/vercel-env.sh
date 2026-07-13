#!/usr/bin/env bash
# Nạp biến môi trường lên Vercel cho cả 3 môi trường (production, preview, development).
# Chạy SAU KHI: vercel login && vercel link
# Đọc giá trị từ file .env ở gốc dự án.
set -euo pipefail
cd "$(dirname "$0")/.."

VARS=(
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  CLERK_SECRET_KEY
  NEXT_PUBLIC_CLERK_SIGN_IN_URL
  NEXT_PUBLIC_CLERK_SIGN_UP_URL
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL
  NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL
  DATABASE_URL
  NEXT_PUBLIC_SENTRY_DISABLED
)

get() { grep -E "^$1=" .env | head -1 | cut -d= -f2- | sed 's/^"//; s/"$//'; }

for name in "${VARS[@]}"; do
  val="$(get "$name")"
  if [ -z "$val" ]; then echo "⚠ bỏ qua $name (trống)"; continue; fi
  for env in production preview development; do
    printf '%s' "$val" | vercel env add "$name" "$env" --force >/dev/null 2>&1 \
      && echo "✓ $name → $env" || echo "✗ $name → $env (có thể đã tồn tại)"
  done
done
echo "Xong. Chạy: vercel --prod"
