'use server';

import { revalidatePath } from 'next/cache';
import { and, asc, desc, eq, gte, inArray, lte } from 'drizzle-orm';

import { db } from '@/db';
import {
  dailyStaffingTargets,
  departments,
  employees,
  leaveRequests,
  manualAttendanceEntries,
  overtimeRequests,
  salaryInfos,
  shifts,
  timesheets
} from '@/db/schema';
import { requireAuthUserId } from '@/lib/auth';
import { requireRole } from '@/lib/rbac';

type Result = { ok: true } | { ok: false; error: string };

export type DailyStaffingFilters = {
  dateFrom?: string;
  dateTo?: string;
  departmentId?: string;
  shiftId?: string;
};

export type DailyStaffingTrackingRow = {
  id: string;
  workDate: string;
  departmentId: string;
  departmentName: string;
  shiftId: string;
  shiftCode: string;
  shiftName: string;
  targetId: string | null;
  targetHeadcount: number;
  actualHeadcount: number;
  variance: number;
  coverageRate: number;
  estimatedPayrollCost: number;
  warningFlags: string[];
  actualWorkdays: number;
  manualOverrideCount: number;
  note: string | null;
};

export type DailyStaffingTrackingData = {
  filters: {
    dateFrom: string;
    dateTo: string;
    departmentId: string;
    shiftId: string;
  };
  rows: DailyStaffingTrackingRow[];
  summary: {
    departmentsTracked: number;
    totalTargetHeadcount: number;
    totalActualHeadcount: number;
    shortageHeadcount: number;
    excessHeadcount: number;
    estimatedPayrollCost: number;
  };
};

type UpsertDailyStaffingTargetInput = {
  id?: string;
  workDate: string;
  departmentId: string;
  shiftId: string;
  targetHeadcount: string;
  note?: string;
};

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDefaultRange() {
  const today = new Date();
  const day = today.getDay() || 7;
  today.setHours(0, 0, 0, 0);
  today.setDate(today.getDate() - day + 1);
  const start = new Date(today);
  const end = new Date(today);
  end.setDate(start.getDate() + 6);
  return {
    dateFrom: toIsoDate(start),
    dateTo: toIsoDate(end)
  };
}

function resolveFilters(filters?: DailyStaffingFilters) {
  const fallback = getDefaultRange();
  return {
    dateFrom: filters?.dateFrom || fallback.dateFrom,
    dateTo: filters?.dateTo || fallback.dateTo,
    departmentId: filters?.departmentId || '',
    shiftId: filters?.shiftId || ''
  };
}

function comboKey(workDate: string, departmentId: string, shiftId: string) {
  return `${workDate}:${departmentId}:${shiftId}`;
}

function employeeDayKey(employeeId: string, workDate: string) {
  return `${employeeId}:${workDate}`;
}

function roundCurrency(value: number) {
  return Math.round(value);
}

function getCoverageRate(targetHeadcount: number, actualHeadcount: number) {
  if (targetHeadcount <= 0) return actualHeadcount > 0 ? 100 : 0;
  return Number(((actualHeadcount / targetHeadcount) * 100).toFixed(1));
}

function getSalaryPerDayForDate(
  salaryHistory: Array<{ effectiveFrom: string; baseSalary: string | number }>,
  workDate: string
) {
  const matched = salaryHistory.find((item) => item.effectiveFrom <= workDate) ?? salaryHistory[0];
  const baseSalary = Number(matched?.baseSalary ?? 0);
  return baseSalary > 0 ? baseSalary / 26 : 0;
}

