'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

type ActionResult<TData = void> = { ok: true; data?: TData } | { ok: false; error: string };

export type WorkspaceMemberSummary = {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  role: string;
  joinedAt: string;
};

export type WorkspaceInvitationSummary = {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
};

export type WorkspaceTeamData = {
  organization: {
    id: string;
    name: string;
    slug: string | null;
    imageUrl: string | null;
    membersCount: number | null;
  };
  members: WorkspaceMemberSummary[];
  invitations: WorkspaceInvitationSummary[];
};

async function getWorkspaceContext() {
  const { userId, orgId } = await auth();

  if (!userId) {
    throw new Error('UNAUTHENTICATED');
  }

  if (!orgId) {
    throw new Error('NO_ORGANIZATION');
  }

  const client = await clerkClient();
  return { client, userId, orgId };
}

function formatDate(value: number | Date | null | undefined): string {
  if (!value) return 'Chưa có';
  const date = value instanceof Date ? value : new Date(value);

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

function normalizeError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message === 'NO_ORGANIZATION') {
      return 'Tài khoản này chưa có workspace đang hoạt động.';
    }

    if (error.message === 'UNAUTHENTICATED') {
      return 'Bạn cần đăng nhập lại để tiếp tục.';
    }

    return error.message;
  }

  return 'Có lỗi xảy ra. Vui lòng thử lại.';
}

export async function getWorkspaceTeamData(): Promise<WorkspaceTeamData | null> {
  try {
    const { client, orgId } = await getWorkspaceContext();
    const [organization, memberships, invitations] = await Promise.all([
      client.organizations.getOrganization({
        organizationId: orgId,
        includeMembersCount: true
      }),
      client.organizations.getOrganizationMembershipList({
        organizationId: orgId,
        limit: 100,
        orderBy: '+created_at'
      }),
      client.organizations.getOrganizationInvitationList({
        organizationId: orgId,
        limit: 100
      })
    ]);

    return {
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug ?? null,
        imageUrl: organization.hasImage ? organization.imageUrl : null,
        membersCount: organization.membersCount ?? null
      },
      members: memberships.data.map((membership) => ({
        id: membership.id,
        userId: membership.publicUserData?.userId ?? membership.id,
        fullName:
          [membership.publicUserData?.firstName, membership.publicUserData?.lastName]
            .filter(Boolean)
            .join(' ') ||
          membership.publicUserData?.identifier ||
          'Thành viên',
        email: membership.publicUserData?.identifier ?? 'Chưa có email',
        role: membership.role,
        joinedAt: formatDate(membership.createdAt)
      })),
      invitations: invitations.data.map((invitation) => ({
        id: invitation.id,
        email: invitation.emailAddress,
        role: invitation.role,
        status: invitation.status ?? 'pending',
        createdAt: formatDate(invitation.createdAt)
      }))
    };
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_ORGANIZATION') {
      return null;
    }

    throw error;
  }
}

export async function inviteWorkspaceMember(emailAddress: string): Promise<ActionResult> {
  try {
    const email = emailAddress.trim().toLowerCase();

    if (!email) {
      return { ok: false, error: 'Vui lòng nhập email thành viên.' };
    }

    const { client, orgId, userId } = await getWorkspaceContext();
    await client.organizations.createOrganizationInvitation({
      organizationId: orgId,
      emailAddress: email,
      role: 'org:admin',
      inviterUserId: userId,
      redirectUrl: '/dashboard/overview'
    });

    revalidatePath('/dashboard/workspaces');
    revalidatePath('/dashboard/workspaces/team');

    return { ok: true };
  } catch (error) {
    return { ok: false, error: normalizeError(error) };
  }
}

export async function revokeWorkspaceInvitation(invitationId: string): Promise<ActionResult> {
  try {
    if (!invitationId) {
      return { ok: false, error: 'Không tìm thấy lời mời cần hủy.' };
    }

    const { client, orgId, userId } = await getWorkspaceContext();
    await client.organizations.revokeOrganizationInvitation({
      organizationId: orgId,
      invitationId,
      requestingUserId: userId
    });

    revalidatePath('/dashboard/workspaces');
    revalidatePath('/dashboard/workspaces/team');

    return { ok: true };
  } catch (error) {
    return { ok: false, error: normalizeError(error) };
  }
}
