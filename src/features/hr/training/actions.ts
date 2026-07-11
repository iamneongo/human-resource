'use server';

import { revalidatePath } from 'next/cache';
import { asc, desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import {
  careerPaths,
  courses,
  employees,
  enrollments,
  learningProgress,
  positions,
  trainingBudgets,
  trainingNeeds,
  trainingPlans
} from '@/db/schema';
import { requireRole } from '@/lib/rbac';

type Result = { ok: true } | { ok: false; error: string };

/* ------------------------------ TNA ------------------------------ */
const NEED_SOURCES = ['employee_request', 'manager_assessment', 'competency_gap'] as const;

export async function listNeeds() {
  await requireRole('manager');
  return db
    .select({
      id: trainingNeeds.id,
      topic: trainingNeeds.topic,
      source: trainingNeeds.source,
      priority: trainingNeeds.priority,
      employeeName: employees.fullName
    })
    .from(trainingNeeds)
    .leftJoin(employees, eq(trainingNeeds.employeeId, employees.id))
    .orderBy(desc(trainingNeeds.createdAt))
    .limit(200);
}

export async function createNeed(v: Record<string, string>): Promise<Result> {
  try {
    await requireRole('manager');
  } catch {
    return { ok: false, error: 'Không có quyền.' };
  }
  if (!v.topic || !v.source) return { ok: false, error: 'Thiếu thông tin bắt buộc.' };
  if (!NEED_SOURCES.includes(v.source as (typeof NEED_SOURCES)[number]))
    return { ok: false, error: 'Nguồn nhu cầu không hợp lệ.' };
  try {
    await db.insert(trainingNeeds).values({
      employeeId: v.employeeId || null,
      source: v.source as (typeof NEED_SOURCES)[number],
      topic: v.topic,
      description: v.description || null,
      priority: v.priority || 'medium'
    });
    revalidatePath('/dashboard/training/needs');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi' };
  }
}

/* --------------------------- Plans --------------------------- */
export async function listPlans() {
  await requireRole('manager');
  return db.select().from(trainingPlans).orderBy(desc(trainingPlans.year)).limit(100);
}

export async function planOptions() {
  await requireRole('hr');
  const rows = await db
    .select({ id: trainingPlans.id, name: trainingPlans.name })
    .from(trainingPlans)
    .orderBy(desc(trainingPlans.year));
  return rows.map((r) => ({ value: r.id, label: r.name }));
}

export async function createPlan(v: Record<string, string>): Promise<Result> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Không có quyền.' };
  }
  if (!v.name || !v.year) return { ok: false, error: 'Thiếu thông tin bắt buộc.' };
  try {
    await db.insert(trainingPlans).values({
      name: v.name,
      year: Number(v.year),
      startDate: v.startDate || null,
      endDate: v.endDate || null,
      estimatedCost: v.estimatedCost || null,
      note: v.note || null
    });
    revalidatePath('/dashboard/training/plans');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi' };
  }
}

/* --------------------------- Courses --------------------------- */
export async function listCourses() {
  await requireRole('manager');
  return db
    .select({
      id: courses.id,
      code: courses.code,
      name: courses.name,
      instructor: courses.instructor,
      isElearning: courses.isElearning,
      startDate: courses.startDate,
      cost: courses.cost,
      planName: trainingPlans.name
    })
    .from(courses)
    .leftJoin(trainingPlans, eq(courses.planId, trainingPlans.id))
    .orderBy(desc(courses.createdAt))
    .limit(200);
}

export async function courseOptions() {
  await requireRole('hr');
  const rows = await db
    .select({ id: courses.id, code: courses.code, name: courses.name })
    .from(courses)
    .orderBy(asc(courses.code));
  return rows.map((r) => ({ value: r.id, label: `${r.code} · ${r.name}` }));
}

export async function createCourse(v: Record<string, string>): Promise<Result> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Không có quyền.' };
  }
  if (!v.code || !v.name) return { ok: false, error: 'Thiếu thông tin bắt buộc.' };
  try {
    await db.insert(courses).values({
      code: v.code,
      name: v.name,
      planId: v.planId || null,
      instructor: v.instructor || null,
      isElearning: v.isElearning === 'true',
      materialsUrl: v.materialsUrl || null,
      startDate: v.startDate || null,
      endDate: v.endDate || null,
      cost: v.cost || null
    });
    revalidatePath('/dashboard/training/courses');
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Lỗi';
    if (msg.includes('code')) return { ok: false, error: 'Mã khóa học đã tồn tại.' };
    return { ok: false, error: msg };
  }
}

/* ------------------------- Enrollments ------------------------- */
export async function listEnrollments() {
  await requireRole('manager');
  return db
    .select({
      id: enrollments.id,
      type: enrollments.type,
      status: enrollments.status,
      courseName: courses.name,
      employeeName: employees.fullName
    })
    .from(enrollments)
    .leftJoin(courses, eq(enrollments.courseId, courses.id))
    .leftJoin(employees, eq(enrollments.employeeId, employees.id))
    .orderBy(desc(enrollments.createdAt))
    .limit(300);
}

