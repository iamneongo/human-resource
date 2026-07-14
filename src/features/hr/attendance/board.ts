'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { and, asc, desc, eq, gte, inArray, lte } from 'drizzle-orm';

import { db } from '@/db';
import {
  attendanceWeekLocks,
  departments,
  employees,
  leaveRequests,
  manualAttendanceAudits,
  manualAttendanceEntries,
  overtimeRequests,
  payrollRuns,
  positions,
  shifts,
  timesheets
} from '@/db/schema';
import { getCurrentEmployeeId, requireRole } from '@/lib/rbac';

export type AttendanceBoardShift = {
  id: string;
  code: string;
  name: string;
  standardHours: number;
};

export type AttendanceBoardCell = {
  morning: boolean;
  afternoon: boolean;
  source: 'timesheet' | 'manual' | 'empty';
  conflicts: string[];
  note: string | null;
};

export type AttendanceBoardEmployee = {
  id: string;
  employeeCode: string;
  fullName: string;
  departmentName: string | null;
  positionTitle: string | null;
  shiftId: string | null;
  shiftCode: string | null;
  shiftName: string | null;
  standardHours: number;
  cells: Record<string, AttendanceBoardCell>;
  conflictCount: number;
};

export type AttendanceBoardLock = {
  isLocked: boolean;
  lockedAt: string | null;
  lockedByPayroll: boolean;
  message: string | null;
};

export type AttendanceBoardData = {
  weekStart: string;
  weekEnd: string;
  weekDates: string[];
  shifts: AttendanceBoardShift[];
  employees: AttendanceBoardEmployee[];
  lock: AttendanceBoardLock;
};

export type SaveAttendanceBoardRowInput = {
  weekStart: string;
  employeeId: string;
  shiftId: string | null;
  cells: Record<
    string,
    Pick<AttendanceBoardCell, 'morning' | 'afternoon'> & { note?: string | null }
  >;
};

type Result = { ok: true } | { ok: false; error: string };

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getWeekStart(input?: string) {
  const base = input ? new Date(`${input}T00:00:00`) : new Date();
  if (Number.isNaN(base.getTime())) return getWeekStart();

  const day = base.getDay() || 7;
  base.setHours(0, 0, 0, 0);
  base.setDate(base.getDate() - day + 1);
  return base;
}

function getWeekDates(weekStartInput?: string) {
  const weekStart = getWeekStart(weekStartInput);
  const weekDates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return toIsoDate(date);
  });

  return {
    weekStart: weekDates[0]!,
    weekEnd: weekDates[6]!,
    weekDates
  };
}

function buildEmptyCells(weekDates: string[]) {
  return Object.fromEntries(
    weekDates.map((date) => [
      date,
      {
        morning: false,
        afternoon: false,
        source: 'empty' as const,
        conflicts: [],
        note: null
      }
    ])
  ) as Record<string, AttendanceBoardCell>;
}

function toNumber(value: string | number | null | undefined, fallback: number) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function normalizeCell(workedHours: string | null, standardHours: number): AttendanceBoardCell {
  const hours = workedHours ? Number(workedHours) : 0;
  if (!Number.isFinite(hours) || hours <= 0) {
    return { morning: false, afternoon: false, source: 'empty', conflicts: [], note: null };
  }

  if (hours >= standardHours - 0.01) {
    return { morning: true, afternoon: true, source: 'timesheet', conflicts: [], note: null };
  }

  return { morning: true, afternoon: false, source: 'timesheet', conflicts: [], note: null };
}

function getWeekPeriods(weekDates: string[]) {
  return Array.from(new Set(weekDates.map((date) => date.slice(0, 7))));
}

