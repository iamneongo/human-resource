'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

import {
  inviteWorkspaceMember,
  revokeWorkspaceInvitation,
  type WorkspaceTeamData
} from '../actions';

const INVITATION_STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ tham gia',
  accepted: 'Đã tham gia',
  revoked: 'Đã hủy',
  expired: 'Hết hạn'
};

function roleLabel(role: string): string {
  if (role === 'org:admin') return 'Toàn quyền';
  if (role === 'org:member') return 'Thành viên';
  return role;
}

function statusLabel(status: string): string {
  return INVITATION_STATUS_LABELS[status] ?? status;
}

export function WorkspaceTeamPage({ data }: { data: WorkspaceTeamData }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [invitePending, startInvite] = useTransition();
  const [revokePendingId, setRevokePendingId] = useState<string | null>(null);

  const totals = useMemo(
    () => ({
      members: data.members.length,
      invitations: data.invitations.filter((item) => item.status === 'pending').length
    }),
    [data.invitations, data.members.length]
  );

  function handleInvite() {
    startInvite(async () => {
      const result = await inviteWorkspaceMember(email);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success('Đã gửi lời mời vào workspace hiện tại.');
      setEmail('');
      router.refresh();
    });
  }

  function handleRevoke(invitationId: string) {
    setRevokePendingId(invitationId);

    void revokeWorkspaceInvitation(invitationId).then((result) => {
      setRevokePendingId(null);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success('Đã hủy lời mời.');
      router.refresh();
    });
  }

  return (
    <div className='space-y-4'>
      <div className='grid gap-4 lg:grid-cols-[1.25fr_0.75fr]'>
        <Card>
          <CardHeader>
            <CardTitle>{data.organization.name}</CardTitle>
            <CardDescription>
              Mọi thành viên được mời vào workspace này sẽ dùng chung toàn bộ dữ liệu và không bị
              chặn module trong app.
            </CardDescription>
          </CardHeader>
          <CardContent className='grid gap-3 sm:grid-cols-3'>
            <div className='rounded-lg border p-4'>
              <div className='text-muted-foreground text-xs uppercase'>Thành viên</div>
              <div className='mt-2 text-2xl font-semibold'>{totals.members}</div>
            </div>
            <div className='rounded-lg border p-4'>
              <div className='text-muted-foreground text-xs uppercase'>Lời mời chờ</div>
              <div className='mt-2 text-2xl font-semibold'>{totals.invitations}</div>
            </div>
            <div className='rounded-lg border p-4'>
              <div className='text-muted-foreground text-xs uppercase'>Mã workspace</div>
              <div className='mt-2 truncate text-sm font-medium'>
                {data.organization.slug ?? '—'}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mời thành viên</CardTitle>
            <CardDescription>
              Lời mời luôn gắn vào đúng workspace hiện tại và gán quyền toàn bộ để dùng app ngay.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-3'>
            <Input
              type='email'
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder='ten@congty.com'
            />
            <Button isLoading={invitePending} onClick={handleInvite} className='w-full'>
              <Icons.send className='size-4' />
              Gửi lời mời
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách thành viên</CardTitle>
          <CardDescription>
            Thành viên trong workspace hiện tại đều xem và thao tác được tất cả dữ liệu của hệ
            thống.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thành viên</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Vai trò trong app</TableHead>
                <TableHead>Ngày tham gia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className='text-muted-foreground py-6 text-center'>
                    Chưa có thành viên nào trong workspace.
                  </TableCell>
                </TableRow>
              ) : (
                data.members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className='font-medium'>{member.fullName}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      <Badge variant='secondary'>{roleLabel(member.role)}</Badge>
                    </TableCell>
                    <TableCell>{member.joinedAt}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lời mời đang xử lý</CardTitle>
          <CardDescription>
            Dùng danh sách này để kiểm tra ai chưa vào được workspace hoặc cần gửi lại bằng email
            khác.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Quyền</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead className='text-right'>Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.invitations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className='text-muted-foreground py-6 text-center'>
                    Chưa có lời mời nào.
                  </TableCell>
                </TableRow>
              ) : (
                data.invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell className='font-medium'>{invitation.email}</TableCell>
                    <TableCell>
                      <Badge variant='outline'>{roleLabel(invitation.role)}</Badge>
                    </TableCell>
                    <TableCell>{statusLabel(invitation.status)}</TableCell>
                    <TableCell>{invitation.createdAt}</TableCell>
                    <TableCell className='text-right'>
                      {invitation.status === 'pending' ? (
                        <Button
                          size='sm'
                          variant='outline'
                          isLoading={revokePendingId === invitation.id}
                          onClick={() => handleRevoke(invitation.id)}
                        >
                          Hủy lời mời
                        </Button>
                      ) : (
                        <span className='text-muted-foreground text-xs'>Không cần thao tác</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