export async function getDailyStaffingTracking(
  input?: DailyStaffingFilters
): Promise<DailyStaffingTrackingData> {
  await requireRole('manager');

  const filters = resolveFilters(input);
  const employeeRows = await db
    .select({
      id: employees.id,
      departmentId: employees.departmentId
    })
    .from(employees)
    .where(
      and(
        inArray(employees.status, ['active', 'probation', 'on_leave']),
        filters.departmentId ? eq(employees.departmentId, filters.departmentId) : undefined
      )
    );

  const employeeIds = employeeRows.map((row) => row.id);
  const employeeDepartmentMap = new Map(
    employeeRows
      .filter((row) => row.departmentId)
      .map((row) => [row.id, row.departmentId as string])
  );

  const [
    departmentRows,
    shiftRows,
    targetRows,
    timesheetRows,
    manualRows,
    otRows,
    leaveRows,
    salaryRows
  ] = await Promise.all([
    db
      .select({ id: departments.id, name: departments.name })
      .from(departments)
      .where(filters.departmentId ? eq(departments.id, filters.departmentId) : undefined)
      .orderBy(asc(departments.name)),
    db
      .select({
        id: shifts.id,
        code: shifts.code,
        name: shifts.name,
        standardHours: shifts.standardHours
      })
      .from(shifts)
      .where(filters.shiftId ? eq(shifts.id, filters.shiftId) : undefined)
      .orderBy(asc(shifts.code)),
    db
      .select({
        id: dailyStaffingTargets.id,
        workDate: dailyStaffingTargets.workDate,
        departmentId: dailyStaffingTargets.departmentId,
        shiftId: dailyStaffingTargets.shiftId,
        targetHeadcount: dailyStaffingTargets.targetHeadcount,
        note: dailyStaffingTargets.note
      })
      .from(dailyStaffingTargets)
      .where(
        and(
          gte(dailyStaffingTargets.workDate, filters.dateFrom),
          lte(dailyStaffingTargets.workDate, filters.dateTo),
          filters.departmentId
            ? eq(dailyStaffingTargets.departmentId, filters.departmentId)
            : undefined,
          filters.shiftId ? eq(dailyStaffingTargets.shiftId, filters.shiftId) : undefined
        )
      ),
    employeeIds.length > 0
      ? db
          .select({
            employeeId: timesheets.employeeId,
            workDate: timesheets.workDate,
            shiftId: timesheets.shiftId,
            workedHours: timesheets.workedHours,
            status: timesheets.status,
            standardHours: shifts.standardHours
          })
          .from(timesheets)
          .leftJoin(shifts, eq(timesheets.shiftId, shifts.id))
          .where(
            and(
              inArray(timesheets.employeeId, employeeIds),
              gte(timesheets.workDate, filters.dateFrom),
              lte(timesheets.workDate, filters.dateTo),
              filters.shiftId ? eq(timesheets.shiftId, filters.shiftId) : undefined
            )
          )
      : Promise.resolve([]),
    employeeIds.length > 0
      ? db
          .select({
            employeeId: manualAttendanceEntries.employeeId,
            workDate: manualAttendanceEntries.workDate,
            shiftId: manualAttendanceEntries.shiftId,
            morning: manualAttendanceEntries.morning,
            afternoon: manualAttendanceEntries.afternoon,
            standardHours: shifts.standardHours
          })
          .from(manualAttendanceEntries)
          .leftJoin(shifts, eq(manualAttendanceEntries.shiftId, shifts.id))
          .where(
            and(
              inArray(manualAttendanceEntries.employeeId, employeeIds),
              gte(manualAttendanceEntries.workDate, filters.dateFrom),
              lte(manualAttendanceEntries.workDate, filters.dateTo),
              filters.shiftId ? eq(manualAttendanceEntries.shiftId, filters.shiftId) : undefined
            )
          )
      : Promise.resolve([]),
    employeeIds.length > 0
      ? db
          .select({
            employeeId: overtimeRequests.employeeId,
            workDate: overtimeRequests.workDate
          })
          .from(overtimeRequests)
          .where(
            and(
              inArray(overtimeRequests.employeeId, employeeIds),
              eq(overtimeRequests.status, 'approved'),
              gte(overtimeRequests.workDate, filters.dateFrom),
              lte(overtimeRequests.workDate, filters.dateTo)
            )
          )
      : Promise.resolve([]),
    employeeIds.length > 0
      ? db
          .select({
            employeeId: leaveRequests.employeeId,
            startDate: leaveRequests.startDate,
            endDate: leaveRequests.endDate
          })
          .from(leaveRequests)
          .where(
            and(
              inArray(leaveRequests.employeeId, employeeIds),
              eq(leaveRequests.status, 'approved'),
              lte(leaveRequests.startDate, filters.dateTo),
              gte(leaveRequests.endDate, filters.dateFrom)
            )
          )
      : Promise.resolve([]),
    employeeIds.length > 0
      ? db
          .select({
            employeeId: salaryInfos.employeeId,
            effectiveFrom: salaryInfos.effectiveFrom,
            baseSalary: salaryInfos.baseSalary
          })
          .from(salaryInfos)
          .where(inArray(salaryInfos.employeeId, employeeIds))
          .orderBy(desc(salaryInfos.effectiveFrom))
      : Promise.resolve([])
  ]);

  const departmentMap = new Map(departmentRows.map((row) => [row.id, row.name]));
  const shiftMap = new Map(
    shiftRows.map((row) => [
      row.id,
      {
        code: row.code,
        name: row.name,
        standardHours: Number(row.standardHours ?? 8) || 8
      }
    ])
  );

  const salaryHistoryMap = new Map<
    string,
    Array<{ effectiveFrom: string; baseSalary: string | number }>
  >();
  for (const row of salaryRows) {
    const list = salaryHistoryMap.get(row.employeeId) ?? [];
    list.push({ effectiveFrom: row.effectiveFrom, baseSalary: row.baseSalary });
    salaryHistoryMap.set(row.employeeId, list);
  }

  const manualByEmployeeDate = new Map<
    string,
    { shiftId: string | null; workdays: number; workedHours: number }
  >();
  for (const row of manualRows) {
    const parts = Number(row.morning) + Number(row.afternoon);
    const standardHours = Number(row.standardHours ?? 8) || 8;
    manualByEmployeeDate.set(employeeDayKey(row.employeeId, row.workDate), {
      shiftId: row.shiftId,
      workdays: parts / 2,
      workedHours: (standardHours * parts) / 2
    });
  }

  const otKeys = new Set(otRows.map((row) => employeeDayKey(row.employeeId, row.workDate)));
  const leaveKeys = new Set<string>();
  for (const row of leaveRows) {
    const cursor = new Date(`${row.startDate}T00:00:00`);
    const end = new Date(`${row.endDate}T00:00:00`);
    while (cursor.getTime() <= end.getTime()) {
      leaveKeys.add(employeeDayKey(row.employeeId, toIsoDate(cursor)));
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  const actualMap = new Map<
    string,
    {
      employees: Set<string>;
      estimatedPayrollCost: number;
      actualWorkdays: number;
      manualOverrideCount: number;
      hasOt: boolean;
      hasLeave: boolean;
    }
  >();

  function ensureActualRow(workDate: string, departmentId: string, shiftId: string) {
    const key = comboKey(workDate, departmentId, shiftId);
    const current = actualMap.get(key) ?? {
      employees: new Set<string>(),
      estimatedPayrollCost: 0,
      actualWorkdays: 0,
      manualOverrideCount: 0,
      hasOt: false,
      hasLeave: false
    };
    actualMap.set(key, current);
    return current;
  }

  for (const row of timesheetRows) {
    const departmentId = employeeDepartmentMap.get(row.employeeId);
    if (!departmentId || !row.shiftId) continue;

    const manual = manualByEmployeeDate.get(employeeDayKey(row.employeeId, row.workDate));
    const shiftId = manual?.shiftId ?? row.shiftId;
    if (!shiftId) continue;

    const standardHours =
      Number(row.standardHours ?? shiftMap.get(shiftId)?.standardHours ?? 8) || 8;
    const workedHours = manual
      ? manual.workedHours
      : row.status === 'absent'
        ? 0
        : Number(row.workedHours ?? 0) > 0
          ? Number(row.workedHours ?? 0)
          : row.status === 'present'
            ? standardHours
            : 0;
    const workdays = manual ? manual.workdays : workedHours > 0 ? workedHours / standardHours : 0;

    if (workdays <= 0) continue;

    const current = ensureActualRow(row.workDate, departmentId, shiftId);
    current.employees.add(row.employeeId);
    current.actualWorkdays += workdays;
    current.estimatedPayrollCost +=
      getSalaryPerDayForDate(salaryHistoryMap.get(row.employeeId) ?? [], row.workDate) * workdays;
    if (manual) current.manualOverrideCount += 1;
    if (otKeys.has(employeeDayKey(row.employeeId, row.workDate))) current.hasOt = true;
    if (leaveKeys.has(employeeDayKey(row.employeeId, row.workDate))) current.hasLeave = true;
  }

  for (const [key, manual] of manualByEmployeeDate.entries()) {
    const [employeeId, workDate] = key.split(':');
    const departmentId = employeeDepartmentMap.get(employeeId);
    if (!departmentId || !manual.shiftId) continue;

    const alreadyCounted = timesheetRows.some(
      (row) => row.employeeId === employeeId && row.workDate === workDate
    );
    if (alreadyCounted || manual.workdays <= 0) continue;

    const current = ensureActualRow(workDate, departmentId, manual.shiftId);
    current.employees.add(employeeId);
    current.actualWorkdays += manual.workdays;
    current.estimatedPayrollCost +=
      getSalaryPerDayForDate(salaryHistoryMap.get(employeeId) ?? [], workDate) * manual.workdays;
    current.manualOverrideCount += 1;
    if (otKeys.has(employeeDayKey(employeeId, workDate))) current.hasOt = true;
    if (leaveKeys.has(employeeDayKey(employeeId, workDate))) current.hasLeave = true;
  }

  const rowMap = new Map<string, DailyStaffingTrackingRow>();

  for (const row of targetRows) {
    const key = comboKey(row.workDate, row.departmentId, row.shiftId);
    const actual = actualMap.get(key);
    const actualHeadcount = actual?.employees.size ?? 0;
    const variance = actualHeadcount - row.targetHeadcount;
    const warningFlags: string[] = [];
    if (variance < 0) warningFlags.push('Thiếu người so với định biên');
    if (variance > 0) warningFlags.push('Vượt định biên');
    if ((actual?.manualOverrideCount ?? 0) > 0) warningFlags.push('Có công thủ công override');
    if (actual?.hasOt) warningFlags.push('Có OT đã duyệt ảnh hưởng số thực tế');
    if (actual?.hasLeave) warningFlags.push('Có nghỉ phép ảnh hưởng số thực tế');

    rowMap.set(key, {
      id: key,
      workDate: row.workDate,
      departmentId: row.departmentId,
      departmentName: departmentMap.get(row.departmentId) ?? 'Chưa xác định',
      shiftId: row.shiftId,
      shiftCode: shiftMap.get(row.shiftId)?.code ?? 'N/A',
      shiftName: shiftMap.get(row.shiftId)?.name ?? 'Chưa gán ca',
      targetId: row.id,
      targetHeadcount: Number(row.targetHeadcount ?? 0),
      actualHeadcount,
      variance,
      coverageRate: getCoverageRate(Number(row.targetHeadcount ?? 0), actualHeadcount),
      estimatedPayrollCost: roundCurrency(actual?.estimatedPayrollCost ?? 0),
      warningFlags,
      actualWorkdays: Number((actual?.actualWorkdays ?? 0).toFixed(2)),
      manualOverrideCount: actual?.manualOverrideCount ?? 0,
      note: row.note
    });
  }

  for (const [key, actual] of actualMap.entries()) {
    if (rowMap.has(key)) continue;
    const [workDate, departmentId, shiftId] = key.split(':');
    const warningFlags: string[] = [];
    if (actual.employees.size > 0) warningFlags.push('Chưa khai báo định biên cho dòng này');
    if (actual.manualOverrideCount > 0) warningFlags.push('Có công thủ công override');
    if (actual.hasOt) warningFlags.push('Có OT đã duyệt ảnh hưởng số thực tế');
    if (actual.hasLeave) warningFlags.push('Có nghỉ phép ảnh hưởng số thực tế');

    rowMap.set(key, {
      id: key,
      workDate,
      departmentId,
      departmentName: departmentMap.get(departmentId) ?? 'Chưa xác định',
      shiftId,
      shiftCode: shiftMap.get(shiftId)?.code ?? 'N/A',
      shiftName: shiftMap.get(shiftId)?.name ?? 'Chưa gán ca',
      targetId: null,
      targetHeadcount: 0,
      actualHeadcount: actual.employees.size,
      variance: actual.employees.size,
      coverageRate: actual.employees.size > 0 ? 100 : 0,
      estimatedPayrollCost: roundCurrency(actual.estimatedPayrollCost),
      warningFlags,
      actualWorkdays: Number(actual.actualWorkdays.toFixed(2)),
      manualOverrideCount: actual.manualOverrideCount,
      note: null
    });
  }

  const rows = Array.from(rowMap.values()).toSorted((a, b) => {
    if (a.workDate !== b.workDate) return a.workDate.localeCompare(b.workDate);
    if (a.departmentName !== b.departmentName)
      return a.departmentName.localeCompare(b.departmentName);
    return a.shiftCode.localeCompare(b.shiftCode);
  });

  const summary = rows.reduce(
    (acc, row) => {
      acc.totalTargetHeadcount += row.targetHeadcount;
      acc.totalActualHeadcount += row.actualHeadcount;
      acc.shortageHeadcount += Math.max(row.targetHeadcount - row.actualHeadcount, 0);
      acc.excessHeadcount += Math.max(row.actualHeadcount - row.targetHeadcount, 0);
      acc.estimatedPayrollCost += row.estimatedPayrollCost;
      acc.departments.add(row.departmentId);
      return acc;
    },
    {
      departments: new Set<string>(),
      totalTargetHeadcount: 0,
      totalActualHeadcount: 0,
      shortageHeadcount: 0,
      excessHeadcount: 0,
      estimatedPayrollCost: 0
    }
  );

  return {
    filters,
    rows,
    summary: {
      departmentsTracked: summary.departments.size,
      totalTargetHeadcount: summary.totalTargetHeadcount,
      totalActualHeadcount: summary.totalActualHeadcount,
      shortageHeadcount: summary.shortageHeadcount,
      excessHeadcount: summary.excessHeadcount,
      estimatedPayrollCost: roundCurrency(summary.estimatedPayrollCost)
    }
  };
}

export async function upsertDailyStaffingTarget(input: Record<string, string>): Promise<Result> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Chỉ HR/Admin mới được cập nhật định biên ngày.' };
  }

  const userId = await requireAuthUserId().catch(() => null);
  if (!userId) return { ok: false, error: 'Bạn cần đăng nhập.' };

  const targetHeadcount = Number(input.targetHeadcount);
  if (!input.workDate || !input.departmentId || !input.shiftId) {
    return { ok: false, error: 'Thiếu ngày, bộ phận hoặc ca làm việc.' };
  }
  if (!Number.isFinite(targetHeadcount) || targetHeadcount < 0) {
    return { ok: false, error: 'Định biên phải là số nguyên từ 0 trở lên.' };
  }

  try {
    const existing = await db
      .select({ id: dailyStaffingTargets.id })
      .from(dailyStaffingTargets)
      .where(
        and(
          eq(dailyStaffingTargets.workDate, input.workDate),
          eq(dailyStaffingTargets.departmentId, input.departmentId),
          eq(dailyStaffingTargets.shiftId, input.shiftId)
        )
      )
      .limit(1);

    const values = {
      workDate: input.workDate,
      departmentId: input.departmentId,
      shiftId: input.shiftId,
      targetHeadcount: Math.round(targetHeadcount),
      note: input.note?.trim() || null,
      updatedBy: userId
    };

    if (existing[0]?.id) {
      await db
        .update(dailyStaffingTargets)
        .set(values)
        .where(eq(dailyStaffingTargets.id, existing[0].id));
    } else {
      await db.insert(dailyStaffingTargets).values(values);
    }

    revalidatePath('/dashboard/attendance/staffing-tracking');
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Không thể lưu định biên.'
    };
  }
}

export async function deleteDailyStaffingTarget(id: string): Promise<Result> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Chỉ HR/Admin mới được xóa định biên ngày.' };
  }

  try {
    await db.delete(dailyStaffingTargets).where(eq(dailyStaffingTargets.id, id));
    revalidatePath('/dashboard/attendance/staffing-tracking');
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Không thể xóa định biên.'
    };
  }
}