async function getAttendanceLockStatus(weekStart: string, weekEnd: string, weekDates: string[]) {
  const periods = getWeekPeriods(weekDates);
  const [manualLock, payrollLocks] = await Promise.all([
    db
      .select({
        id: attendanceWeekLocks.id,
        lockedAt: attendanceWeekLocks.lockedAt
      })
      .from(attendanceWeekLocks)
      .where(eq(attendanceWeekLocks.weekStart, weekStart))
      .limit(1),
    periods.length > 0
      ? db
          .select({
            id: payrollRuns.id,
            period: payrollRuns.period,
            status: payrollRuns.status,
            lockedAt: payrollRuns.lockedAt
          })
          .from(payrollRuns)
          .where(
            and(
              inArray(payrollRuns.period, periods),
              inArray(payrollRuns.status, ['locked', 'approved', 'paid'])
            )
          )
      : Promise.resolve([])
  ]);

  const manual = manualLock[0] ?? null;
  const payroll = payrollLocks[0] ?? null;
  if (payroll) {
    return {
      isLocked: true,
      lockedAt: payroll.lockedAt ? payroll.lockedAt.toISOString() : null,
      lockedByPayroll: true,
      message: `Tuần ${weekStart} - ${weekEnd} đã nằm trong kỳ lương ${payroll.period} (${payroll.status}).`
    } satisfies AttendanceBoardLock;
  }

  if (manual?.lockedAt) {
    return {
      isLocked: true,
      lockedAt: manual.lockedAt.toISOString(),
      lockedByPayroll: false,
      message: `Tuần ${weekStart} - ${weekEnd} đã được khóa công thủ công.`
    } satisfies AttendanceBoardLock;
  }

  return {
    isLocked: false,
    lockedAt: null,
    lockedByPayroll: false,
    message: null
  } satisfies AttendanceBoardLock;
}

function addConflict(conflicts: string[], message: string) {
  if (!conflicts.includes(message)) conflicts.push(message);
}

