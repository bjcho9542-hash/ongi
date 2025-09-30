import { redirect } from 'next/navigation';

import { SessionProvider } from '@/components/providers/session-provider';
import { AppShell } from '@/components/layout/app-shell';
import { getSession } from '@/lib/auth/session';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <SessionProvider value={session}>
      <AppShell session={session}>{children}</AppShell>
    </SessionProvider>
  );
}
