'use server';

import { revalidatePath } from 'next/cache';
import { desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { contracts, employees } from '@/db/schema';
import { requireRole } from '@/lib/rbac';

type Result = { ok: true } | { ok: false; error: string };

export async function listContracts() {
  await requireRole('manager');
  return db
    .select({
      id: contracts.id,
      contractNumber: contracts.contractNumber,
      type: contracts.type,
      startDate: contracts.startDate,
      endDate: contracts.endDate,
      baseSalary: contracts.baseSalary,
      status: contracts.status,
      fileUrl: contracts.fileUrl,
      employeeName: employees.fullName,
      employeeCode: employees.employeeCode
    })
    .from(contracts)
    .leftJoin(employees, eq(contracts.employeeId, employees.id))
    .orderBy(desc(contracts.createdAt))
    .limit(200);
}

const TYPES = ['probation', 'fixed_term', 'indefinite', 'seasonal'] as const;

export async function attachContractFile(contractId: string, fileUrl: string): Promise<Result> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Không có quyền.' };
  }
  try {
    await db.update(contracts).set({ fileUrl }).where(eq(contracts.id, contractId));
    revalidatePath('/dashboard/hr/contracts');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi' };
  }
}

export async function updateContract(id: string, v: Record<string, string>): Promise<Result> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Không có quyền.' };
  }
  try {
    await db
      .update(contracts)
      .set({
        contractNumber: v.contractNumber || undefined,
        type: (v.type as (typeof TYPES)[number]) || undefined,
        startDate: v.startDate || undefined,
        endDate: v.endDate || null,
        baseSalary: v.baseSalary || undefined,
        status: (v.status as 'active' | 'expired' | 'terminated') || undefined
      })
      .where(eq(contracts.id, id));
    revalidatePath('/dashboard/hr/contracts');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi' };
  }
}

export async function deleteContract(id: string): Promise<Result> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Không có quyền.' };
  }
  try {
    // Soft delete: đặt status = terminated
    await db.update(contracts).set({ status: 'terminated' }).where(eq(contracts.id, id));
    revalidatePath('/dashboard/hr/contracts');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi' };
  }
}

export async function createContract(v: Record<string, string>): Promise<Result> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Không có quyền.' };
  }
  if (!v.employeeId || !v.contractNumber || !v.type || !v.startDate || !v.baseSalary) {
    return { ok: false, error: 'Thiếu thông tin bắt buộc.' };
  }
  if (!TYPES.includes(v.type as (typeof TYPES)[number])) {
    return { ok: false, error: 'Loại hợp đồng không hợp lệ.' };
  }
  try {
    await db.insert(contracts).values({
      employeeId: v.employeeId,
      contractNumber: v.contractNumber,
      type: v.type as (typeof TYPES)[number],
      startDate: v.startDate,
      endDate: v.endDate || null,
      baseSalary: v.baseSalary,
      status: 'active',
      fileUrl: v.fileUrl || null
    });
    revalidatePath('/dashboard/hr/contracts');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi' };
  }
}
