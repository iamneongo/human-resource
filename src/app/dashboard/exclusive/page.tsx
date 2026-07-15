'use client';

import PageContainer from '@/components/layout/page-container';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';

export default function ExclusivePage() {
  return (
    <PageContainer>
      <div className='space-y-6'>
        <Alert>
          <Icons.lock className='h-5 w-5 text-yellow-600' />
          <AlertDescription>
            Cơ chế khóa tính năng theo gói dịch vụ đang tạm tắt. Route này hiện chỉ giữ lại để không
            làm hỏng điều hướng hiện có.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Khu vực tính năng mở rộng</CardTitle>
          </CardHeader>
          <CardContent className='text-muted-foreground text-sm leading-6'>
            Nếu cần bật lại giới hạn theo plan, chúng ta sẽ cài trên billing nội bộ hoặc quyền
            thương mại riêng trong bước triển khai tiếp theo.
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
