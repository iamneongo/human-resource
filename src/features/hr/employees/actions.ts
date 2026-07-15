'use server';

import { revalidatePath } from 'next/cache';
import { and, desc, eq, gte, ilike, inArray, lte, or } from 'drizzle-orm';

import { db } from '@/db';
import {
  assets,
  contracts,
  departments,
  employeeDocuments,
  employeeProfiles,
  employees,
  positions,
  rewardsDisciplines,
  salaryInfos
} from '@/db/schema';
import { requireRole } from '@/lib/rbac';

import { employeeFormSchema, type EmployeeFormValues } from './schema';

function getContractFileUrl(contractId: string, fileId: string | null) {
  return fileId ? `/api/contracts/${contractId}/file` : null;
}

const REQUIRED_DOCUMENT_TYPES = ['id_card', 'social_insurance', 'degree'] as const;

export type DocumentReadiness = 'complete' | 'missing' | 'expiring';

export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

type EmployeeDocumentRow = Awaited<ReturnType<typeof listEmployeeDocuments>>[number];

function getDocumentReadiness(rows: EmployeeDocumentRow[]): DocumentReadiness {
  const availableTypes = new Set(rows.map((row) => row.type));
  const hasMissing = REQUIRED_DOCUMENT_TYPES.some((type) => !availableTypes.has(type));
  if (hasMissing) return 'missing';

  const now = new Date();
  const hasExpiring = rows.some((row) => {
    if (!row.expiryDate) return false;
    const diff = Math.ceil((new Date(row.expiryDate).getTime() - now.getTime()) / 86_400_000);
    return diff >= 0 && diff <= 45;
  });

  return hasExpiring ? 'expiring' : 'complete';
}

function getDocumentSummary(rows: EmployeeDocumentRow[]) {
  const availableTypes = new Set(rows.map((row) => row.type));
  return {
    totalDocuments: rows.length,
    missingRequiredCount: REQUIRED_DOCUMENT_TYPES.filter((type) => !availableTypes.has(type))
      .length,
    readiness: getDocumentReadiness(rows)
  };
}

export async function getEmployeeDetail(id: string) {
  await requireRole('manager');
  const [emp] = await db
    .select({
      id: employees.id,
      employeeCode: employees.employeeCode,
      fullName: employees.fullName,
      dateOfBirth: employees.dateOfBirth,
      gender: employees.gender,
      soCccd: employees.soCccd,
      phone: employees.phone,
      email: employees.email,
      address: employees.address,
      maritalStatus: employees.maritalStatus,
      status: employees.status,
      hireDate: employees.hireDate,
      seniorityDate: employees.seniorityDate,
      probationEndDate: employees.probationEndDate,
      resignDate: employees.resignDate,
      resignReason: employees.resignReason,
      departmentId: employees.departmentId,
      positionId: employees.positionId,
      departmentName: departments.name,
      positionTitle: positions.title,
      birthPlace: employeeProfiles.birthPlace,
      cccdIssueDate: employeeProfiles.cccdIssueDate,
      cccdIssuePlace: employeeProfiles.cccdIssuePlace,
      nationality: employeeProfiles.nationality,
      permanentAddress: employeeProfiles.permanentAddress,
      educationLevel: employeeProfiles.educationLevel,
      major: employeeProfiles.major,
      jobTitle: employeeProfiles.jobTitle
    })
    .from(employees)
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .leftJoin(positions, eq(employees.positionId, positions.id))
    .leftJoin(employeeProfiles, eq(employeeProfiles.employeeId, employees.id))
    .where(eq(employees.id, id))
    .limit(1);
  if (!emp) return null;

  const [contractRows, documentRows] = await Promise.all([
    db
      .select({
        id: contracts.id,
        type: contracts.type,
        contractNumber: contracts.contractNumber,
        startDate: contracts.startDate,
        endDate: contracts.endDate,
        status: contracts.status,
        fileId: contracts.fileId
      })
      .from(contracts)
      .where(eq(contracts.employeeId, id))
      .orderBy(desc(contracts.startDate)),
    listEmployeeDocuments(id)
  ]);

  return {
    emp,
    contracts: contractRows.map((row) => ({
      ...row,
      fileUrl: getContractFileUrl(row.id, row.fileId)
    })),
    documents: documentRows,
    documentSummary: getDocumentSummary(documentRows)
  };
}

