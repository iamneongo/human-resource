'use server';

import { revalidatePath } from 'next/cache';
import { asc, count, eq } from 'drizzle-orm';

import { db } from '@/db';
import { costCenters, departments, employees, positions } from '@/db/schema';
import { requireRole } from '@/lib/rbac';

type Result = { ok: true } | { ok: false; error: string };

/* ------------------------- Org chart (tree) ------------------------- */
export type OrgNode = {
  id: string;
  code: string;
  name: string;
  type: string;
  headcount: number;
  children: OrgNode[];
};

/**
 * Cây cơ cấu tổ chức dựng từ `departments.parentId`, kèm số nhân sự trực thuộc
 * từng đơn vị (không cộng dồn cấp con).
 */
export async function getOrgTree(): Promise<OrgNode[]> {
  await requireRole('manager');

  const [units, counts] = await Promise.all([
    db
      .select({
        id: departments.id,
        code: departments.code,
        name: departments.name,
        type: departments.type,
        parentId: departments.parentId
      })
      .from(departments)
      .orderBy(asc(departments.code))
      .limit(1000),
    db
      .select({ departmentId: employees.departmentId, value: count() })
      .from(employees)
      .groupBy(employees.departmentId)
  ]);

  const countMap = new Map<string, number>();
  for (const c of counts) {
    if (c.departmentId) countMap.set(c.departmentId, Number(c.value));
  }

  const nodes = new Map<string, OrgNode>();
  for (const u of units) {
    nodes.set(u.id, {
      id: u.id,
      code: u.code,
      name: u.name,
      type: u.type,
      headcount: countMap.get(u.id) ?? 0,
      children: []
    });
  }

  const roots: OrgNode[] = [];
  for (const u of units) {
    const node = nodes.get(u.id)!;
    const parent = u.parentId ? nodes.get(u.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  return roots;
}

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
      departmentId: positions.departmentId,
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

export async function updateDepartment(id: string, v: Record<string, string>): Promise<Result> {
  try {
    await requireRole('admin');
  } catch {
    return { ok: false, error: 'Chỉ Admin được cấu hình cơ cấu tổ chức.' };
  }
  try {
    await db
      .update(departments)
      .set({ code: v.code || undefined, name: v.name || undefined })
      .where(eq(departments.id, id));
    revalidatePath('/dashboard/org');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi' };
  }
}

export async function deleteDepartment(id: string): Promise<Result> {
  try {
    await requireRole('admin');
  } catch {
    return { ok: false, error: 'Chỉ Admin được cấu hình cơ cấu tổ chức.' };
  }
  try {
    const [emp] = await db
      .select({ id: employees.id })
      .from(employees)
      .where(eq(employees.departmentId, id))
      .limit(1);
    if (emp) return { ok: false, error: 'Không thể xoá phòng ban đang có nhân viên.' };
    await db.delete(departments).where(eq(departments.id, id));
    revalidatePath('/dashboard/org');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi' };
  }
}

export async function updatePosition(id: string, v: Record<string, string>): Promise<Result> {
  try {
    await requireRole('admin');
  } catch {
    return { ok: false, error: 'Chỉ Admin được cấu hình cơ cấu tổ chức.' };
  }
  try {
    await db
      .update(positions)
      .set({
        code: v.code || undefined,
        title: v.title || undefined,
        departmentId: v.departmentId || null
      })
      .where(eq(positions.id, id));
    revalidatePath('/dashboard/org');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi' };
  }
}

export async function deletePosition(id: string): Promise<Result> {
  try {
    await requireRole('admin');
  } catch {
    return { ok: false, error: 'Chỉ Admin được cấu hình cơ cấu tổ chức.' };
  }
  try {
    const [emp] = await db
      .select({ id: employees.id })
      .from(employees)
      .where(eq(employees.positionId, id))
      .limit(1);
    if (emp) return { ok: false, error: 'Không thể xoá chức vụ đang có nhân viên.' };
    await db.delete(positions).where(eq(positions.id, id));
    revalidatePath('/dashboard/org');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi' };
  }
}

export async function listEmployeesByDepartment(departmentId: string) {
  await requireRole('manager');
  return db
    .select({
      id: employees.id,
      employeeCode: employees.employeeCode,
      fullName: employees.fullName,
      email: employees.email,
      status: employees.status,
      positionTitle: positions.title
    })
    .from(employees)
    .leftJoin(positions, eq(employees.positionId, positions.id))
    .where(eq(employees.departmentId, departmentId))
    .orderBy(asc(employees.employeeCode));
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
