'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';

import type { CompanySummary } from '@/components/counter/counter-dashboard';
import { upsertCompany, type CompanyFormState, deleteCompany } from '@/app/(protected)/admin/company-actions';

const emptyForm = {
  id: '',
  name: '',
  code: '',
  contactName: '',
  contactPhone: '',
  businessNumber: '',
  address: '',
};

type FormValues = typeof emptyForm;

type AdminCompanyManagerProps = {
  companies: CompanySummary[];
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
    >
      {pending ? '저장 중...' : '저장하기'}
    </button>
  );
}

export function AdminCompanyManager({ companies }: AdminCompanyManagerProps) {
  const router = useRouter();
  const initialState: CompanyFormState = {};
  const [state, formAction] = useFormState(upsertCompany, initialState);
  const [formValues, setFormValues] = useState<FormValues>(emptyForm);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [isDeleting, startDeleting] = useTransition();

  useEffect(() => {
    if (state?.success) {
      setFormValues(emptyForm);
      router.refresh();
    }
  }, [state?.success, router]);

  const isEditing = !!formValues.id;

  const handleEdit = (company: CompanySummary) => {
    setFormValues({
      id: company.id,
      name: company.name,
      code: company.code,
      contactName: company.contactName ?? '',
      contactPhone: company.contactPhone ?? '',
      businessNumber: company.businessNumber ?? '',
      address: company.address ?? '',
    });
  };

  const sortedCompanies = useMemo(
    () => [...companies].sort((a, b) => a.name.localeCompare(b.name, 'ko')),
    [companies],
  );

  const handleDelete = (companyId: string) => {
    if (!window.confirm('회사를 삭제하면 관련 장부와 결제 정보가 모두 삭제됩니다. 계속하시겠습니까?')) {
      return;
    }

    startDeleting(async () => {
      const result = await deleteCompany(companyId);
      setDeleteMessage(result.error ?? result.success ?? null);
      router.refresh();
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">회사 {isEditing ? '수정' : '등록'}</h2>
        <p className="mt-1 text-sm text-slate-500">4자리 코드가 고유해야 합니다.</p>
        <form action={formAction} className="mt-4 space-y-4">
          <input type="hidden" name="id" value={formValues.id} />

          <div className="space-y-2">
            <label htmlFor="name" className="text-xs font-medium text-slate-600">
              회사명
            </label>
            <input
              id="name"
              name="name"
              value={formValues.name}
              onChange={(event) => setFormValues((prev) => ({ ...prev, name: event.target.value }))}
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="code" className="text-xs font-medium text-slate-600">
              회사 코드 (4자리)
            </label>
            <input
              id="code"
              name="code"
              value={formValues.code}
              onChange={(event) => setFormValues((prev) => ({ ...prev, code: event.target.value.trim() }))}
              maxLength={4}
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm tracking-widest"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="contactName" className="text-xs font-medium text-slate-600">
                담당자
              </label>
              <input
                id="contactName"
                name="contactName"
                value={formValues.contactName}
                onChange={(event) => setFormValues((prev) => ({ ...prev, contactName: event.target.value }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="contactPhone" className="text-xs font-medium text-slate-600">
                연락처
              </label>
              <input
                id="contactPhone"
                name="contactPhone"
                value={formValues.contactPhone}
                onChange={(event) => setFormValues((prev) => ({ ...prev, contactPhone: event.target.value }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="businessNumber" className="text-xs font-medium text-slate-600">
              사업자번호
            </label>
            <input
              id="businessNumber"
              name="businessNumber"
              value={formValues.businessNumber}
              onChange={(event) => setFormValues((prev) => ({ ...prev, businessNumber: event.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="address" className="text-xs font-medium text-slate-600">
              주소
            </label>
            <textarea
              id="address"
              name="address"
              rows={3}
              value={formValues.address}
              onChange={(event) => setFormValues((prev) => ({ ...prev, address: event.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          {state?.error ? <p className="text-sm text-rose-600">{state.error}</p> : null}
          {state?.success ? <p className="text-sm text-emerald-600">{state.success}</p> : null}

          <div className="flex items-center gap-2">
            <SubmitButton />
            {isEditing ? (
              <button
                type="button"
                onClick={() => setFormValues(emptyForm)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:border-slate-400 hover:text-slate-900"
              >
                새로 입력
              </button>
            ) : null}
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">등록된 회사</h2>
          <span className="text-sm text-slate-500">{companies.length}곳</span>
        </div>
        {deleteMessage ? (
          <p className="mt-3 rounded-md bg-slate-50 px-4 py-2 text-sm text-slate-600">{deleteMessage}</p>
        ) : null}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">회사명</th>
                <th className="px-3 py-2">코드</th>
                <th className="px-3 py-2">담당자</th>
                <th className="px-3 py-2 text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedCompanies.map((company) => (
                <tr key={company.id}>
                  <td className="px-3 py-2 font-medium text-slate-900">{company.name}</td>
                  <td className="px-3 py-2 font-mono text-slate-600">{company.code}</td>
                  <td className="px-3 py-2 text-slate-500">{company.contactName ?? '-'}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(company)}
                        className="rounded-md border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:border-slate-400 hover:text-slate-900"
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(company.id)}
                        disabled={isDeleting}
                        className="rounded-md border border-rose-200 px-3 py-1 text-xs text-rose-600 hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {sortedCompanies.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-sm text-slate-500">
                    등록된 회사가 없습니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
