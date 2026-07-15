/* eslint-disable no-console */
import 'dotenv/config';

import { randomUUID } from 'node:crypto';
import { and, asc, eq } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';

import { db } from '../src/db';
import { account, departments, employees, user } from '../src/db/schema';

const DEMO_EMAIL = 'hrdemo@local.test';
const DEMO_PASSWORD = '1234';
const DEMO_NAME = 'HR Demo';
const DEMO_ROLE = 'admin';
const DEMO_EMPLOYEE_CODE = 'HRDEMO';

async function ensureDemoUser() {
  const now = new Date();
  const [existingUser] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, DEMO_EMAIL))
    .limit(1);

  if (existingUser) {
    await db
      .update(user)
      .set({
        name: DEMO_NAME,
        role: DEMO_ROLE,
        emailVerified: true,
        updatedAt: now
      })
      .where(eq(user.id, existingUser.id));
    return existingUser.id;
  }

  const userId = randomUUID();
  await db.insert(user).values({
    id: userId,
    name: DEMO_NAME,
    email: DEMO_EMAIL,
    emailVerified: true,
    role: DEMO_ROLE,
    createdAt: now,
    updatedAt: now
  });
  return userId;
}

async function ensureDemoPasswordAccount(userId: string) {
  const now = new Date();
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const [existingAccount] = await db
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, 'credential')))
    .limit(1);

  if (existingAccount) {
    await db
      .update(account)
      .set({
        accountId: DEMO_EMAIL,
        providerId: 'credential',
        password: passwordHash,
        updatedAt: now
      })
      .where(eq(account.id, existingAccount.id));
    return;
  }

  await db.insert(account).values({
    id: randomUUID(),
    accountId: DEMO_EMAIL,
    providerId: 'credential',
    userId,
    password: passwordHash,
    createdAt: now,
    updatedAt: now
  });
}

async function ensureDemoEmployee(userId: string) {
  const now = new Date();
  const [existingEmployee] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.employeeCode, DEMO_EMPLOYEE_CODE))
    .limit(1);

  if (existingEmployee) {
    await db
      .update(employees)
      .set({
        fullName: DEMO_NAME,
        email: DEMO_EMAIL,
        status: 'active',
        authUserId: userId,
        updatedAt: now
      })
      .where(eq(employees.id, existingEmployee.id));
    return;
  }

  const [firstDepartment] = await db
    .select({ id: departments.id })
    .from(departments)
    .orderBy(asc(departments.code))
    .limit(1);

  await db.insert(employees).values({
    employeeCode: DEMO_EMPLOYEE_CODE,
    fullName: DEMO_NAME,
    email: DEMO_EMAIL,
    hireDate: now.toISOString().slice(0, 10),
    status: 'active',
    departmentId: firstDepartment?.id ?? null,
    authUserId: userId
  });
}

async function main() {
  const userId = await ensureDemoUser();
  await ensureDemoPasswordAccount(userId);
  await ensureDemoEmployee(userId);

  console.log('Demo account is ready:');
  console.log(`  account: hrdemo`);
  console.log(`  email:   ${DEMO_EMAIL}`);
  console.log(`  password:${DEMO_PASSWORD}`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
