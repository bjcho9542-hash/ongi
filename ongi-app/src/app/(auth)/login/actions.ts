'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { compare } from 'bcryptjs';

import { createSession } from '@/lib/auth/session';
import { getServiceSupabaseClient } from '@/lib/supabase/service-client';

const loginSchema = z.object({
  userId: z.string().uuid('사용자를 선택해주세요.'),
  pin: z.string().min(4, 'PIN은 최소 4자리여야 합니다.').max(16, 'PIN은 16자 이하여야 합니다.'),
});

export type LoginState = {
  error?: string;
};

function formatLockMessage(lockedUntil: Date) {
  const now = new Date();
  const diffMs = lockedUntil.getTime() - now.getTime();

  if (diffMs <= 0) {
    return 'PIN이 올바르지 않습니다.';
  }

  const diffMinutes = Math.ceil(diffMs / 60000);
  return `잘못된 PIN 입력이 3회 이상 발생하여 로그인할 수 없습니다. 약 ${diffMinutes}분 후 다시 시도해주세요.`;
}

export async function login(_: LoginState, formData: FormData): Promise<LoginState | void> {
  const parseResult = loginSchema.safeParse({
    userId: formData.get('userId'),
    pin: formData.get('pin'),
  });

  if (!parseResult.success) {
    return {
      error: parseResult.error.issues[0]?.message ?? '입력값을 다시 확인해주세요.',
    };
  }

  const { userId, pin } = parseResult.data;
  const supabase = getServiceSupabaseClient();

  const { data: user, error } = await supabase
    .from('admin_user')
    .select('id, name, role, password_hash, failed_attempts, locked_until')
    .eq('id', userId)
    .maybeSingle();

  if (error || !user) {
    console.error('Failed to load admin_user record', error);
    return { error: '사용자 정보를 불러오지 못했습니다. 관리자에게 문의해주세요.' };
  }

  const now = new Date();
  const lockedUntil = user.locked_until ? new Date(user.locked_until) : null;

  if (lockedUntil && lockedUntil > now) {
    return { error: formatLockMessage(lockedUntil) };
  }

  if (!user.password_hash) {
    return { error: '사용자 PIN이 설정되어 있지 않습니다. 관리자에게 문의해주세요.' };
  }

  const matched = await compare(pin, user.password_hash);

  if (matched) {
    const { error: resetError } = await supabase
      .from('admin_user')
      .update({ failed_attempts: 0, locked_until: null })
      .eq('id', user.id);

    if (resetError) {
      console.error('Failed to reset login attempts', resetError);
    }

    await createSession({
      sub: user.id,
      role: user.role === 'admin' ? 'admin' : 'counter',
      name: user.name ?? null,
    });

    redirect('/');
  }

  const nextAttempts = (user.failed_attempts ?? 0) + 1;
  let message = 'PIN이 올바르지 않습니다.';
  let nextLockedUntil: string | null = null;
  let attemptsToPersist = nextAttempts;

  if (nextAttempts >= 3) {
    const lock = new Date(now.getTime() + 5 * 60 * 1000);
    nextLockedUntil = lock.toISOString();
    attemptsToPersist = 0;
    message = '잘못된 PIN이 3회 이상 입력되어 5분 동안 로그인할 수 없습니다.';
  }

  const { error: updateError } = await supabase
    .from('admin_user')
    .update({ failed_attempts: attemptsToPersist, locked_until: nextLockedUntil })
    .eq('id', user.id);

  if (updateError) {
    console.error('Failed to update login attempts', updateError);
  }

  return {
    error: message,
  };
}
