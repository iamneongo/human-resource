import { redirect } from 'next/navigation';

import { getAuthSession } from '@/lib/auth';

export default async function Dashboard() {
  const currentSession = await getAuthSession();

  if (!currentSession?.user?.id) {
    return redirect('/auth/sign-in');
  } else {
    redirect('/dashboard/overview');
  }
}
