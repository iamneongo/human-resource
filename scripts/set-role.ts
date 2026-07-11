/* eslint-disable no-console */
/**
 * Gán role HRM cho một user Clerk theo email.
 *
 * Dùng sau khi đăng ký tài khoản lần đầu:
 *   bun run scripts/set-role.ts nttantts@gmail.com admin
 *
 * Roles hợp lệ: admin | hr | manager | employee
 */
import 'dotenv/config';

const [, , email, role = 'admin'] = process.argv;
const SECRET = process.env.CLERK_SECRET_KEY;

if (!email) {
  console.error('Usage: bun run scripts/set-role.ts <email> [role]');
  process.exit(1);
}
if (!SECRET) {
  console.error('Missing CLERK_SECRET_KEY');
  process.exit(1);
}
if (!['admin', 'hr', 'manager', 'employee'].includes(role)) {
  console.error(`Invalid role: ${role}`);
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${SECRET}`,
  'Content-Type': 'application/json'
};

const res = await fetch(
  `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}`,
  { headers }
);
const users = (await res.json()) as Array<{ id: string }>;
if (!Array.isArray(users) || users.length === 0) {
  console.error(`Không tìm thấy user với email ${email}. Hãy đăng ký trước.`);
  process.exit(1);
}

const userId = users[0].id;
const patch = await fetch(`https://api.clerk.com/v1/users/${userId}/metadata`, {
  method: 'PATCH',
  headers,
  body: JSON.stringify({ public_metadata: { role } })
});

if (!patch.ok) {
  console.error('Cập nhật thất bại:', await patch.text());
  process.exit(1);
}

console.log(`✓ Đã gán role "${role}" cho ${email} (${userId}).`);