export async function getAttendanceBoardData(
  weekStartInput?: string
): Promise<AttendanceBoardData> {
  await requireRole('manager');

  const { weekStart, weekEnd, weekDates } = getWeekDates(weekStartInput);
  const lock = await getAttendanceLockStatus(weekStart, weekEnd, weekDates);

  const shiftRows = await db.select().from(shifts).orderBy(asc(shifts.code));
  const employeeRows = await db
    .select({
      id: employees.id,
      employeeCode: employees.employeeCode,
      fullName: employees.fullName,
      departmentName: departments.name,
      positionTitle: positions.title
    })
    .from(employees)
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .leftJoin(positions, eq(employees.positionId, positions.id))
    .where(inArray(employees.status, ['active', 'probation', 'on_leave']))
    .orderBy(asc(employees.employeeCode));

  const employeeIds = employeeRows.map((row) => row.id);
  const [timesheetRows, manualRows, otRows, leaveRows] = await Promise.all([
    employeeIds.length > 0
      ? db
          .select({
            id: timesheets.id,
            employeeId: timesheets.employeeId,
            workDate: timesheets.workDate,
            workedHours: timesheets.workedHours,
            shiftId: timesheets.shiftId,
            status: timesheets.status
          })
          .from(timesheets)
          .where(
            and(
              inArray(timesheets.employeeId, employeeIds),
              gte(timesheets.workDate, weekStart),
              lte(timesheets.workDate, weekEnd)
            )
          )
          .orderBy(desc(timesheets.workDate))
      : Promise.resolve([]),
    employeeIds.length > 0
      ? db
          .select({
            id: manualAttendanceEntries.id,
            employeeId: manualAttendanceEntries.employeeId,
            workDate: manualAttendanceEntries.workDate,
            shiftId: manualAttendanceEntries.shiftId,
            morning: manualAttendanceEntries.morning,
            afternoon: manualAttendanceEntries.afternoon,
            note: manualAttendanceEntries.note,
            updatedAt: manualAttendanceEntries.updatedAt
          })
          .from(manualAttendanceEntries)
          .where(
            and(
              inArray(manualAttendanceEntries.employeeId, employeeIds),
              gte(manualAttendanceEntries.workDate, weekStart),
              lte(manualAttendanceEntries.workDate, weekEnd)
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
              gte(overtimeRequests.workDate, weekStart),
              lte(overtimeRequests.workDate, weekEnd)
            )
          )
      : Promise.resolve([]),
    employeeIds.length > 0
      ? db
          .select({
            employeeId: leaveRequests.employeeId,
            startDate: leaveRequests.startDate,
            endDate: leaveRequests.endDate,
            type: leaveRequests.type
          })
          .from(leaveRequests)
          .where(
            and(
              inArray(leaveRequests.employeeId, employeeIds),
              eq(leaveRequests.status, 'approved'),
              lte(leaveRequests.startDate, weekEnd),
              gte(leaveRequests.endDate, weekStart)
            )
          )
      : Promise.resolve([])
  ]);

  const defaultShift = shiftRows.find((row) => row.type === 'office') ?? shiftRows[0] ?? null;
  const shiftMap = new Map(
    shiftRows.map((row) => [
      row.id,
      {
        id: row.id,
        code: row.code,
        name: row.name,
        standardHours: toNumber(row.standardHours, 8)
      }
    ])
  );

  const timesheetsByEmployee = new Map<string, typeof timesheetRows>();
  for (const row of timesheetRows) {
    const list = timesheetsByEmployee.get(row.employeeId) ?? [];
    list.push(row);
    timesheetsByEmployee.set(row.employeeId, list);
  }

  const manualByEmployeeDate = new Map<string, (typeof manualRows)[number]>();
  for (const row of manualRows) {
    manualByEmployeeDate.set(`${row.employeeId}:${row.workDate}`, row);
  }

  const otByEmployeeDate = new Set(otRows.map((row) => `${row.employeeId}:${row.workDate}`));

  const leaveByEmployeeDate = new Map<string, string[]>();
  for (const row of leaveRows) {
    const cursor = new Date(`${row.startDate}T00:00:00`);
    const end = new Date(`${row.endDate}T00:00:00`);
    while (cursor.getTime() <= end.getTime()) {
      const key = `${row.employeeId}:${toIsoDate(cursor)}`;
      const list = leaveByEmployeeDate.get(key) ?? [];
      list.push(row.type);
      leaveByEmployeeDate.set(key, list);
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  const boardEmployees = employeeRows.map((employee) => {
    const rows = timesheetsByEmployee.get(employee.id) ?? [];
    const firstManualShiftId = manualRows.find(
      (row) => row.employeeId === employee.id && row.shiftId
    )?.shiftId;
    const firstShiftId =
      firstManualShiftId ?? rows.find((row) => row.shiftId)?.shiftId ?? defaultShift?.id ?? null;
    const selectedShift = firstShiftId ? (shiftMap.get(firstShiftId) ?? null) : null;
    const standardHours = toNumber(selectedShift?.standardHours ?? defaultShift?.standardHours, 8);
    const cells = buildEmptyCells(weekDates);

    for (const row of rows) {
      if (!row.workDate || !cells[row.workDate]) continue;
      if (row.status === 'absent') continue;
      cells[row.workDate] = normalizeCell(row.workedHours, standardHours);
    }

    for (const date of weekDates) {
      const manual = manualByEmployeeDate.get(`${employee.id}:${date}`);
      if (manual) {
        cells[date] = {
          morning: manual.morning,
          afternoon: manual.afternoon,
          source: 'manual',
          conflicts: [],
          note: manual.note
        };
      }

      const conflicts: string[] = [];
      if (rows.some((row) => row.workDate === date))
        addConflict(conflicts, 'Có timesheet chi tiết');
      if (otByEmployeeDate.has(`${employee.id}:${date}`)) addConflict(conflicts, 'Có OT đã duyệt');
      const leaveTypes = leaveByEmployeeDate.get(`${employee.id}:${date}`) ?? [];
      for (const leaveType of leaveTypes) {
        addConflict(conflicts, `Có nghỉ phép ${leaveType}`);
      }
      if (manual && conflicts.length > 0) addConflict(conflicts, 'Đang dùng công thủ công');
      cells[date] = { ...cells[date], conflicts };
    }

    const conflictCount = Object.values(cells).reduce(
      (sum, cell) => sum + cell.conflicts.length,
      0
    );

    return {
      id: employee.id,
      employeeCode: employee.employeeCode,
      fullName: employee.fullName,
      departmentName: employee.departmentName,
      positionTitle: employee.positionTitle,
      shiftId: selectedShift?.id ?? null,
      shiftCode: selectedShift?.code ?? null,
      shiftName: selectedShift?.name ?? null,
      standardHours,
      cells,
      conflictCount
    };
  });

  return {
    weekStart,
    weekEnd,
    weekDates,
    shifts: shiftRows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      standardHours: toNumber(row.standardHours, 8)
    })),
    employees: boardEmployees,
    lock
  };
}

