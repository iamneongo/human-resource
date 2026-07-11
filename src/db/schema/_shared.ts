import { sql } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/** Standard audit columns reused by every table. */
export const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())
};

/** Primary key helper: random UUID. */
export const id = () =>
  uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`);

/* ------------------------------------------------------------------ */
/* Organization structure (shared across HR-01..HR-05)                */
/* ------------------------------------------------------------------ */

export const departments = pgTable('departments', {
  id: id(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  parentId: uuid('parent_id'),
  costCenterId: uuid('cost_center_id'),
  ...timestamps
});

export const positions = pgTable('positions', {
  id: id(),
  code: text('code').notNull().unique(),
  title: text('title').notNull(),
  departmentId: uuid('department_id').references(() => departments.id),
  ...timestamps
});

export const costCenters = pgTable('cost_centers', {
  id: id(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  ...timestamps
});