export async function listEmployees(filters?: {
  search?: string;
  departmentId?: string;
  status?: string;
  documentStatus?: string;
}) {
  await requireRole('manager');

  const search = filters?.search?.trim();
  const departmentId = filters?.departmentId?.trim();
  const status = filters?.status?.trim();
  const documentStatus = filters?.documentStatus?.trim();

  const rows = await db
    .select({
      id: employees.id,
      employeeCode: employees.employeeCode,
      fullName: employees.fullName,
      email: employees.email,
      phone: employees.phone,
      status: employees.status,
      hireDate: employees.hireDate,
      departmentId: employees.departmentId,
      departmentName: departments.name,
      positionTitle: positions.title
    })
    .from(employees)
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .leftJoin(positions, eq(employees.positionId, positions.id))
    .where(
      and(
        departmentId ? eq(employees.departmentId, departmentId) : undefined,
        status
          ? eq(employees.status, status as 'active' | 'probation' | 'on_leave' | 'terminated')
          : undefined,
        search
          ? or(
              ilike(employees.fullName, `%${search}%`),
              ilike(employees.employeeCode, `%${search}%`),
              ilike(departments.name, `%${search}%`)
            )
          : undefined
      )
    )
    .orderBy(desc(employees.createdAt))
    .limit(2000);

  const employeeIds = rows.map((row) => row.id);
  const documentRows =
    employeeIds.length > 0
      ? await db
          .select({
            id: employeeDocuments.id,
            employeeId: employeeDocuments.employeeId,
            type: employeeDocuments.type,
            name: employeeDocuments.name,
            fileUrl: employeeDocuments.fileUrl,
            note: employeeDocuments.note,
            issueDate: employeeDocuments.issueDate,
            expiryDate: employeeDocuments.expiryDate
          })
          .from(employeeDocuments)
          .where(inArray(employeeDocuments.employeeId, employeeIds))
      : [];

  const documentsByEmployee = new Map<string, typeof documentRows>();
  for (const row of documentRows) {
    const list = documentsByEmployee.get(row.employeeId) ?? [];
    list.push(row);
    documentsByEmployee.set(row.employeeId, list);
  }

  const enrichedRows = rows.map((row) => {
    const employeeDocs = documentsByEmployee.get(row.id) ?? [];
    const summary = getDocumentSummary(employeeDocs);

    return {
      ...row,
      documentStatus: summary.readiness,
      documentCount: summary.totalDocuments,
      missingRequiredCount: summary.missingRequiredCount
    };
  });

  if (!documentStatus) return enrichedRows;

  return enrichedRows.filter((row) => row.documentStatus === documentStatus);
}

export async function listEmployeeDocuments(employeeId: string) {
  await requireRole('manager');
  return db
    .select({
      id: employeeDocuments.id,
      employeeId: employeeDocuments.employeeId,
      type: employeeDocuments.type,
      name: employeeDocuments.name,
      fileUrl: employeeDocuments.fileUrl,
      note: employeeDocuments.note,
      issueDate: employeeDocuments.issueDate,
      expiryDate: employeeDocuments.expiryDate
    })
    .from(employeeDocuments)
    .where(eq(employeeDocuments.employeeId, employeeId))
    .orderBy(desc(employeeDocuments.createdAt));
}

