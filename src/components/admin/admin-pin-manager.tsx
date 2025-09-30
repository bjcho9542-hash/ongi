'use client';

import { useState, useTransition } from 'react';
import { useFormState, useFormStatus } from 'react-dom';

// Placeholder action functions - these need to be implemented
async function changePin(prevState: any, formData: FormData): Promise<any> {
  // TODO: Implement PIN change logic
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
  return { success: 'PIN이 성공적으로 변경되었습니다.' };
}

async function resetUserPin(userId: string): Promise<any> {
  // TODO: Implement PIN reset logic
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
  return { success: `사용자 PIN이 초기화되었습니다.` };
}

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
    >
      {pending ? '처리 중...' : children}
    </button>
  );
}

export function AdminPinManager() {
  const [activeTab, setActiveTab] = useState<'change' | 'reset'>('change');
  const [state, formAction] = useFormState(changePin, {});
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [isResetting, startResetting] = useTransition();

  // Mock users data - in real implementation, this would come from props or API
  const users = [
    { id: '1', name: '관리자', role: 'admin' },
    { id: '2', name: '카운터 직원 1', role: 'counter' },
    { id: '3', name: '카운터 직원 2', role: 'counter' },
  ];

  const handleResetPin = (userId: string, userName: string) => {
    if (!window.confirm(`${userName}의 PIN을 초기화하시겠습니까?`)) {
      return;
    }

    startResetting(async () => {
      try {
        const result = await resetUserPin(userId);
        setResetMessage(result.success ?? result.error ?? null);
      } catch (error) {
        setResetMessage('PIN 초기화에 실패했습니다.');
        console.error('Failed to reset PIN:', error);
      }
    });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900">PIN 관리</h2>
        <p className="mt-1 text-sm text-slate-500">사용자 PIN을 변경하거나 초기화할 수 있습니다.</p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-slate-200">
        <nav className="flex space-x-8">
          <button
            type="button"
            onClick={() => setActiveTab('change')}
            className={`border-b-2 pb-2 text-sm font-medium transition ${
              activeTab === 'change'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            PIN 변경
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reset')}
            className={`border-b-2 pb-2 text-sm font-medium transition ${
              activeTab === 'reset'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            PIN 초기화
          </button>
        </nav>
      </div>

      {activeTab === 'change' && (
        <div className="space-y-4">
          <form action={formAction} className="max-w-md space-y-4">
            <div className="space-y-2">
              <label htmlFor="currentPin" className="text-xs font-medium text-slate-600">
                현재 PIN
              </label>
              <input
                id="currentPin"
                name="currentPin"
                type="password"
                inputMode="numeric"
                maxLength={16}
                required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                placeholder="현재 PIN 입력"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="newPin" className="text-xs font-medium text-slate-600">
                새 PIN
              </label>
              <input
                id="newPin"
                name="newPin"
                type="password"
                inputMode="numeric"
                maxLength={16}
                required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                placeholder="새 PIN 입력 (4-16자)"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPin" className="text-xs font-medium text-slate-600">
                새 PIN 확인
              </label>
              <input
                id="confirmPin"
                name="confirmPin"
                type="password"
                inputMode="numeric"
                maxLength={16}
                required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                placeholder="새 PIN 다시 입력"
              />
            </div>

            {state?.error ? (
              <p className="text-sm text-rose-600">{state.error}</p>
            ) : null}
            {state?.success ? (
              <p className="text-sm text-emerald-600">{state.success}</p>
            ) : null}

            <SubmitButton>PIN 변경</SubmitButton>
          </form>
        </div>
      )}

      {activeTab === 'reset' && (
        <div className="space-y-4">
          <div className="rounded-lg bg-amber-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-amber-800">주의사항</h3>
                <div className="mt-2 text-sm text-amber-700">
                  <p>PIN을 초기화하면 해당 사용자는 다음 로그인 시 새로운 PIN을 설정해야 합니다.</p>
                </div>
              </div>
            </div>
          </div>

          {resetMessage ? (
            <div className="rounded-lg bg-emerald-50 p-4">
              <p className="text-sm text-emerald-700">{resetMessage}</p>
            </div>
          ) : null}

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-slate-900">사용자 목록</h3>
            <div className="space-y-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-3"
                >
                  <div>
                    <p className="font-medium text-slate-900">{user.name}</p>
                    <p className="text-sm text-slate-500">
                      {user.role === 'admin' ? '관리자' : '카운터 직원'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleResetPin(user.id, user.name)}
                    disabled={isResetting}
                    className="rounded-md border border-rose-300 px-3 py-1 text-sm text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isResetting ? '초기화 중...' : 'PIN 초기화'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}