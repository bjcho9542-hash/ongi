import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const session = await getSession();

  if (session) {
    redirect('/counter');
  }

  redirect('/login');
}