export async function upsertEmployeeDocument(
  employeeId: string,
  values: Record<string, string>
): Promise<ActionResult<void>> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Bạn không có quyền cập nhật hồ sơ số hóa.' };
  }

  if (!values.type || !values.name || !values.fileUrl) {
    return { ok: false, error: 'Vui lòng nhập đủ loại giấy tờ, tên giấy tờ và file đính kèm.' };
  }

  try {
    if (values.id) {
      await db
        .update(employeeDocuments)
        .set({
          type: values.type as typeof employeeDocuments.$inferInsert.type,
          name: values.name,
          fileUrl: values.fileUrl,
          note: values.note || null,
          issueDate: values.issueDate || null,
          expiryDate: values.expiryDate || null
        })
        .where(eq(employeeDocuments.id, values.id));
    } else {
      await db.insert(employeeDocuments).values({
        employeeId,
        type: values.type as typeof employeeDocuments.$inferInsert.type,
        name: values.name,
        fileUrl: values.fileUrl,
        note: values.note || null,
        issueDate: values.issueDate || null,
        expiryDate: values.expiryDate || null
      });
    }

    revalidatePath(`/dashboard/hr/employees/${employeeId}`);
    revalidatePath('/dashboard/hr/employees');
    return { ok: true, data: undefined };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Không thể lưu giấy tờ nhân sự.'
    };
  }
}

export async function deleteEmployeeDocument(
  employeeId: string,
  documentId: string
): Promise<ActionResult<void>> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Bạn không có quyền xóa giấy tờ nhân sự.' };
  }

  try {
    await db.delete(employeeDocuments).where(eq(employeeDocuments.id, documentId));
    revalidatePath(`/dashboard/hr/employees/${employeeId}`);
    revalidatePath('/dashboard/hr/employees');
    return { ok: true, data: undefined };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Không thể xóa giấy tờ nhân sự.'
    };
  }
}

export async function updateEmployee(
  id: string,
  v: Record<string, string>
): Promise<ActionResult<void>> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Bạn không có quyền chỉnh sửa nhân viên.' };
  }
  try {
    await db
      .update(employees)
      .set({
        fullName: v.fullName || undefined,
        email: v.email || undefined,
        phone: v.phone || undefined,
        soCccd: v.soCccd || undefined,
        dateOfBirth: v.dateOfBirth || undefined,
        gender: (v.gender as 'male' | 'female' | 'other') || undefined,
        status: (v.status as 'active' | 'probation' | 'on_leave' | 'terminated') || undefined,
        departmentId: v.departmentId || undefined,
        positionId: v.positionId || undefined
      })
      .where(eq(employees.id, id));
    revalidatePath(`/dashboard/hr/employees/${id}`);
    revalidatePath('/dashboard/hr/employees');
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi không xác định' };
  }
}

export async function getEmployeeContracts(employeeId: string) {
  await requireRole('manager');
  const rows = await db
    .select({
      id: contracts.id,
      type: contracts.type,
      contractNumber: contracts.contractNumber,
      startDate: contracts.startDate,
      endDate: contracts.endDate,
      baseSalary: contracts.baseSalary,
      status: contracts.status,
      fileId: contracts.fileId,
      fileName: contracts.fileName,
      fileMimeType: contracts.fileMimeType
    })
    .from(contracts)
    .where(eq(contracts.employeeId, employeeId))
    .orderBy(desc(contracts.startDate));

  return rows.map((row) => ({
    ...row,
    fileUrl: getContractFileUrl(row.id, row.fileId)
  }));
}

export async function getEmployeeSalaryHistory(employeeId: string) {
  await requireRole('manager');
  return db
    .select()
    .from(salaryInfos)
    .where(eq(salaryInfos.employeeId, employeeId))
    .orderBy(desc(salaryInfos.effectiveFrom));
}

export async function getEmployeeAssets(employeeId: string) {
  await requireRole('manager');
  return db
    .select()
    .from(assets)
    .where(eq(assets.employeeId, employeeId))
    .orderBy(desc(assets.issueDate));
}

