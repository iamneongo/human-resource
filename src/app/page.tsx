import { redirect } from 'next/navigation';

import { getAuthSession } from '@/lib/auth';

export default async function Page() {
  const currentSession = await getAuthSession();

  if (!currentSession?.user?.id) {
    return redirect('/auth/sign-in');
  } else {
    redirect('/dashboard/overview');
  }
}
