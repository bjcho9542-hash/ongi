'use client';

import { useTransition } from 'react';
import { logout } from '@/app/(protected)/actions';

export function LogoutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => logout())}
      className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:border-slate-400 hover:text-slate-900"
      disabled={pending}
    >
      {pending ? '로그아웃 중...' : '로그아웃'}
    </button>
  );
}
