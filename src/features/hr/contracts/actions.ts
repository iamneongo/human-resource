'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { contracts, employees, files } from '@/db/schema';
import { requireRole } from '@/lib/rbac';

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

const TYPES = [
  'probation',
  'fixed_term',
  'term_1y',
  'term_3y',
  'indefinite',
  'until_retirement',
  'seasonal'
] as const;

function getContractFileUrl(contractId: string, fileId: string | null) {
  return fileId ? `/api/contracts/${contractId}/file` : null;
}

function revalidateContractViews(employeeId?: string | null) {
  revalidatePath('/dashboard/hr/contracts');
  if (employeeId) {
    revalidatePath(`/dashboard/hr/employees/${employeeId}`);
  }
}

export async function listContracts() {
  await requireRole('manager');
  const rows = await db
    .select({
      id: contracts.id,
      contractNumber: contracts.contractNumber,
      type: contracts.type,
      startDate: contracts.startDate,
      endDate: contracts.endDate,
      baseSalary: contracts.baseSalary,
      status: contracts.status,
      fileId: contracts.fileId,
      fileName: contracts.fileName,
      fileMimeType: contracts.fileMimeType,
      fileSize: contracts.fileSize,
      employeeId: contracts.employeeId,
      employeeName: employees.fullName,
      employeeCode: employees.employeeCode
    })
    .from(contracts)
    .leftJoin(employees, eq(contracts.employeeId, employees.id))
    .orderBy(desc(contracts.createdAt))
    .limit(200);

  return rows.map((row) => ({
    ...row,
    fileUrl: getContractFileUrl(row.id, row.fileId)
  }));
}

export async function attachContractFile(
  contractId: string,
  fileId: string
): Promise<Result<{ fileUrl: string }>> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Không có quyền.' };
  }

  const { userId } = await auth();
  if (!userId) return { ok: false, error: 'Bạn cần đăng nhập.' };

  try {
    const [contractRow] = await db
      .select({
        id: contracts.id,
        employeeId: contracts.employeeId
      })
      .from(contracts)
      .where(eq(contracts.id, contractId))
      .limit(1);

    if (!contractRow) return { ok: false, error: 'Không tìm thấy hợp đồng.' };

    const [fileRow] = await db
      .select({
        id: files.id,
        filename: files.filename,
        mimeType: files.mimeType,
        size: files.size
      })
      .from(files)
      .where(eq(files.id, fileId))
      .limit(1);

    if (!fileRow) return { ok: false, error: 'Không tìm thấy file đã upload.' };

    await db
      .update(contracts)
      .set({
        fileUrl: getContractFileUrl(contractId, fileId),
        fileId: fileRow.id,
        fileName: fileRow.filename,
        fileMimeType: fileRow.mimeType,
        fileSize: fileRow.size,
        fileUploadedBy: userId,
        fileUploadedAt: new Date()
      })
      .where(eq(contracts.id, contractId));

    revalidateContractViews(contractRow.employeeId);
    return {
      ok: true,
      data: { fileUrl: getContractFileUrl(contractId, fileId)! }
    };
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
    const [existing] = await db
      .select({ employeeId: contracts.employeeId })
      .from(contracts)
      .where(eq(contracts.id, id))
      .limit(1);
    if (!existing) return { ok: false, error: 'Không tìm thấy hợp đồng.' };

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
    revalidateContractViews(existing.employeeId);
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
    const [existing] = await db
      .select({ employeeId: contracts.employeeId })
      .from(contracts)
      .where(eq(contracts.id, id))
      .limit(1);
    if (!existing) return { ok: false, error: 'Không tìm thấy hợp đồng.' };

    await db.update(contracts).set({ status: 'terminated' }).where(eq(contracts.id, id));
    revalidateContractViews(existing.employeeId);
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
      status: 'active'
    });
    revalidateContractViews(v.employeeId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi' };
  }
}
