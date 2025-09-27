'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import clsx from 'clsx';
import { useFormState, useFormStatus } from 'react-dom';

import { useSession } from '@/components/providers/session-provider';
import { createEntry, type CreateEntryState } from '@/app/(protected)/entry-actions';
import {
  preparePayment,
  completePayment,
  type CompletePaymentState,
  type PaymentPreparationResult,
} from '@/app/(protected)/payment-actions';

export type CompanySummary = {
  id: string;
  name: string;
  code: string;
  contactName: string | null;
  contactPhone: string | null;
  businessNumber: string | null;
  address: string | null;
};

export type LedgerEntry = {
  id: string;
  companyId: string;
  companyName: string;
  companyCode: string;
  entryDate: string;
  count: number;
  signer: string | null;
  isPaid: boolean;
  paymentId: string | null;
};

export type PaymentSummary = {
  id: string;
  companyId: string;
  fromDate: string;
  toDate: string;
  totalCount: number;
  totalAmount: number;
  unitPrice: number;
  paidAt: string | null;
  receiptUrl: string | null;
};

type CounterDashboardProps = {
  companies: CompanySummary[];
  entries: LedgerEntry[];
  payments: PaymentSummary[];
  selectedYear: number;
  selectedMonth: number; // 1-12
};

const visitorOptions = Array.from({ length: 20 }, (_, index) => index + 1);

function MonthSelector({
  year,
  month,
}: {
  year: number;
  month: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [yearValue, setYearValue] = useState(year);
  const [monthValue, setMonthValue] = useState(month);

  useEffect(() => {
    setYearValue(year);
  }, [year]);

  useEffect(() => {
    setMonthValue(month);
  }, [month]);

  const handleChange = (nextYear: number, nextMonth: number) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.set('year', String(nextYear));
    params.set('month', String(nextMonth));
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-3">
      <select
        className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        value={yearValue}
        onChange={(event) => {
          const nextYear = Number(event.target.value);
          setYearValue(nextYear);
          handleChange(nextYear, monthValue);
        }}
      >
        {Array.from({ length: 5 }, (_, index) => year - 2 + index).map((optionYear) => (
          <option key={optionYear} value={optionYear}>
            {optionYear}년
          </option>
        ))}
      </select>
      <select
        className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        value={monthValue}
        onChange={(event) => {
          const nextMonth = Number(event.target.value);
          setMonthValue(nextMonth);
          handleChange(yearValue, nextMonth);
        }}
      >
        {Array.from({ length: 12 }, (_, index) => index + 1).map((optionMonth) => (
          <option key={optionMonth} value={optionMonth}>
            {optionMonth}월
          </option>
        ))}
      </select>
    </div>
  );
}

