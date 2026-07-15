'use server';

import { revalidatePath } from 'next/cache';
import { asc, desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { user, workspaceInvitations } from '@/db/schema';
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
    return { ok: false, error: 'Chỉ admin mới được mời thêm thành viên vào workspace.' };
  }

  const email = normalizeEmail(values.email ?? '');
  const role = normalizeRole(values.role ?? '');

  if (!email || !email.includes('@')) {
    return { ok: false, error: 'Vui lòng nhập đúng email thành viên.' };
  }

  if (!role) {
    return {
      ok: false,
      error: `Vai trò không hợp lệ. Chỉ dùng: ${HRM_ROLES.join(', ')}.`
    };
  }

  const session = await getAuthSession();
  const inviterId = session?.user?.id ?? null;
  const inviterName = session?.user?.name ?? null;

  try {
    const [existingMember] = await db
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
          role
        })
        .where(eq(user.id, existingMember.id));
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
          status: existingMember ? 'accepted' : 'pending',
          invitedByUserId: inviterId,
          acceptedAt: existingMember ? new Date() : null
        })
        .where(eq(workspaceInvitations.id, existingInvitation.id));
    } else {
      await db.insert(workspaceInvitations).values({
        email,
        role,
        status: existingMember ? 'accepted' : 'pending',
        invitedByUserId: inviterId,
        acceptedAt: existingMember ? new Date() : null
      });
    }

    await sendWorkspaceInviteEmail({
      email,
      role,
      inviterName
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
      error:
        error instanceof Error ? error.message : 'Không thể gửi lời mời thành viên vào workspace.'
    };
  }
}
