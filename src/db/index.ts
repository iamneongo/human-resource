import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

// Neon serverless works over the pooled connection string. `prepare: false`
// is required when using the pgbouncer transaction pooler.
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });

export type DB = typeof db;
