'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';

import { login, type LoginState } from './actions';

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="w-full rounded-md bg-emerald-600 py-3 text-white font-semibold transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-400"
      disabled={pending || disabled}
    >
      {pending ? '확인 중...' : '로그인'}
    </button>
  );
}

type LoginUserOption = {
  id: string;
  name: string | null;
  role: 'admin' | 'counter';
  lockedUntil: string | null;
};

export function LoginForm({ users }: { users: LoginUserOption[] }) {
  const initialState: LoginState = {};
  const [state, formAction] = useFormState(login as any, initialState);
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedUserId, setSelectedUserId] = useState(() => users[0]?.id ?? '');

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (state?.error) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [state?.error]);

  useEffect(() => {
    if (!users.find((user) => user.id === selectedUserId)) {
      setSelectedUserId(users[0]?.id ?? '');
    }
  }, [users, selectedUserId]);

  const selectedUser = useMemo(() => users.find((user) => user.id === selectedUserId) ?? null, [users, selectedUserId]);
  const isLocked = useMemo(() => {
    if (!selectedUser?.lockedUntil) {
      return false;
    }
    return new Date(selectedUser.lockedUntil) > new Date();
  }, [selectedUser]);

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="userId" className="block text-sm font-medium text-slate-600">
          사용자
        </label>
        <select
          id="userId"
          name="userId"
          className="w-full rounded-md border border-slate-300 px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          value={selectedUserId}
          onChange={(event) => setSelectedUserId(event.target.value)}
          required
        >
          <option value="" disabled>사용자를 선택하세요</option>
          {users.map((user) => {
            const locked = user.lockedUntil && new Date(user.lockedUntil) > new Date();
            const label = `${user.name ?? '이름 미지정'} (${user.role === 'admin' ? '관리자' : '카운터'})${locked ? ' — 잠금 중' : ''}`;
            return (
              <option key={user.id} value={user.id} disabled={!!locked}>
                {label}
              </option>
            );
          })}
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="pin" className="block text-sm font-medium text-slate-600">
          PIN
        </label>
        <input
          id="pin"
          name="pin"
          ref={inputRef}
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={16}
          className="w-full rounded-md border border-slate-300 px-4 py-3 text-lg font-semibold tracking-widest text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          placeholder="****"
          required
        />
        {state?.error ? <p className="text-sm text-rose-600">{state.error}</p> : null}
        {isLocked ? (
          <p className="text-sm text-amber-600">
            이 사용자는 잠금 상태입니다. 잠금 해제 후 다시 시도해주세요.
          </p>
        ) : null}
      </div>
      <SubmitButton disabled={isLocked || !selectedUserId} />
    </form>
  );
}
