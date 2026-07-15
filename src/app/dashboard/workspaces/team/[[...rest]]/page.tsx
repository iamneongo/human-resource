import PageContainer from '@/components/layout/page-container';
import { teamInfoContent } from '@/config/infoconfig';
import { getWorkspaceTeamData } from '@/features/workspaces/actions';
import { WorkspaceTeamPage } from '@/features/workspaces/components/workspace-team-page';

export default async function TeamPage() {
  const data = await getWorkspaceTeamData();

  return (
    <PageContainer
      pageTitle='Thành viên workspace'
      pageDescription='Mời thành viên mới vào đúng workspace hiện tại, theo dõi lời mời và đảm bảo mọi người dùng chung toàn bộ dữ liệu.'
      infoContent={teamInfoContent}
      access={!!data}
      accessFallback={
        <div className='text-muted-foreground max-w-xl text-center text-base'>
          Tài khoản này chưa có workspace đang hoạt động. Hãy đăng nhập bằng tài khoản đã được mời
          vào tổ chức hiện tại.
        </div>
      }
    >
      {data ? <WorkspaceTeamPage data={data} /> : <div />}
    </PageContainer>
  );
}