async function assertAttendanceWeekEditable(
  weekStart: string,
  weekEnd: string,
  weekDates: string[]
) {
  const lock = await getAttendanceLockStatus(weekStart, weekEnd, weekDates);
  if (lock.isLocked) {
    throw new Error(lock.message ?? 'Tuần công đã bị khóa.');
  }
}

export async function saveAttendanceBoardRow(input: SaveAttendanceBoardRowInput): Promise<Result> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Chỉ HR/Admin mới được cập nhật chấm công.' };
  }

  const { userId } = await auth();
  if (!userId) return { ok: false, error: 'Bạn cần đăng nhập.' };

  const actorEmployeeId = await getCurrentEmployeeId();
  const { weekStart, weekEnd, weekDates } = getWeekDates(input.weekStart);

  try {
    await assertAttendanceWeekEditable(weekStart, weekEnd, weekDates);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Tuần công đã bị khóa.' };
  }

  await db.transaction(async (tx) => {
    const existingRows = await tx
      .select({
        id: manualAttendanceEntries.id,
        workDate: manualAttendanceEntries.workDate
      })
      .from(manualAttendanceEntries)
      .where(
        and(
          eq(manualAttendanceEntries.employeeId, input.employeeId),
          gte(manualAttendanceEntries.workDate, weekStart),
          lte(manualAttendanceEntries.workDate, weekEnd)
        )
      );

    const byDate = new Map(existingRows.map((row) => [row.workDate, row.id]));

    for (const date of weekDates) {
      const cell = input.cells[date] ?? { morning: false, afternoon: false, note: null };
      const hasAny = Boolean(cell.morning || cell.afternoon);
      const existingId = byDate.get(date) ?? null;
      const note = cell.note?.trim() || null;

      if (!hasAny) {
        if (existingId) {
          await tx
            .delete(manualAttendanceEntries)
            .where(eq(manualAttendanceEntries.id, existingId));
          await tx.insert(manualAttendanceAudits).values({
            employeeId: input.employeeId,
            workDate: date,
            shiftId: input.shiftId,
            morning: false,
            afternoon: false,
            note,
            action: 'cleared',
            actorUserId: userId,
            actorEmployeeId
          });
        }
        continue;
      }

      const values = {
        employeeId: input.employeeId,
        workDate: date,
        shiftId: input.shiftId,
        morning: Boolean(cell.morning),
        afternoon: Boolean(cell.afternoon),
        source: 'manual' as const,
        note,
        updatedBy: userId
      };

      if (existingId) {
        await tx
          .update(manualAttendanceEntries)
          .set(values)
          .where(eq(manualAttendanceEntries.id, existingId));
      } else {
        await tx.insert(manualAttendanceEntries).values(values);
      }

      await tx.insert(manualAttendanceAudits).values({
        employeeId: input.employeeId,
        workDate: date,
        shiftId: input.shiftId,
        morning: Boolean(cell.morning),
        afternoon: Boolean(cell.afternoon),
        note,
        action: existingId ? 'updated' : 'created',
        actorUserId: userId,
        actorEmployeeId
      });
    }
  });

  revalidatePath('/dashboard/attendance/timesheets');
  return { ok: true };
}

