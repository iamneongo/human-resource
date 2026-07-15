/* eslint-disable no-console */
/**
 * Gan role HRM cho mot user Better Auth theo email.
 *
 * Su dung:
 *   bun run scripts/set-role.ts hr@congty.com admin
 *
 * Roles hop le: admin | hr | manager | employee
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
const [matchedUser] = await db
  .select({ id: user.id })
  .from(user)
  .where(eq(user.email, normalizedEmail))
  .limit(1);

if (!matchedUser) {
  console.error(`Khong tim thay user voi email ${normalizedEmail}.`);
  process.exit(1);
}

await db
  .update(user)
  .set({
    role,
    updatedAt: new Date()
  })
  .where(eq(user.id, matchedUser.id));

console.log(`Da gan role "${role}" cho ${normalizedEmail}.`);
