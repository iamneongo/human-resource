'use server';

import { revalidatePath } from 'next/cache';
import { and, desc, eq, gte, ilike, lte, or } from 'drizzle-orm';

import { db } from '@/db';
import {
  assets,
  contracts,
  departments,
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

  const contractRows = await db
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
    .orderBy(desc(contracts.startDate));

  return {
    emp,
    contracts: contractRows.map((row) => ({
      ...row,
      fileUrl: getContractFileUrl(row.id, row.fileId)
    }))
  };
}

export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

export async function listEmployees(search?: string) {
  await requireRole('manager');

  const rows = await db
    .select({
      id: employees.id,
      employeeCode: employees.employeeCode,
      fullName: employees.fullName,
      email: employees.email,
      phone: employees.phone,
      status: employees.status,
      hireDate: employees.hireDate,
      departmentName: departments.name,
      positionTitle: positions.title
    })
    .from(employees)
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .leftJoin(positions, eq(employees.positionId, positions.id))
    .where(
      search
        ? or(ilike(employees.fullName, `%${search}%`), ilike(employees.employeeCode, `%${search}%`))
        : undefined
    )
    .orderBy(desc(employees.createdAt))
    .limit(2000);

  return rows;
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