function SummaryCards({ entries }: { entries: LedgerEntry[] }) {
  const totalVisitors = entries.reduce((sum, entry) => sum + entry.count, 0);
  const unpaidVisitors = entries
    .filter((entry) => !entry.isPaid)
    .reduce((sum, entry) => sum + entry.count, 0);
  const totalEntries = entries.length;
  const uniqueCompanies = new Set(entries.map((entry) => entry.companyId)).size;

  const summaries = [
    { label: '총 방문 인원', value: `${totalVisitors.toLocaleString()}명` },
    { label: '미결제 인원', value: `${unpaidVisitors.toLocaleString()}명` },
    { label: '등록 횟수', value: `${totalEntries.toLocaleString()}건` },
    { label: '이용 기업', value: `${uniqueCompanies.toLocaleString()}곳` },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {summaries.map((item) => (
        <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">{item.label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function EntryForm({
  companies,
  selectedCompanyId,
  setSelectedCompanyId,
  codeInput,
  setCodeInput,
  entryDate,
  setEntryDate,
  count,
  setCount,
  signer,
  setSigner,
  onSuccess,
}: {
  companies: CompanySummary[];
  selectedCompanyId: string | null;
  setSelectedCompanyId: (value: string) => void;
  codeInput: string;
  setCodeInput: (value: string) => void;
  entryDate: string;
  setEntryDate: (value: string) => void;
  count: number;
  setCount: (value: number) => void;
  signer: string;
  setSigner: (value: string) => void;
  onSuccess: () => void;
}) {
  const selectedCompany = companies.find((company) => company.id === selectedCompanyId);
  const initialState: CreateEntryState = {};
  const [state, formAction] = useFormState(createEntry, initialState);
  const isCodeValid = !!selectedCompany && codeInput === selectedCompany.code;

  useEffect(() => {
    if (state?.success) {
      onSuccess();
    }
  }, [state?.success, onSuccess]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">인원 등록</h2>
      <p className="mt-1 text-sm text-slate-500">회사 선택 후 4자리 코드를 입력하면 등록이 활성화됩니다.</p>
      <form action={formAction} className="mt-6 space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-600">회사 선택</label>
          <select
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            value={selectedCompanyId ?? ''}
            onChange={(event) => {
              setSelectedCompanyId(event.target.value);
              setCodeInput('');
            }}
            required
            name="companySelect"
          >
            <option value="" disabled>
              회사를 선택하세요
            </option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="code" className="text-sm font-medium text-slate-600">
            회사 코드 (4자리)
          </label>
          <input
            id="code"
            type="password"
            inputMode="numeric"
            maxLength={4}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-lg tracking-widest"
            value={codeInput}
            onChange={(event) => setCodeInput(event.target.value.trim())}
            placeholder="0000"
            required
          />
          {selectedCompanyId && !isCodeValid ? (
            <p className="text-xs text-rose-600">회사 코드가 일치하지 않습니다.</p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="entryDate" className="text-sm font-medium text-slate-600">
              날짜
            </label>
            <input
              id="entryDate"
              name="entryDate"
              type="date"
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              value={entryDate}
              onChange={(event) => setEntryDate(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="count" className="text-sm font-medium text-slate-600">
              방문 인원
            </label>
            <select
              id="count"
              name="count"
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              value={count}
              onChange={(event) => setCount(Number(event.target.value))}
              required
            >
              {visitorOptions.map((option) => (
                <option key={option} value={option}>
                  {option}명
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="signer" className="text-sm font-medium text-slate-600">
            서명자 (선택)
          </label>
          <input
            id="signer"
            name="signer"
            type="text"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            value={signer}
            onChange={(event) => setSigner(event.target.value)}
            placeholder="홍길동"
          />
        </div>

        <input type="hidden" name="companyId" value={selectedCompanyId ?? ''} />
        <input type="hidden" name="code" value={codeInput} />

        {state?.error ? <p className="text-sm text-rose-600">{state.error}</p> : null}
        {state?.success ? <p className="text-sm text-emerald-600">{state.success}</p> : null}

        <button
          type="submit"
          className="w-full rounded-md bg-emerald-600 py-3 text-white font-semibold transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-300"
          disabled={!selectedCompany || !isCodeValid}
        >
          등록하기
        </button>
      </form>
    </div>
  );
}

type EntryGroup = {
  date: string;
  entries: LedgerEntry[];
};

function groupEntries(entries: LedgerEntry[]): EntryGroup[] {
  const map = new Map<string, LedgerEntry[]>();

  for (const entry of entries) {
    const list = map.get(entry.entryDate) ?? [];
    list.push(entry);
    map.set(entry.entryDate, list);
  }

  return Array.from(map.entries())
    .map(([date, groupedEntries]) => ({
      date,
      entries: groupedEntries.sort((a, b) => a.companyName.localeCompare(b.companyName, 'ko')),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function LedgerTable({
  entries,
  payments,
  selectedEntryIds,
  setSelectedEntryIds,
  selectedEntries,
  canProceedPayment,
  onRequestPayment,
  paymentHint,
}: {
  entries: LedgerEntry[];
  payments: PaymentSummary[];
  selectedEntryIds: string[];
  setSelectedEntryIds: (ids: string[]) => void;
  selectedEntries: LedgerEntry[];
  canProceedPayment: boolean;
  onRequestPayment: () => void;
  paymentHint: string | null;
}) {
  const grouped = useMemo(() => groupEntries(entries), [entries]);

  const toggleEntry = (id: string) => {
    setSelectedEntryIds(
      selectedEntryIds.includes(id)
        ? selectedEntryIds.filter((entryId) => entryId !== id)
        : [...selectedEntryIds, id],
    );
  };

  const selectAll = () => {
    const unpaidIds = entries.filter((entry) => !entry.isPaid).map((entry) => entry.id);
    setSelectedEntryIds(unpaidIds);
  };

  const clearAll = () => setSelectedEntryIds([]);

  const pendingCount = selectedEntries.reduce((sum, entry) => sum + entry.count, 0);

  const paymentLookup = useMemo(() => {
    const map = new Map<string, PaymentSummary>();
    for (const payment of payments) {
      map.set(payment.id, payment);
    }
    return map;
  }, [payments]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">장부 내역</h2>
          <p className="text-sm text-slate-500">선택 후 결제 처리 시, 결제 완료 항목은 회색과 취소선으로 표시됩니다.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={selectAll}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:border-slate-400"
          >
            전체선택
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:border-slate-400"
          >
            전체해제
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-slate-200">
        {grouped.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">등록된 장부가 없습니다.</p>
        ) : (
          <div className="divide-y divide-slate-200">
            {grouped.map((group) => (
              <div key={group.date} className="bg-white">
                <div className="bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600">
                  {format(parseISO(group.date), 'yyyy년 M월 d일 (EEE)', { locale: ko })}
                </div>
                <ul className="divide-y divide-slate-100">
                  {group.entries.map((entry) => {
                    const isSelected = selectedEntryIds.includes(entry.id);
                    const payment = entry.paymentId ? paymentLookup.get(entry.paymentId) : null;
                    return (
                      <li
                        key={entry.id}
                        className={clsx('flex items-center gap-4 px-4 py-3 transition', {
                          'bg-slate-100 line-through text-slate-400': entry.isPaid,
                          'bg-emerald-50': isSelected && !entry.isPaid,
                        })}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleEntry(entry.id)}
                          disabled={entry.isPaid}
                          className="h-4 w-4"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">
                            {entry.companyName}{' '}
                            <span className="text-xs text-slate-500">({entry.count}명)</span>
                          </p>
                          {entry.signer ? (
                            <p className="text-sm text-slate-500">서명자: {entry.signer}</p>
                          ) : null}
                        </div>
                        {entry.isPaid ? (
                          <div className="text-right text-xs text-slate-500">
                            <p>결제완료</p>
                            {payment ? (
                              <p>{format(parseISO(payment.paidAt ?? payment.toDate), 'M/d')} 결제</p>
                            ) : null}
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
        <div>
          선택된 항목: <span className="font-semibold text-slate-900">{selectedEntries.length}</span>건 / 총{' '}
          <span className="font-semibold text-slate-900">{pendingCount}</span>명
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          {paymentHint ? <p className="text-xs text-rose-600">{paymentHint}</p> : null}
          <button
            type="button"
            onClick={onRequestPayment}
            disabled={!canProceedPayment}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            결제 진행
          </button>
        </div>
      </div>
    </div>
  );
}

function CompanySidebar({
  companies,
  entries,
  selectedCompanyId,
  setSelectedCompanyId,
}: {
  companies: CompanySummary[];
  entries: LedgerEntry[];
  selectedCompanyId: string | null;
  setSelectedCompanyId: (value: string) => void;
}) {
  const [search, setSearch] = useState('');

  const stats = useMemo(() => {
    const map = new Map<string, { visits: number; count: number }>();
    for (const entry of entries) {
      const current = map.get(entry.companyId) ?? { visits: 0, count: 0 };
      current.visits += 1;
      current.count += entry.count;
      map.set(entry.companyId, current);
    }
    return map;
  }, [entries]);

  const filteredCompanies = useMemo(() => {
    if (!search.trim()) {
      return companies;
    }
    const lower = search.trim().toLowerCase();
    return companies.filter((company) => company.name.toLowerCase().includes(lower));
  }, [companies, search]);

  return (
    <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">회사 목록</h2>
        <span className="text-sm text-slate-500">{companies.length}곳</span>
      </div>
      <input
        type="search"
        placeholder="회사명 검색"
        className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <ul className="mt-3 max-h-[420px] space-y-2 overflow-y-auto pr-2">
        {filteredCompanies.map((company) => {
          const stat = stats.get(company.id);
          return (
            <li key={company.id}>
              <button
                type="button"
                onClick={() => setSelectedCompanyId(company.id)}
                className={clsx(
                  'w-full rounded-lg border px-3 py-3 text-left transition hover:border-emerald-400',
                  selectedCompanyId === company.id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white',
                )}
              >
                <p className="font-medium text-slate-900">{company.name}</p>
                <p className="text-xs text-slate-500">
                  {stat ? `${stat.count.toLocaleString()}명 / ${stat.visits}회` : '이번 달 등록 없음'}
                </p>
              </button>
            </li>
          );
        })}
        {filteredCompanies.length === 0 ? (
          <li className="rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-sm text-slate-500">
            검색 결과가 없습니다.
          </li>
        ) : null}
      </ul>
    </aside>
  );
}

function PaymentSubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-300"
    >
      {pending ? '처리 중...' : '결제 완료'}
    </button>
  );
}

type PaymentModalProps = {
  open: boolean;
  onClose: () => void;
  entryIds: string[];
  entries: LedgerEntry[];
  onSuccess: (message: string) => void;
};

function PaymentModal({ open, onClose, entryIds, entries, onSuccess }: PaymentModalProps) {
  const [isPreparing, startPreparing] = useTransition();
  const [defaults, setDefaults] = useState<PaymentPreparationResult | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [toDate, setToDate] = useState('');
  const [unitPrice, setUnitPrice] = useState(8000);
  const initialState: CompletePaymentState = {};
  const [state, formAction] = useFormState(completePayment, initialState);

  const entryKey = useMemo(() => entryIds.slice().sort().join(','), [entryIds]);

  useEffect(() => {
    if (!open) {
      setDefaults(null);
      setFetchError(null);
      setToDate('');
      setUnitPrice(8000);
      return;
    }

    startPreparing(async () => {
      try {
        const result = await preparePayment(entryIds);
        setDefaults(result);
        setToDate(result.toDate);
        setUnitPrice(result.unitPrice);
        setFetchError(null);
      } catch (error) {
        console.error(error);
        setFetchError(error instanceof Error ? error.message : '결제 정보를 불러오지 못했습니다.');
      }
    });
  }, [open, entryKey, entryIds, startPreparing]);

  useEffect(() => {
    if (state?.success) {
      onSuccess(state.success);
    }
  }, [state?.success, onSuccess]);

  const totalCount = defaults?.totalCount ?? entries.reduce((sum, entry) => sum + entry.count, 0);
  const totalAmount = totalCount * unitPrice;
  const cannotSubmit = isPreparing || !defaults || !!fetchError;

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">결제 처리</h3>
            {defaults ? (
              <p className="text-sm text-slate-500">{defaults.companyName} — {defaults.totalCount}명</p>
            ) : null}
          </div>
          <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-900">
            닫기
          </button>
        </div>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto px-6 py-4">
          {fetchError ? (
            <p className="rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-600">{fetchError}</p>
          ) : null}
          <div className="rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <p>선택된 장부 {entries.length}건 / 총 {totalCount}명</p>
            <ul className="mt-2 space-y-1 text-xs">
              {entries.map((entry) => (
                <li key={entry.id}>
                  {format(parseISO(entry.entryDate), 'M월 d일')} — {entry.companyName} ({entry.count}명)
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-200 px-6 py-4">
          <form action={formAction} encType="multipart/form-data" className="space-y-4">
            {entryIds.map((id) => (
              <input key={id} type="hidden" name="entryIds" value={id} />
            ))}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-600">시작일</label>
                <input
                  type="text"
                  value={defaults?.fromDate ?? ''}
                  readOnly
                  className="w-full rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="toDate" className="text-xs font-medium text-slate-600">
                  종료일
                </label>
                <input
                  id="toDate"
                  name="toDate"
                  type="date"
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="unitPrice" className="text-xs font-medium text-slate-600">
                  단가 (원)
                </label>
                <input
                  id="unitPrice"
                  name="unitPrice"
                  type="number"
                  min={0}
                  value={unitPrice}
                  onChange={(event) => setUnitPrice(Number(event.target.value))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-600">합계</label>
                <input
                  type="text"
                  value={`${totalAmount.toLocaleString()}원`}
                  readOnly
                  className="w-full rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="receipt" className="text-xs font-medium text-slate-600">
                영수증 업로드 (선택, JPG/PNG/PDF)
              </label>
              <input
                id="receipt"
                name="receipt"
                type="file"
                accept="image/*,application/pdf"
                className="block w-full text-sm text-slate-600"
              />
              <p className="text-xs text-slate-400">업로드 시 Supabase Storage의 private 버킷(Receipts)에 저장됩니다.</p>
            </div>

            {state?.error ? <p className="text-sm text-rose-600">{state.error}</p> : null}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:border-slate-400 hover:text-slate-900"
              >
                취소
              </button>
              <PaymentSubmitButton disabled={cannotSubmit} />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export function CounterDashboard({ companies, entries, payments, selectedYear, selectedMonth }: CounterDashboardProps) {
  const session = useSession();
  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(companies[0]?.id ?? null);
  const [entryDate, setEntryDate] = useState(today);
  const [count, setCount] = useState(1);
  const [signer, setSigner] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);

  useEffect(() => {
    setSelectedEntryIds([]);
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    setCodeInput('');
  }, [selectedCompanyId]);

  useEffect(() => {
    if (!paymentMessage) {
      return;
    }
    const timer = setTimeout(() => setPaymentMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [paymentMessage]);

  const selectedEntries = useMemo(
    () => entries.filter((entry) => selectedEntryIds.includes(entry.id)),
    [entries, selectedEntryIds],
  );

  const canProceedPayment =
    selectedEntries.length > 0 &&
    selectedEntries.every((entry) => entry.companyId === selectedEntries[0].companyId);

  const paymentHint = selectedEntries.length === 0
    ? '결제할 장부를 선택해주세요.'
    : !canProceedPayment
      ? '동일한 회사의 항목만 선택할 수 있습니다.'
      : null;

  const handleEntrySuccess = () => {
    setCount(1);
    setSigner('');
    setCodeInput('');
  };

  const handlePaymentSuccess = useCallback((message: string) => {
    setPaymentMessage(message);
    setIsPaymentOpen(false);
    setSelectedEntryIds([]);
  }, []);

  const handlePaymentClose = useCallback(() => {
    setIsPaymentOpen(false);
  }, []);

  const selectedEntryIdsSorted = useMemo(() => [...selectedEntryIds].sort(), [selectedEntryIds]);

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <CompanySidebar
          companies={companies}
          entries={entries}
          selectedCompanyId={selectedCompanyId}
          setSelectedCompanyId={setSelectedCompanyId}
        />
        <div className="space-y-6">
          <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">월별 장부</h1>
              <p className="text-sm text-slate-500">
                {selectedYear}년 {selectedMonth}월 기준 방문 내역. {session.name ?? '사용자'}님 안녕하세요!
              </p>
            </div>
            <MonthSelector year={selectedYear} month={selectedMonth} />
          </div>
          {paymentMessage ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {paymentMessage.split('\n').map((line, index) => (
                <span key={index} className="block">
                  {line}
                </span>
              ))}
            </div>
          ) : null}
          <SummaryCards entries={entries} />
          <EntryForm
            companies={companies}
            selectedCompanyId={selectedCompanyId}
            setSelectedCompanyId={setSelectedCompanyId}
            codeInput={codeInput}
            setCodeInput={setCodeInput}
            entryDate={entryDate}
            setEntryDate={setEntryDate}
            count={count}
            setCount={setCount}
            signer={signer}
            setSigner={setSigner}
            onSuccess={handleEntrySuccess}
          />
          <LedgerTable
            entries={entries}
            payments={payments}
            selectedEntryIds={selectedEntryIds}
            setSelectedEntryIds={setSelectedEntryIds}
            selectedEntries={selectedEntries}
            canProceedPayment={canProceedPayment}
            onRequestPayment={() => setIsPaymentOpen(true)}
            paymentHint={paymentHint}
          />
        </div>
      </div>

      <PaymentModal
        open={isPaymentOpen && canProceedPayment}
        onClose={handlePaymentClose}
        entryIds={selectedEntryIdsSorted}
        entries={selectedEntries}
        onSuccess={handlePaymentSuccess}
      />
    </>
  );
}
