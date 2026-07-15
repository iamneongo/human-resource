import { auth, currentUser } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { employees } from '@/db/schema';

/**
 * HRM role model (single role per user, stored in Clerk publicMetadata.role).
 *
 * Hierarchy (high -> low privilege):
 *   admin   - full system access, cấu hình hệ thống
 *   hr      - nghiệp vụ nhân sự, lương, chấm công toàn công ty
 *   manager - duyệt phép/OT, xem nhân sự phòng ban mình
 *   employee- self-service (hồ sơ, phiếu lương, đăng ký phép của bản thân)
 */
export const HRM_ROLES = ['admin', 'hr', 'manager', 'employee'] as const;
export type HrmRole = (typeof HRM_ROLES)[number];

const ROLE_RANK: Record<HrmRole, number> = {
  admin: 4,
  hr: 3,
  manager: 2,
  employee: 1
};

/** Read the current user's HRM role from Clerk session claims / metadata. */
export async function getCurrentRole(): Promise<HrmRole | null> {
  const { orgId, sessionClaims } = await auth();
  if (orgId) return 'admin';
  const claimRole = (sessionClaims?.metadata as { role?: string } | undefined)?.role;
  if (claimRole && isHrmRole(claimRole)) return claimRole;

  // Fallback: publicMetadata (when session token isn't customized yet).
  const user = await currentUser();
  const metaRole = user?.publicMetadata?.role;
  if (typeof metaRole === 'string' && isHrmRole(metaRole)) return metaRole;

  return null;
}

export function isHrmRole(value: string): value is HrmRole {
  return (HRM_ROLES as readonly string[]).includes(value);
}

/**
 * Map the current Clerk user to an employee row (via employees.clerkUserId).
 * Returns the employee id, or null if the account isn't linked to an employee.
 */
export async function getCurrentEmployeeId(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return null;
  const [row] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.clerkUserId, userId))
    .limit(1);
  return row?.id ?? null;
}

/** True if `role` meets or exceeds `required` in the privilege hierarchy. */
export function roleAtLeast(role: HrmRole | null, required: HrmRole): boolean {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[required];
}

/** True if the current user's role is exactly one of `allowed`. */
export async function hasRole(...allowed: HrmRole[]): Promise<boolean> {
  const role = await getCurrentRole();
  return role !== null && allowed.includes(role);
}

/**
 * Enforce a minimum role in a Server Component / Server Action.
 * Throws if the requirement is not met (caller may catch to redirect).
 */
export async function requireRole(required: HrmRole): Promise<HrmRole> {
  const { orgId, userId } = await auth();
  if (!userId) throw new Error('UNAUTHENTICATED');
  if (orgId) return 'admin';
  const role = await getCurrentRole();
  if (!roleAtLeast(role, required)) throw new Error('FORBIDDEN');
  return role as HrmRole;
}
