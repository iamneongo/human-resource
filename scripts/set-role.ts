/* eslint-disable no-console */
/**
 * Gán role HRM cho một user Better Auth theo email.
 *
 * Dùng sau khi người dùng đăng nhập OTP lần đầu:
 *   bun run scripts/set-role.ts hr@congty.com admin
 *
 * Roles hợp lệ: admin | hr | manager | employee
 */
import 'dotenv/config';
import { eq } from 'drizzle-orm';

import { db } from '../src/db';
import { user } from '../src/db/schema';

const [, , email, role = 'admin'] = process.argv;

if (!email) {
  console.error('Usage: bun run scripts/set-role.ts <email> [role]');
  process.exit(1);
}

if (!['admin', 'hr', 'manager', 'employee'].includes(role)) {
  console.error(`Invalid role: ${role}`);
  process.exit(1);
}

const normalizedEmail = email.trim().toLowerCase();
const [matchedUser] = await db.select({ id: user.id }).from(user).where(eq(user.email, normalizedEmail)).limit(1);

if (!matchedUser) {
  console.error(`Không tìm thấy user với email ${normalizedEmail}. Hãy đăng nhập OTP trước.`);
  process.exit(1);
}

await db
  .update(user)
  .set({
    role,
    updatedAt: new Date()
  })
  .where(eq(user.id, matchedUser.id));

console.log(`Đã gán role "${role}" cho ${normalizedEmail}.`);
