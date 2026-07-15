import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { betterAuth } from 'better-auth/minimal';
import { nextCookies } from 'better-auth/next-js';
import { emailOTP } from 'better-auth/plugins';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { Resend } from 'resend';

import { db } from '@/db';
import { account, session, user, verification, workspaceInvitations } from '@/db/schema';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const authBaseUrl =
  process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
const authFromEmail = process.env.AUTH_FROM_EMAIL ?? 'onboarding@resend.dev';
const authSecret = process.env.BETTER_AUTH_SECRET ?? 'dev-only-secret-change-before-production';
const authRoles = new Set(['admin', 'hr', 'manager', 'employee']);

function formatOtpMail(
  type: 'sign-in' | 'email-verification' | 'forget-password' | 'change-email'
) {
  switch (type) {
    case 'email-verification':
      return {
        subject: 'Xac thuc email dang nhap HRM',
        heading: 'Xac thuc dia chi email',
        body: 'Nhap ma OTP duoi day de hoan tat xac thuc email tren he thong HRM.'
      };
    case 'forget-password':
      return {
        subject: 'Ma OTP khoi phuc truy cap HRM',
        heading: 'Khoi phuc truy cap',
        body: 'Nhap ma OTP duoi day de tiep tuc lay lai quyen truy cap tai khoan HRM.'
      };
    case 'change-email':
      return {
        subject: 'Ma OTP doi email HRM',
        heading: 'Xac nhan doi email',
        body: 'Nhap ma OTP duoi day de xac nhan thay doi email dang nhap HRM.'
      };
    default:
      return {
        subject: 'Ma OTP dang nhap HRM',
        heading: 'Dang nhap vao he thong HRM',
        body: 'Nhap ma OTP duoi day de dang nhap vao he thong quan ly nhan su.'
      };
  }
}

export async function sendWorkspaceInviteEmail({
  email,
  role,
  inviterName
}: {
  email: string;
  role: string;
  inviterName?: string | null;
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
          Dang nhap bang email nay de nhan OTP va vao ngay workspace hien tai. Neu tai khoan chua ton tai,
          he thong se tao tai khoan noi bo cho ban trong lan dang nhap dau tien.
        </p>
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
  plugins: [
    nextCookies(),
    emailOTP({
      expiresIn: 300,
      allowedAttempts: 5,
      sendVerificationOnSignUp: true,
      async sendVerificationOTP({ email, otp, type }) {
        const message = formatOtpMail(type);

        if (!resend) {
          console.info(`[auth:otp] ${email} ${type} OTP=${otp}`);
          return;
        }

        await resend.emails.send({
          from: authFromEmail,
          to: email,
          subject: message.subject,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827">
              <h2 style="margin:0 0 12px;font-size:20px">${message.heading}</h2>
              <p style="margin:0 0 16px;line-height:1.6">${message.body}</p>
              <div style="margin:20px 0;padding:16px 20px;background:#f3f4f6;border-radius:12px;font-size:28px;font-weight:700;letter-spacing:8px;text-align:center">
                ${otp}
              </div>
              <p style="margin:0;color:#6b7280;line-height:1.6">
                Ma co hieu luc trong 5 phut. Neu ban khong thuc hien yeu cau nay, co the bo qua email.
              </p>
            </div>
          `
        });
      }
    })
  ]
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
