'use server';

import { desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { employees, timesheets } from '@/db/schema';
import { requireRole } from '@/lib/rbac';

export async function listTimesheets() {
  await requireRole('manager');
  return db
    .select({
      id: timesheets.id,
      workDate: timesheets.workDate,
      checkIn: timesheets.checkIn,
      checkOut: timesheets.checkOut,
      workedHours: timesheets.workedHours,
      lateMinutes: timesheets.lateMinutes,
      earlyLeaveMinutes: timesheets.earlyLeaveMinutes,
      status: timesheets.status,
      employeeName: employees.fullName
    })
    .from(timesheets)
    .leftJoin(employees, eq(timesheets.employeeId, employees.id))
    .orderBy(desc(timesheets.workDate))
    .limit(300);
}
