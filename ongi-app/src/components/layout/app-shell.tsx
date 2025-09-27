import Link from 'next/link';

import type { SessionData } from '@/lib/auth/session';
import { LogoutButton } from '@/components/logout-button';

export function AppShell({ session, children }: { session: SessionData; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-8">
            <div className="space-y-1">
              <Link href="/" className="text-lg font-semibold text-slate-900">
                온기한식뷔페 장부
              </Link>
              <p className="text-xs text-slate-500">회사별 방문 인원 관리 및 결제</p>
            </div>
            <nav className="flex items-center gap-3 text-sm text-slate-600">
              <Link href="/" className="hover:text-slate-900">카운터</Link>
              {session.role === 'admin' ? (
                <Link href="/admin" className="hover:text-slate-900">관리자</Link>
              ) : null}
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <div className="text-right">
              <p className="font-medium text-slate-800">{session.name ?? '무기명 사용자'}</p>
              <p className="uppercase">{session.role === 'admin' ? 'ADMIN' : 'COUNTER'}</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
