import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { betterAuth } from 'better-auth/minimal';
import { nextCookies } from 'better-auth/next-js';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { Resend } from 'resend';

import { db } from '@/db';
import { account, session, user, verification, workspaceInvitations } from '@/db/schema';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const PRODUCTION_CANONICAL_URL = 'https://human-resource.apps.neooi.com';
const LOCAL_TRUSTED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001'
];
const trustedOrigins = [
  PRODUCTION_CANONICAL_URL,
  'https://apps.neooi.com',
  ...LOCAL_TRUSTED_ORIGINS
];
const authBaseUrl =
  process.env.BETTER_AUTH_URL ??
  (process.env.NODE_ENV === 'production'
    ? PRODUCTION_CANONICAL_URL
    : (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'));
const authFromEmail = process.env.AUTH_FROM_EMAIL ?? 'onboarding@resend.dev';
const authSecret = process.env.BETTER_AUTH_SECRET ?? 'dev-only-secret-change-before-production';
const authRoles = new Set(['admin', 'hr', 'manager', 'employee']);

function isTrustedOrigin(origin: string | null) {
  return origin ? trustedOrigins.includes(origin) : false;
}

async function resolveTrustedOrigins(request?: Request | Headers) {
  const sourceHeaders = request instanceof Headers ? request : request?.headers;
  const originHeader = sourceHeaders?.get('origin') ?? null;
  const refererHeader = sourceHeaders?.get('referer') ?? null;

  let refererOrigin: string | null = null;
  if (refererHeader) {
    try {
      refererOrigin = new URL(refererHeader).origin;
    } catch {
      refererOrigin = null;
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    return trustedOrigins;
  }

  if (originHeader && !isTrustedOrigin(originHeader)) {
    console.warn(
      `[auth] Rejected origin candidate "${originHeader}". trustedOrigins=${trustedOrigins.join(', ')}`
    );
  } else if (!originHeader && refererOrigin && !isTrustedOrigin(refererOrigin)) {
    console.warn(
      `[auth] Rejected referer origin candidate "${refererOrigin}". trustedOrigins=${trustedOrigins.join(', ')}`
    );
  }

  return trustedOrigins;
}

export async function sendWorkspaceInviteEmail({
  email,
  role,
  inviterName,
  temporaryPassword
}: {
  email: string;
  role: string;
  inviterName?: string | null;
  temporaryPassword?: string | null;
}) {
  const inviteUrl = `${authBaseUrl}/auth/sign-in`;
  const inviterLabel = inviterName?.trim() || 'Quan tri he thong';

  if (!resend) {
    console.info(`[workspace:invite] ${email} role=${role} invitedBy=${inviterLabel}`);
    return;
  }

  await resend.emails.send({
    from: authFromEmail,
    to: email,
    subject: 'Loi moi tham gia workspace HRM',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827">
        <h2 style="margin:0 0 12px;font-size:20px">Ban duoc moi vao workspace HRM</h2>
        <p style="margin:0 0 16px;line-height:1.6">
          ${inviterLabel} da moi ban tham gia workspace quan ly nhan su voi vai tro <strong>${role}</strong>.
        </p>
        <p style="margin:0 0 20px;line-height:1.6">
          Tai khoan noi bo cua ban da duoc cap san. Dang nhap bang email tai khoan va mat khau tam thoi de vao workspace hien tai.
        </p>
        ${
          temporaryPassword
            ? `<div style="margin:0 0 20px;padding:16px 20px;background:#f3f4f6;border-radius:12px;line-height:1.8">
                <div><strong>Tai khoan:</strong> ${email}</div>
                <div><strong>Mat khau tam thoi:</strong> ${temporaryPassword}</div>
              </div>`
            : ''
        }
        <a
          href="${inviteUrl}"
          style="display:inline-block;padding:12px 18px;border-radius:12px;background:#1d4ed8;color:#ffffff;text-decoration:none;font-weight:600"
        >
          Mo man hinh dang nhap
        </a>
        <p style="margin:20px 0 0;color:#6b7280;line-height:1.6">
          Email dang duoc moi: <strong>${email}</strong>
        </p>
      </div>
    `
  });
}

export const auth = betterAuth({
  secret: authSecret,
  baseURL: authBaseUrl,
  trustedOrigins: async (request) => resolveTrustedOrigins(request),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 4,
    maxPasswordLength: 128
  },
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: { user, session, account, verification }
  }),
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        input: false
      }
    }
  },
  databaseHooks: {
    user: {
      create: {
        before: async (data) => {
          const normalizedEmail = data.email.trim().toLowerCase();
          const [invitation] = await db
            .select({
              role: workspaceInvitations.role
            })
            .from(workspaceInvitations)
            .where(eq(workspaceInvitations.email, normalizedEmail))
            .limit(1);

          const defaultName = data.name?.trim() || normalizedEmail.split('@')[0] || 'Nhan su';
          const invitedRole = invitation?.role?.trim().toLowerCase();

          if (invitation) {
            await db
              .update(workspaceInvitations)
              .set({
                status: 'accepted',
                acceptedAt: new Date()
              })
              .where(eq(workspaceInvitations.email, normalizedEmail));
          }

          return {
            data: {
              ...data,
              email: normalizedEmail,
              name: defaultName,
              role: invitedRole && authRoles.has(invitedRole) ? invitedRole : 'admin'
            }
          };
        }
      }
    }
  },
  plugins: [nextCookies()]
});

export type AuthSession = Awaited<ReturnType<typeof getAuthSession>>;
export type AuthUser = NonNullable<AuthSession>['user'];

export async function getAuthSession() {
  return auth.api.getSession({
    headers: await headers()
  });
}

export async function requireAuthSession() {
  const currentSession = await getAuthSession();
  if (!currentSession?.user?.id) {
    throw new Error('UNAUTHENTICATED');
  }
  return currentSession;
}

export async function requireAuthUserId() {
  const currentSession = await requireAuthSession();
  return currentSession.user.id;
}
