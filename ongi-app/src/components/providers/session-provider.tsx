'use client';

import { createContext, useContext } from 'react';
import type { SessionData } from '@/lib/auth/session';

type SessionContextValue = SessionData | null;

const SessionContext = createContext<SessionContextValue>(null);

export function SessionProvider({ value, children }: { value: SessionData; children: React.ReactNode }) {
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const session = useContext(SessionContext);

  if (!session) {
    throw new Error('useSession must be used inside <SessionProvider>');
  }

  return session;
}
