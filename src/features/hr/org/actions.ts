'use server';

import { revalidatePath } from 'next/cache';
import { asc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { costCenters, departments, employees, positions } from '@/db/schema';
import { requireRole } from '@/lib/rbac';

type Result = { ok: true } | { ok: false; error: string };

/* ------------------------- Departments ------------------------- */
export async function listDepartments() {
  await requireRole('manager');
  return db.select().from(departments).orderBy(asc(departments.code)).limit(200);
}

export async function createDepartment(v: Record<string, string>): Promise<Result> {
  try {
    await requireRole('admin');
  } catch {
    return { ok: false, error: 'Chỉ Admin được cấu hình cơ cấu tổ chức.' };
  }
  if (!v.code || !v.name) return { ok: false, error: 'Thiếu mã hoặc tên.' };
  try {
    await db.insert(departments).values({ code: v.code, name: v.name });
    revalidatePath('/dashboard/org');
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Lỗi';
    if (msg.includes('code')) return { ok: false, error: 'Mã phòng ban đã tồn tại.' };
    return { ok: false, error: msg };
  }
}

/* -------------------------- Positions -------------------------- */
export async function listPositions() {
  await requireRole('manager');
  return db
    .select({
      id: positions.id,
      code: positions.code,
      title: positions.title,
      departmentName: departments.name
    })
    .from(positions)
    .leftJoin(departments, eq(positions.departmentId, departments.id))
    .orderBy(asc(positions.code))
    .limit(300);
}

export async function createPosition(v: Record<string, string>): Promise<Result> {
  try {
    await requireRole('admin');
  } catch {
    return { ok: false, error: 'Chỉ Admin được cấu hình cơ cấu tổ chức.' };
  }
  if (!v.code || !v.title) return { ok: false, error: 'Thiếu mã hoặc tên chức vụ.' };
  try {
    await db.insert(positions).values({
      code: v.code,
      title: v.title,
      departmentId: v.departmentId || null
    });
    revalidatePath('/dashboard/org');
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Lỗi';
    if (msg.includes('code')) return { ok: false, error: 'Mã chức vụ đã tồn tại.' };
    return { ok: false, error: msg };
  }
}

/* -------------------- Cost centers (optional) ------------------ */
export async function createCostCenter(v: Record<string, string>): Promise<Result> {
  try {
    await requireRole('admin');
  } catch {
    return { ok: false, error: 'Chỉ Admin được cấu hình.' };
  }
  if (!v.code || !v.name) return { ok: false, error: 'Thiếu mã hoặc tên.' };
  try {
    await db.insert(costCenters).values({ code: v.code, name: v.name });
    revalidatePath('/dashboard/org');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi' };
  }
}

/* ------------- Link Clerk account <-> employee ---------------- */
export async function listEmployeeLinks() {
  await requireRole('admin');
  return db
    .select({
      id: employees.id,
      employeeCode: employees.employeeCode,
      fullName: employees.fullName,
      email: employees.email,
      clerkUserId: employees.clerkUserId
    })
    .from(employees)
    .orderBy(asc(employees.employeeCode))
    .limit(500);
}

/**
 * Liên kết tài khoản đăng nhập (Clerk) với hồ sơ nhân viên qua email tài khoản.
 * Cho phép nhân viên tự phục vụ (OT / nghỉ phép / xem phiếu lương).
 */
export async function linkEmployeeAccount(v: Record<string, string>): Promise<Result> {
  try {
    await requireRole('admin');
  } catch {
    return { ok: false, error: 'Chỉ Admin được liên kết tài khoản.' };
  }
  const employeeId = v.employeeId;
  const accountEmail = v.accountEmail?.trim();
  if (!employeeId || !accountEmail)
    return { ok: false, error: 'Thiếu nhân viên hoặc email tài khoản.' };

  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) return { ok: false, error: 'Thiếu CLERK_SECRET_KEY.' };

  try {
    const res = await fetch(
      `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(accountEmail)}`,
      { headers: { Authorization: `Bearer ${secret}` } }
    );
    const users = (await res.json()) as Array<{ id: string }>;
    if (!Array.isArray(users) || users.length === 0)
      return {
        ok: false,
        error: `Không tìm thấy tài khoản Clerk với email ${accountEmail}. Người dùng cần đăng ký trước.`
      };

    await db
      .update(employees)
      .set({ clerkUserId: users[0].id })
      .where(eq(employees.id, employeeId));
    revalidatePath('/dashboard/org');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi gọi Clerk API' };
  }
}
