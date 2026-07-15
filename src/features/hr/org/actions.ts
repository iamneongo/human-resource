'use server';

import { revalidatePath } from 'next/cache';
import { asc, count, eq } from 'drizzle-orm';

import { db } from '@/db';
import { costCenters, departments, employees, positions, user } from '@/db/schema';
import { requireRole } from '@/lib/rbac';

type Result = { ok: true } | { ok: false; error: string };

export type OrgNode = {
  id: string;
  code: string;
  name: string;
  type: string;
  headcount: number;
  children: OrgNode[];
};

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
  for (const item of counts) {
    if (item.departmentId) countMap.set(item.departmentId, Number(item.value));
  }

  const nodes = new Map<string, OrgNode>();
  for (const unit of units) {
    nodes.set(unit.id, {
      id: unit.id,
      code: unit.code,
      name: unit.name,
      type: unit.type,
      headcount: countMap.get(unit.id) ?? 0,
      children: []
    });
  }

  const roots: OrgNode[] = [];
  for (const unit of units) {
    const node = nodes.get(unit.id)!;
    const parent = unit.parentId ? nodes.get(unit.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  return roots;
}

export async function listDepartments() {
  await requireRole('manager');
  return db
    .select({
      id: departments.id,
      code: departments.code,
      name: departments.name,
      type: departments.type,
      parentId: departments.parentId,
      headcount: count(employees.id)
    })
    .from(departments)
    .leftJoin(employees, eq(employees.departmentId, departments.id))
    .groupBy(
      departments.id,
      departments.code,
      departments.name,
      departments.type,
      departments.parentId
    )
    .orderBy(asc(departments.code))
    .limit(200);
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi';
    if (message.includes('code')) return { ok: false, error: 'Mã phòng ban đã tồn tại.' };
    return { ok: false, error: message };
  }
}

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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi';
    if (message.includes('code')) return { ok: false, error: 'Mã chức vụ đã tồn tại.' };
    return { ok: false, error: message };
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
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Lỗi' };
  }
}

export async function deleteDepartment(id: string): Promise<Result> {
  try {
    await requireRole('admin');
  } catch {
    return { ok: false, error: 'Chỉ Admin được cấu hình cơ cấu tổ chức.' };
  }

  try {
    const [employeeRow] = await db
      .select({ id: employees.id })
      .from(employees)
      .where(eq(employees.departmentId, id))
      .limit(1);
    if (employeeRow) return { ok: false, error: 'Không thể xoá phòng ban đang có nhân viên.' };

    await db.delete(departments).where(eq(departments.id, id));
    revalidatePath('/dashboard/org');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Lỗi' };
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
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Lỗi' };
  }
}

export async function deletePosition(id: string): Promise<Result> {
  try {
    await requireRole('admin');
  } catch {
    return { ok: false, error: 'Chỉ Admin được cấu hình cơ cấu tổ chức.' };
  }

  try {
    const [employeeRow] = await db
      .select({ id: employees.id })
      .from(employees)
      .where(eq(employees.positionId, id))
      .limit(1);
    if (employeeRow) return { ok: false, error: 'Không thể xoá chức vụ đang có nhân viên.' };

    await db.delete(positions).where(eq(positions.id, id));
    revalidatePath('/dashboard/org');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Lỗi' };
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
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Lỗi' };
  }
}

export async function listEmployeeLinks() {
  await requireRole('admin');
  return db
    .select({
      id: employees.id,
      employeeCode: employees.employeeCode,
      fullName: employees.fullName,
      email: employees.email,
      authUserId: employees.authUserId
    })
    .from(employees)
    .orderBy(asc(employees.employeeCode))
    .limit(500);
}

export async function linkEmployeeAccount(v: Record<string, string>): Promise<Result> {
  try {
    await requireRole('admin');
  } catch {
    return { ok: false, error: 'Chỉ Admin được liên kết tài khoản.' };
  }

  const employeeId = v.employeeId;
  const accountEmail = v.accountEmail?.trim().toLowerCase();

  if (!employeeId || !accountEmail) {
    return { ok: false, error: 'Thiếu nhân viên hoặc email tài khoản.' };
  }

  try {
    const [matchedUser] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, accountEmail))
      .limit(1);

    if (!matchedUser) {
      return {
        ok: false,
        error: `Không tìm thấy tài khoản Better Auth với email ${accountEmail}. Người dùng cần đăng nhập bằng OTP trước.`
      };
    }

    await db
      .update(employees)
      .set({ authUserId: matchedUser.id })
      .where(eq(employees.id, employeeId));

    revalidatePath('/dashboard/org');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Lỗi liên kết tài khoản' };
  }
}
