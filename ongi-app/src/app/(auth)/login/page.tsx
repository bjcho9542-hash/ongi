import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { LoginForm } from './login-form';
import { getSession } from '@/lib/auth/session';
import { getServiceSupabaseClient } from '@/lib/supabase/service-client';

export const metadata: Metadata = {
  title: '로그인 | 온기 장부',
};

export default async function LoginPage() {
  const session = await getSession();

  if (session) {
    redirect('/');
  }

  const supabase = getServiceSupabaseClient();
  const { data: userRows, error } = await supabase
    .from('admin_user')
    .select('id, name, role, locked_until')
    .order('name', { ascending: true });

  if (error) {
    console.error('Failed to load admin_user list', error);
  }

  const users = (userRows ?? []).map((user) => ({
    id: user.id,
    name: user.name,
    role: user.role === 'admin' ? 'admin' : 'counter',
    lockedUntil: user.locked_until,
  }));

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-8 space-y-2 text-center">
          <h1 className="text-2xl font-bold text-slate-900">온기한식뷔페</h1>
          <p className="text-sm text-slate-500">테블릿 전용 장부 시스템</p>
        </div>
        {users.length > 0 ? (
          <LoginForm users={users} />
        ) : (
          <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
            등록된 사용자가 없습니다. Supabase의 admin_user 테이블에 계정을 추가한 뒤 다시 시도해주세요.
          </p>
        )}
      </div>
    </div>
  );
}
