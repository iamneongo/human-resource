'use client';

import PageContainer from '@/components/layout/page-container';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';

export default function BillingPage() {
  return (
    <PageContainer pageTitle='Billing & Plans'>
      <div className='space-y-6'>
        <Alert>
          <Icons.info className='h-4 w-4' />
          <AlertDescription>
            Billing theo organization đã được tách khỏi ứng dụng trong giai đoạn migration xác thực.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Billing đang tạm tắt</CardTitle>
          </CardHeader>
          <CardContent className='text-muted-foreground max-w-2xl text-sm leading-6'>
            Trang này được giữ lại để không làm vỡ điều hướng cũ. Nếu cần tính phí theo workspace,
            bước tiếp theo nên nối cổng thanh toán riêng cho hệ thống.
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