export async function createEnrollment(v: Record<string, string>): Promise<Result> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Không có quyền.' };
  }
  if (!v.courseId || !v.employeeId)
    return { ok: false, error: 'Thiếu khóa học hoặc nhân viên.' };
  try {
    await db.insert(enrollments).values({
      courseId: v.courseId,
      employeeId: v.employeeId,
      type: v.type === 'mandatory' ? 'mandatory' : 'self_registered',
      status: 'enrolled'
    });
    revalidatePath('/dashboard/training/enrollments');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi' };
  }
}

/* --------------------------- Progress --------------------------- */
export async function listProgress() {
  await requireRole('manager');
  return db
    .select({
      id: learningProgress.id,
      attendanceRate: learningProgress.attendanceRate,
      completionRate: learningProgress.completionRate,
      examScore: learningProgress.examScore,
      satisfactionScore: learningProgress.satisfactionScore,
      courseName: courses.name,
      employeeName: employees.fullName
    })
    .from(learningProgress)
    .leftJoin(enrollments, eq(learningProgress.enrollmentId, enrollments.id))
    .leftJoin(courses, eq(enrollments.courseId, courses.id))
    .leftJoin(employees, eq(enrollments.employeeId, employees.id))
    .orderBy(desc(learningProgress.createdAt))
    .limit(300);
}

export async function enrollmentOptions() {
  await requireRole('hr');
  const rows = await db
    .select({
      id: enrollments.id,
      courseName: courses.name,
      employeeName: employees.fullName
    })
    .from(enrollments)
    .leftJoin(courses, eq(enrollments.courseId, courses.id))
    .leftJoin(employees, eq(enrollments.employeeId, employees.id))
    .orderBy(desc(enrollments.createdAt));
  return rows.map((r) => ({
    value: r.id,
    label: `${r.employeeName ?? '?'} · ${r.courseName ?? '?'}`
  }));
}

export async function upsertProgress(v: Record<string, string>): Promise<Result> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Không có quyền.' };
  }
  if (!v.enrollmentId) return { ok: false, error: 'Thiếu ghi danh.' };
  try {
    await db.insert(learningProgress).values({
      enrollmentId: v.enrollmentId,
      attendanceRate: v.attendanceRate || null,
      completionRate: v.completionRate || null,
      examScore: v.examScore || null,
      satisfactionScore: v.satisfactionScore || null,
      appliedAssessment: v.appliedAssessment || null
    });
    // Cập nhật trạng thái ghi danh khi hoàn thành.
    if (v.completionRate && Number(v.completionRate) >= 100) {
      await db
        .update(enrollments)
        .set({ status: 'completed' })
        .where(eq(enrollments.id, v.enrollmentId));
    }
    revalidatePath('/dashboard/training/progress');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi' };
  }
}

/* --------------------------- Budget --------------------------- */
export async function listBudgets() {
  await requireRole('hr');
  return db.select().from(trainingBudgets).orderBy(desc(trainingBudgets.year)).limit(50);
}

export async function createBudget(v: Record<string, string>): Promise<Result> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Không có quyền.' };
  }
  if (!v.year || !v.totalBudget) return { ok: false, error: 'Thiếu thông tin bắt buộc.' };
  try {
    await db.insert(trainingBudgets).values({
      year: Number(v.year),
      totalBudget: v.totalBudget,
      spent: v.spent || '0',
      note: v.note || null
    });
    revalidatePath('/dashboard/training/budget');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi' };
  }
}

/* ------------------------ Career paths ------------------------ */
export async function listCareerPaths() {
  await requireRole('manager');
  return db
    .select({
      id: careerPaths.id,
      minYears: careerPaths.minYears,
      requiredCourses: careerPaths.requiredCourses,
      description: careerPaths.description,
      toPositionTitle: positions.title
    })
    .from(careerPaths)
    .leftJoin(positions, eq(careerPaths.toPositionId, positions.id))
    .orderBy(desc(careerPaths.createdAt))
    .limit(200);
}

export async function createCareerPath(v: Record<string, string>): Promise<Result> {
  try {
    await requireRole('hr');
  } catch {
    return { ok: false, error: 'Không có quyền.' };
  }
  if (!v.toPositionId) return { ok: false, error: 'Thiếu vị trí đích.' };
  try {
    await db.insert(careerPaths).values({
      fromPositionId: v.fromPositionId || null,
      toPositionId: v.toPositionId,
      requiredCourses: v.requiredCourses || null,
      minYears: v.minYears || null,
      description: v.description || null
    });
    revalidatePath('/dashboard/training/career-paths');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi' };
  }
}