export async function clearAttendanceBoardRow(
  weekStartInput: string,
  employeeId: string
): Promise<Result> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Chỉ HR/Admin mới được xóa chấm công.' };
  }

  const { userId } = await auth();
  if (!userId) return { ok: false, error: 'Bạn cần đăng nhập.' };
  const actorEmployeeId = await getCurrentEmployeeId();
  const { weekStart, weekEnd, weekDates } = getWeekDates(weekStartInput);

  try {
    await assertAttendanceWeekEditable(weekStart, weekEnd, weekDates);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Tuần công đã bị khóa.' };
  }

  await db.transaction(async (tx) => {
    const rows = await tx
      .select({
        id: manualAttendanceEntries.id,
        workDate: manualAttendanceEntries.workDate,
        shiftId: manualAttendanceEntries.shiftId,
        morning: manualAttendanceEntries.morning,
        afternoon: manualAttendanceEntries.afternoon,
        note: manualAttendanceEntries.note
      })
      .from(manualAttendanceEntries)
      .where(
        and(
          eq(manualAttendanceEntries.employeeId, employeeId),
          gte(manualAttendanceEntries.workDate, weekStart),
          lte(manualAttendanceEntries.workDate, weekEnd)
        )
      );

    for (const row of rows) {
      await tx.insert(manualAttendanceAudits).values({
        employeeId,
        workDate: row.workDate,
        shiftId: row.shiftId,
        morning: row.morning,
        afternoon: row.afternoon,
        note: row.note,
        action: 'cleared',
        actorUserId: userId,
        actorEmployeeId
      });
    }

    await tx
      .delete(manualAttendanceEntries)
      .where(
        and(
          eq(manualAttendanceEntries.employeeId, employeeId),
          gte(manualAttendanceEntries.workDate, weekStart),
          lte(manualAttendanceEntries.workDate, weekEnd)
        )
      );
  });

  revalidatePath('/dashboard/attendance/timesheets');
  return { ok: true };
}

export async function toggleAttendanceWeekLock(
  weekStartInput: string,
  nextLocked: boolean
): Promise<Result> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Chỉ HR/Admin mới được khóa tuần công.' };
  }

  const { userId } = await auth();
  if (!userId) return { ok: false, error: 'Bạn cần đăng nhập.' };

  const { weekStart, weekEnd, weekDates } = getWeekDates(weekStartInput);
  const currentLock = await getAttendanceLockStatus(weekStart, weekEnd, weekDates);
  if (currentLock.lockedByPayroll) {
    return { ok: false, error: currentLock.message ?? 'Tuần công đã khóa theo kỳ lương.' };
  }

  const [existing] = await db
    .select({ id: attendanceWeekLocks.id })
    .from(attendanceWeekLocks)
    .where(eq(attendanceWeekLocks.weekStart, weekStart))
    .limit(1);

  if (nextLocked) {
    if (existing) {
      await db
        .update(attendanceWeekLocks)
        .set({
          weekEnd,
          lockedAt: new Date(),
          lockedBy: userId
        })
        .where(eq(attendanceWeekLocks.id, existing.id));
    } else {
      await db.insert(attendanceWeekLocks).values({
        weekStart,
        weekEnd,
        lockedAt: new Date(),
        lockedBy: userId
      });
    }
  } else if (existing) {
    await db
      .update(attendanceWeekLocks)
      .set({
        lockedAt: null,
        lockedBy: null
      })
      .where(eq(attendanceWeekLocks.id, existing.id));
  }

  revalidatePath('/dashboard/attendance/timesheets');
  return { ok: true };
}