export async function getEmployeeRewards(employeeId: string) {
  await requireRole('manager');
  return db
    .select()
    .from(rewardsDisciplines)
    .where(eq(rewardsDisciplines.employeeId, employeeId))
    .orderBy(desc(rewardsDisciplines.decisionDate));
}

export async function getEmployeesWithExpiringContracts(withinDays: number) {
  await requireRole('manager');
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + withinDays);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const todayStr = new Date().toISOString().slice(0, 10);

  return db
    .select({
      employeeId: employees.id,
      employeeName: employees.fullName,
      contractNumber: contracts.contractNumber,
      endDate: contracts.endDate
    })
    .from(contracts)
    .leftJoin(employees, eq(contracts.employeeId, employees.id))
    .where(and(gte(contracts.endDate, todayStr), lte(contracts.endDate, cutoffStr)))
    .orderBy(contracts.endDate);
}

export async function upsertEmployeeProfile(
  employeeId: string,
  v: Record<string, string>
): Promise<ActionResult<void>> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Bạn không có quyền chỉnh sửa hồ sơ nhân viên.' };
  }
  try {
    await db
      .insert(employeeProfiles)
      .values({
        employeeId,
        birthPlace: v.birthPlace || null,
        cccdIssueDate: v.cccdIssueDate || null,
        cccdIssuePlace: v.cccdIssuePlace || null,
        nationality: v.nationality || null,
        permanentAddress: v.permanentAddress || null,
        educationLevel: v.educationLevel || null,
        major: v.major || null,
        jobTitle: v.jobTitle || null
      })
      .onConflictDoUpdate({
        target: employeeProfiles.employeeId,
        set: {
          birthPlace: v.birthPlace || null,
          cccdIssueDate: v.cccdIssueDate || null,
          cccdIssuePlace: v.cccdIssuePlace || null,
          nationality: v.nationality || null,
          permanentAddress: v.permanentAddress || null,
          educationLevel: v.educationLevel || null,
          major: v.major || null,
          jobTitle: v.jobTitle || null
        }
      });
    revalidatePath(`/dashboard/hr/employees/${employeeId}`);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi không xác định' };
  }
}

export async function updateEmployeeWorkInfo(
  id: string,
  v: Record<string, string>
): Promise<ActionResult<void>> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Bạn không có quyền chỉnh sửa nhân viên.' };
  }
  try {
    await db
      .update(employees)
      .set({
        hireDate: v.hireDate || null,
        seniorityDate: v.seniorityDate || null,
        probationEndDate: v.probationEndDate || null,
        status: (v.status as 'active' | 'probation' | 'on_leave' | 'terminated') || undefined,
        departmentId: v.departmentId || null,
        positionId: v.positionId || null
      })
      .where(eq(employees.id, id));

    if (
      v.educationLevel ||
      v.major ||
      v.jobTitle ||
      v.birthPlace ||
      v.cccdIssueDate ||
      v.cccdIssuePlace ||
      v.nationality ||
      v.permanentAddress
    ) {
      await db
        .insert(employeeProfiles)
        .values({
          employeeId: id,
          birthPlace: v.birthPlace || null,
          cccdIssueDate: v.cccdIssueDate || null,
          cccdIssuePlace: v.cccdIssuePlace || null,
          nationality: v.nationality || null,
          permanentAddress: v.permanentAddress || null,
          educationLevel: v.educationLevel || null,
          major: v.major || null,
          jobTitle: v.jobTitle || null
        })
        .onConflictDoUpdate({
          target: employeeProfiles.employeeId,
          set: {
            birthPlace: v.birthPlace || null,
            cccdIssueDate: v.cccdIssueDate || null,
            cccdIssuePlace: v.cccdIssuePlace || null,
            nationality: v.nationality || null,
            permanentAddress: v.permanentAddress || null,
            educationLevel: v.educationLevel || null,
            major: v.major || null,
            jobTitle: v.jobTitle || null
          }
        });
    }
    revalidatePath(`/dashboard/hr/employees/${id}`);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi không xác định' };
  }
}

