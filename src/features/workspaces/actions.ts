'use server';

import { randomUUID } from 'node:crypto';

import { revalidatePath } from 'next/cache';
import { and, asc, desc, eq } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';

import { db } from '@/db';
import { account, user, workspaceInvitations } from '@/db/schema';
import { getAuthSession, sendWorkspaceInviteEmail } from '@/lib/auth';
import { HRM_ROLES, isHrmRole, requireRole } from '@/lib/rbac';

type ActionResult<TData = void> = { ok: true; data?: TData } | { ok: false; error: string };

export type WorkspaceMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
};

export type WorkspaceInvitation = {
  id: string;
  email: string;
  role: string;
  status: 'pending' | 'accepted' | 'revoked';
  createdAt: Date;
  updatedAt: Date;
  acceptedAt: Date | null;
  memberId: string | null;
  memberName: string | null;
};

export type WorkspaceDirectory = {
  members: WorkspaceMember[];
  invitations: WorkspaceInvitation[];
  summary: {
    totalMembers: number;
    adminMembers: number;
    pendingInvitations: number;
    acceptedInvitations: number;
  };
};

function normalizeRole(value: string) {
  const normalized = value.trim().toLowerCase();
  return isHrmRole(normalized) ? normalized : null;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function getDisplayNameFromEmail(email: string) {
  const localPart = email.split('@')[0]?.trim();
  return localPart ? localPart.replace(/[._-]+/g, ' ') : 'Tai khoan noi bo';
}

export async function getWorkspaceDirectory(): Promise<WorkspaceDirectory> {
  await requireRole('admin');

  const [members, invitations] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      })
      .from(user)
      .orderBy(asc(user.name), asc(user.email)),
    db
      .select({
        id: workspaceInvitations.id,
        email: workspaceInvitations.email,
        role: workspaceInvitations.role,
        status: workspaceInvitations.status,
        createdAt: workspaceInvitations.createdAt,
        updatedAt: workspaceInvitations.updatedAt,
        acceptedAt: workspaceInvitations.acceptedAt
      })
      .from(workspaceInvitations)
      .orderBy(desc(workspaceInvitations.updatedAt))
  ]);

  const memberByEmail = new Map(
    members.map((member) => [normalizeEmail(member.email), member] as const)
  );

  const enrichedInvitations: WorkspaceInvitation[] = invitations.map((invitation) => {
    const matchedMember = memberByEmail.get(normalizeEmail(invitation.email));
    const derivedStatus =
      invitation.status === 'revoked' ? 'revoked' : matchedMember ? 'accepted' : 'pending';

    return {
      ...invitation,
      status: derivedStatus,
      acceptedAt:
        derivedStatus === 'accepted'
          ? (invitation.acceptedAt ?? matchedMember?.createdAt ?? null)
          : invitation.acceptedAt,
      memberId: matchedMember?.id ?? null,
      memberName: matchedMember?.name ?? null
    };
  });

  return {
    members,
    invitations: enrichedInvitations,
    summary: {
      totalMembers: members.length,
      adminMembers: members.filter((member) => member.role === 'admin').length,
      pendingInvitations: enrichedInvitations.filter((item) => item.status === 'pending').length,
      acceptedInvitations: enrichedInvitations.filter((item) => item.status === 'accepted').length
    }
  };
}

export async function inviteWorkspaceMember(
  values: Record<string, string>
): Promise<ActionResult<{ email: string; role: string; existingMember: boolean }>> {
  try {
    await requireRole('admin');
  } catch {
    return { ok: false, error: 'Chỉ admin mới được tạo tài khoản thành viên nội bộ.' };
  }

  const email = normalizeEmail(values.email ?? '');
  const role = normalizeRole(values.role ?? '');
  const temporaryPassword = values.temporaryPassword?.trim() ?? '';

  if (!email || !email.includes('@')) {
    return { ok: false, error: 'Vui lòng nhập đúng email tài khoản.' };
  }

  if (!role) {
    return {
      ok: false,
      error: `Vai trò không hợp lệ. Chỉ dùng: ${HRM_ROLES.join(', ')}.`
    };
  }

  if (temporaryPassword.length < 4) {
    return { ok: false, error: 'Mật khẩu tạm phải có ít nhất 4 ký tự.' };
  }

  const session = await getAuthSession();
  const inviterId = session?.user?.id ?? null;
  const inviterName = session?.user?.name ?? null;

  try {
    let [existingMember] = await db
      .select({
        id: user.id
      })
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (existingMember) {
      await db
        .update(user)
        .set({
          role,
          updatedAt: new Date()
        })
        .where(eq(user.id, existingMember.id));
    } else {
      const createdAt = new Date();
      const newUserId = randomUUID();
      await db.insert(user).values({
        id: newUserId,
        name: getDisplayNameFromEmail(email),
        email,
        emailVerified: true,
        role,
        createdAt,
        updatedAt: createdAt
      });
      existingMember = { id: newUserId };
    }

    const passwordHash = await hashPassword(temporaryPassword);
    const [existingPasswordAccount] = await db
      .select({ id: account.id })
      .from(account)
      .where(and(eq(account.userId, existingMember.id), eq(account.providerId, 'credential')))
      .limit(1);

    if (existingPasswordAccount) {
      await db
        .update(account)
        .set({
          accountId: email,
          providerId: 'credential',
          password: passwordHash,
          updatedAt: new Date()
        })
        .where(eq(account.id, existingPasswordAccount.id));
    } else {
      const createdAt = new Date();
      await db.insert(account).values({
        id: randomUUID(),
        accountId: email,
        providerId: 'credential',
        userId: existingMember.id,
        password: passwordHash,
        createdAt,
        updatedAt: createdAt
      });
    }

    const [existingInvitation] = await db
      .select({
        id: workspaceInvitations.id
      })
      .from(workspaceInvitations)
      .where(eq(workspaceInvitations.email, email))
      .limit(1);

    if (existingInvitation) {
      await db
        .update(workspaceInvitations)
        .set({
          role,
          status: 'accepted',
          invitedByUserId: inviterId,
          acceptedAt: new Date()
        })
        .where(eq(workspaceInvitations.id, existingInvitation.id));
    } else {
      await db.insert(workspaceInvitations).values({
        email,
        role,
        status: 'accepted',
        invitedByUserId: inviterId,
        acceptedAt: new Date()
      });
    }

    await sendWorkspaceInviteEmail({
      email,
      role,
      inviterName,
      temporaryPassword
    });

    revalidatePath('/dashboard/workspaces/team');
    return {
      ok: true,
      data: {
        email,
        role,
        existingMember: Boolean(existingMember)
      }
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Không thể tạo tài khoản thành viên nội bộ.'
    };
  }
}
