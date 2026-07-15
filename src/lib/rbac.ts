import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { employees } from '@/db/schema';
import { getAuthSession } from '@/lib/auth';

export const HRM_ROLES = ['admin', 'hr', 'manager', 'employee'] as const;
export type HrmRole = (typeof HRM_ROLES)[number];

const ROLE_RANK: Record<HrmRole, number> = {
  admin: 4,
  hr: 3,
  manager: 2,
  employee: 1
};

export function isHrmRole(value: string): value is HrmRole {
  return (HRM_ROLES as readonly string[]).includes(value);
}

export async function getCurrentRole(): Promise<HrmRole | null> {
  const currentSession = await getAuthSession();
  const sessionRole = currentSession?.user?.role;
  if (typeof sessionRole === 'string' && isHrmRole(sessionRole)) {
    return sessionRole;
  }
  return null;
}

export async function getCurrentEmployeeId(): Promise<string | null> {
  const currentSession = await getAuthSession();
  const userId = currentSession?.user?.id;
  if (!userId) return null;

  const [row] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.authUserId, userId))
    .limit(1);

  return row?.id ?? null;
}

export function roleAtLeast(role: HrmRole | null, required: HrmRole): boolean {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[required];
}

export async function hasRole(...allowed: HrmRole[]): Promise<boolean> {
  const role = await getCurrentRole();
  return role !== null && allowed.includes(role);
}

export async function requireRole(required: HrmRole): Promise<HrmRole> {
  const currentSession = await getAuthSession();
  if (!currentSession?.user?.id) throw new Error('UNAUTHENTICATED');

  const role = await getCurrentRole();
  if (!roleAtLeast(role, required)) throw new Error('FORBIDDEN');
  return role as HrmRole;
}