export async function updateEmployeeFull(
  id: string,
  values: EmployeeFormValues
): Promise<ActionResult<void>> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Bạn không có quyền chỉnh sửa nhân viên.' };
  }
  const parsed = employeeFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' };
  }
  const v = parsed.data;
  try {
    await db.transaction(async (tx) => {
      await tx
        .update(employees)
        .set({
          fullName: v.fullName,
          email: v.email || null,
          phone: v.phone || null,
          soCccd: v.soCccd || null,
          dateOfBirth: v.dateOfBirth || null,
          gender: v.gender,
          address: v.address || null,
          maritalStatus: v.maritalStatus ?? null,
          hireDate: v.hireDate || null,
          seniorityDate: v.seniorityDate || null,
          probationEndDate: v.probationEndDate || null,
          resignDate: v.resignDate || null,
          resignReason: v.resignReason || null,
          status: v.status,
          departmentId: v.departmentId || null,
          positionId: v.positionId || null
        })
        .where(eq(employees.id, id));

      await tx
        .insert(employeeProfiles)
        .values({
          employeeId: id,
          birthPlace: v.birthPlace || null,
          cccdIssueDate: v.cccdIssueDate || null,
          cccdIssuePlace: v.cccdIssuePlace || null,
          nationality: v.nationality || null,
          permanentAddress: v.permanentAddress || null,
          educationLevel: v.educationLevel || null,
          major: v.major || null,
          jobTitle: v.jobTitle || null
        })
        .onConflictDoUpdate({
          target: employeeProfiles.employeeId,
          set: {
            birthPlace: v.birthPlace || null,
            cccdIssueDate: v.cccdIssueDate || null,
            cccdIssuePlace: v.cccdIssuePlace || null,
            nationality: v.nationality || null,
            permanentAddress: v.permanentAddress || null,
            educationLevel: v.educationLevel || null,
            major: v.major || null,
            jobTitle: v.jobTitle || null
          }
        });
    });

    revalidatePath(`/dashboard/hr/employees/${id}`);
    revalidatePath('/dashboard/hr/employees');
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi không xác định' };
  }
}

export async function createEmployee(
  values: EmployeeFormValues
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Bạn không có quyền tạo nhân viên.' };
  }

  const parsed = employeeFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' };
  }
  const v = parsed.data;

  try {
    const [row] = await db
      .insert(employees)
      .values({
        employeeCode: v.employeeCode,
        fullName: v.fullName,
        email: v.email || null,
        phone: v.phone || null,
        soCccd: v.soCccd || null,
        dateOfBirth: v.dateOfBirth || null,
        gender: v.gender,
        address: v.address || null,
        maritalStatus: v.maritalStatus ?? null,
        hireDate: v.hireDate || null,
        seniorityDate: v.seniorityDate || null,
        probationEndDate: v.probationEndDate || null,
        resignDate: v.resignDate || null,
        resignReason: v.resignReason || null,
        status: v.status,
        departmentId: v.departmentId || null,
        positionId: v.positionId || null
      })
      .returning({ id: employees.id });

    await db.insert(employeeProfiles).values({
      employeeId: row.id,
      birthPlace: v.birthPlace || null,
      cccdIssueDate: v.cccdIssueDate || null,
      cccdIssuePlace: v.cccdIssuePlace || null,
      nationality: v.nationality || null,
      permanentAddress: v.permanentAddress || null,
      educationLevel: v.educationLevel || null,
      major: v.major || null,
      jobTitle: v.jobTitle || null
    });

    revalidatePath('/dashboard/hr/employees');
    return { ok: true, data: { id: row.id } };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Lỗi không xác định';
    if (msg.includes('employee_code')) {
      return { ok: false, error: 'Mã nhân viên đã tồn tại.' };
    }
    return { ok: false, error: msg };
  }
}
