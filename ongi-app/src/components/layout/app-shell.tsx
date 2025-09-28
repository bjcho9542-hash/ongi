import Link from 'next/link';

import type { SessionData } from '@/lib/auth/session';
import { LogoutButton } from '@/components/logout-button';

export function AppShell({ session, children }: { session: SessionData; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f7f9fb] via-[#f0f6f2] to-[#e6f2ea]">
      <header className="border-b border-[#d7efe2] bg-white/95 shadow-[0_12px_32px_-24px_rgba(3,199,90,0.4)] backdrop-blur-sm">
        <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <div className="space-y-1">
              <Link href="/counter" className="text-lg font-semibold text-slate-900">
                <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#03C75A] text-xs font-bold text-white">
                  ON
                </span>
                온기한식뷔페 장부
              </Link>
              <p className="text-xs text-slate-500">회사별 방문 인원 관리 및 결제</p>
            </div>
            <nav className="flex items-center gap-2 text-sm">
              <Link
                href="/counter"
                className="rounded-full px-3 py-1.5 font-medium text-slate-600 transition hover:bg-emerald-50 hover:text-[#03C75A]"
              >
                카운터
              </Link>
              {session.role === 'admin' ? (
                <Link
                  href="/admin"
                  className="rounded-full px-3 py-1.5 font-medium text-slate-600 transition hover:bg-emerald-50 hover:text-[#03C75A]"
                >
                  관리자
                </Link>
              ) : null}
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <div className="text-right">
              <p className="font-medium text-slate-800">{session.name ?? '무기명 사용자'}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#03C75A]">
                {session.role === 'admin' ? 'ADMIN' : 'COUNTER'}
              </p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10 lg:px-8">{children}</main>
    </div>
  );
}
