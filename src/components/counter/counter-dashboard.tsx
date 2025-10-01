'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import clsx from 'clsx';
import { useFormState, useFormStatus } from 'react-dom';

import { useSession } from '@/components/providers/session-provider';
import { createEntry, type CreateEntryState } from '@/app/(protected)/counter/entry-actions';
import {
  preparePayment,
  completePayment,
  getReceiptSignedUrl,
  type CompletePaymentState,
  type PaymentPreparationResult,
} from '@/app/(protected)/counter/payment-actions';
import styles from './counter-dashboard.module.css';

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
  entries: LedgerEntry[]; // 이번 달
  prevUnpaidEntries: LedgerEntry[]; // 전월까지 미결제
  payments: PaymentSummary[];
  selectedYear: number;
  selectedMonth: number; // 1-12
};

const visitorOptions = Array.from({ length: 20 }, (_, index) => index + 1);

// Shared CSS classes for consistency
const CARD_CONTAINER = 'rounded-xl border border-slate-200 bg-white shadow-sm';
const TYPO = {
  sectionTitle: 'text-lg font-semibold text-slate-900',
  subtitle: 'text-sm text-slate-500',
  pageTitle: 'text-xl font-semibold text-slate-900',
};
const BUTTON = {
  primary: 'rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400',
  secondary: 'rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-400 hover:text-slate-900',
};

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
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
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
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
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
    {
      label: '총 방문 인원',
      value: `${totalVisitors.toLocaleString()}명`,
      icon: '👥',
      iconClass: styles.summaryIconEmerald,
    },
    {
      label: '미결제 인원',
      value: `${unpaidVisitors.toLocaleString()}명`,
      icon: '⏳',
      iconClass: styles.summaryIconAmber,
    },
    {
      label: '등록 횟수',
      value: `${totalEntries.toLocaleString()}건`,
      icon: '🗒️',
      iconClass: styles.summaryIconSky,
    },
    {
      label: '이용 기업',
      value: `${uniqueCompanies.toLocaleString()}곳`,
      icon: '🏢',
      iconClass: styles.summaryIconViolet,
    },
  ];

  return (
    <div className={styles.summaryGrid}>
      {summaries.map((item) => (
        <div key={item.label} className={styles.summaryCard}>
          <span aria-hidden className={clsx(styles.summaryIcon, item.iconClass)}>
            {item.icon}
          </span>
          <div className={styles.summaryText}>
            <p className={styles.summaryLabel}>{item.label}</p>
            <p className={styles.summaryValue}>{item.value}</p>
          </div>
        </div>
      ))}
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
  selectedYear,
  selectedMonth,
}: {
  entries: LedgerEntry[];
  payments: PaymentSummary[];
  selectedEntryIds: string[];
  setSelectedEntryIds: (ids: string[]) => void;
  selectedEntries: LedgerEntry[];
  canProceedPayment: boolean;
  onRequestPayment: () => void;
  paymentHint: string | null;
  selectedYear: number;
  selectedMonth: number;
}) {
  const grouped = useMemo(() => groupEntries(entries), [entries]);

  const toggleEntry = (id: string) => {
    setSelectedEntryIds(
      selectedEntryIds.includes(id)
        ? selectedEntryIds.filter((entryId) => entryId !== id)
        : [...selectedEntryIds, id],
    );
  };


  const pendingCount = selectedEntries.reduce((sum, entry) => sum + entry.count, 0);

  const paymentLookup = useMemo(() => {
    const map = new Map<string, PaymentSummary>();
    for (const payment of payments) {
      map.set(payment.id, payment);
    }
    return map;
  }, [payments]);

  return (
    <div className={clsx(CARD_CONTAINER, 'p-6 space-y-6')}>
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-4">
        <div>
          <h2 className={TYPO.sectionTitle}>장부 내역</h2>
          <p className={TYPO.subtitle}>체크박스를 선택하여 결제 처리하세요.</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {grouped.length === 0 ? (
          <p className="p-4 text-sm text-slate-500 text-center">등록된 장부가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="w-8 px-2 py-2">
                    <input
                      type="checkbox"
                      checked={entries.filter(e => !e.isPaid).length > 0 && entries.filter(e => !e.isPaid).every(e => selectedEntryIds.includes(e.id))}
                      onChange={() => {
                        const unpaidIds = entries.filter(e => !e.isPaid).map(e => e.id);
                        const allSelected = unpaidIds.every(id => selectedEntryIds.includes(id));
                        setSelectedEntryIds(allSelected ? [] : unpaidIds);
                      }}
                      className="h-4 w-4"
                    />
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-700">날짜</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-700">회사명</th>
                  <th className="px-3 py-2 text-center font-medium text-slate-700">인원수</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-700">서명자</th>
                  <th className="px-3 py-2 text-center font-medium text-slate-700">결제여부</th>
                  <th className="px-3 py-2 text-center font-medium text-slate-700">영수증</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* 전월 미결제 건이 있다면 상단에 표시 */}
                {(() => {
                  const currentMonth = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}`;
                  const prevMonthEntries = entries.filter(e =>
                    !e.isPaid && !e.entryDate.startsWith(currentMonth)
                  );
                  const prevMonthCount = prevMonthEntries.reduce((sum, e) => sum + e.count, 0);

                  if (prevMonthCount > 0) {
                    return (
                      <tr className="bg-amber-50 border-amber-200">
                        <td className="px-2 py-2">
                          <input
                            type="checkbox"
                            checked={prevMonthEntries.every(e => selectedEntryIds.includes(e.id))}
                            onChange={() => {
                              const prevMonthIds = prevMonthEntries.map(e => e.id);
                              const allSelected = prevMonthIds.every(id => selectedEntryIds.includes(id));
                              if (allSelected) {
                                setSelectedEntryIds(selectedEntryIds.filter(id => !prevMonthIds.includes(id)));
                              } else {
                                setSelectedEntryIds([...selectedEntryIds, ...prevMonthIds.filter(id => !selectedEntryIds.includes(id))]);
                              }
                            }}
                            className="h-4 w-4"
                          />
                        </td>
                        <td className="px-3 py-2 text-amber-700 font-medium">
                          전월 미결제
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900">{entries[0]?.companyName}</span>
                            <span className="text-xs text-slate-500 font-mono">#{entries[0]?.companyCode}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className="inline-flex items-center justify-center min-w-[2rem] rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                            {prevMonthCount}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          -
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                            <span>○</span>
                            미결제
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className="text-xs text-slate-400">-</span>
                        </td>
                      </tr>
                    );
                  }
                  return null;
                })()}

                {entries
                  .filter(entry => {
                    const currentMonth = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}`;
                    return entry.entryDate.startsWith(currentMonth);
                  })
                  .sort((a, b) => a.entryDate.localeCompare(b.entryDate))
                  .map((entry) => {
                    const isSelected = selectedEntryIds.includes(entry.id);
                    const payment = entry.paymentId ? paymentLookup.get(entry.paymentId) : null;
                    return (
                      <tr
                        key={entry.id}
                        className={clsx(
                          'hover:bg-slate-50 transition-colors',
                          {
                            'bg-emerald-50': isSelected && !entry.isPaid,
                            'opacity-60': entry.isPaid,
                          },
                        )}
                      >
                        <td className="px-2 py-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleEntry(entry.id)}
                            disabled={entry.isPaid}
                            className="h-4 w-4"
                          />
                        </td>
                        <td className="px-3 py-2 text-slate-900 font-medium">
                          {format(parseISO(entry.entryDate), 'M/d (EEE)', { locale: ko })}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900">{entry.companyName}</span>
                            <span className="text-xs text-slate-500 font-mono">#{entry.companyCode}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className="inline-flex items-center justify-center min-w-[2rem] rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                            {entry.count}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {entry.signer || '-'}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {entry.isPaid ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                              <span>✓</span>
                              완료
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                              <span>○</span>
                              미결제
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {entry.isPaid && payment ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                              <span>🧾</span>
                              있음
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 선택된 회사의 요약 정보 */}
      {entries.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="text-center">
            <p className="text-xs text-slate-500">이번 달 총 인원</p>
            <p className="text-lg font-semibold text-slate-900">{
              entries
                .filter(e => e.entryDate.startsWith(`${selectedYear}-${String(selectedMonth).padStart(2,'0')}`))
                .reduce((sum, e) => sum + e.count, 0)
            }명</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500">미결제 인원</p>
            <p className="text-lg font-semibold text-amber-600">{entries.filter(e => !e.isPaid).reduce((sum, e) => sum + e.count, 0)}명</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500">미결제 금액</p>
            <p className="text-lg font-semibold text-amber-600">{(entries.filter(e => !e.isPaid).reduce((sum, e) => sum + e.count, 0) * 8000).toLocaleString()}원</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500">총 방문 횟수</p>
            <p className="text-lg font-semibold text-slate-900">{
              entries
                .filter(e => e.entryDate.startsWith(`${selectedYear}-${String(selectedMonth).padStart(2,'0')}`))
                .length
            }건</p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/60 p-4 text-sm text-emerald-900 md:flex-row md:items-center md:justify-between">
        <div>
          선택된 항목: <span className="font-semibold text-emerald-700">{selectedEntries.length}</span>건 / 총{' '}
          <span className="font-semibold text-emerald-700">{pendingCount}</span>명
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          {paymentHint ? <p className="text-xs text-rose-600">{paymentHint}</p> : null}
          <button
            type="button"
            onClick={onRequestPayment}
            disabled={!canProceedPayment}
            className={BUTTON.primary}
          >
            결제 진행
          </button>
        </div>
      </div>
    </div>
  );
}

type ReceiptPreview = {
  url: string;
  companyName: string;
  period: string;
};

function ReceiptModal({ preview, onClose }: { preview: ReceiptPreview; onClose: () => void }) {
  const baseUrl = preview.url.split('?')[0]?.toLowerCase() ?? '';
  const isPdf = baseUrl.endsWith('.pdf');
  const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'].some((ext) => baseUrl.endsWith(ext));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-8">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className={TYPO.sectionTitle}>영수증 미리보기</h3>
            <p className={TYPO.subtitle}>{preview.companyName} · {preview.period}</p>
          </div>
          <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-900">
            닫기
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          <p className="text-sm text-slate-600">
            링크는 10분 후 만료됩니다.{' '}
            <a
              href={preview.url}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-emerald-600 hover:underline"
            >
              새 탭에서 열기
            </a>
          </p>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            {isPdf ? (
              <iframe
                src={preview.url}
                title="영수증 PDF"
                className="h-[60vh] w-full rounded-md border border-slate-200"
              />
            ) : isImage ? (
              <>
                {/* Supabase 서명 URL은 도메인이 고정되지 않아 next/image 최적화를 적용하기 어렵습니다. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview.url}
                  alt="결제 영수증"
                  className="max-h-[60vh] w-full rounded-md object-contain"
                />
              </>
            ) : (
              <p className="text-sm text-slate-600">미리보기를 지원하지 않는 형식입니다. 새 탭에서 열어주세요.</p>
            )}
          </div>
        </div>
        <div className="flex justify-end border-t border-slate-200 px-6 py-4">
          <button type="button" onClick={onClose} className={BUTTON.secondary}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentHistory({ payments, companies }: { payments: PaymentSummary[]; companies: CompanySummary[] }) {
  const companyLookup = useMemo(() => {
    const map = new Map<string, CompanySummary>();
    for (const company of companies) {
      map.set(company.id, company);
    }
    return map;
  }, [companies]);

  const [activePaymentId, setActivePaymentId] = useState<string | null>(null);
  const [preview, setPreview] = useState<ReceiptPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleViewReceipt = useCallback(
    (payment: PaymentSummary) => {
      const company = companyLookup.get(payment.companyId);
      const companyName = company?.name ?? '미등록 회사';
      const period = `${payment.fromDate} ~ ${payment.toDate}`;

      setError(null);
      setActivePaymentId(payment.id);

      startTransition(async () => {
        try {
          const { url } = await getReceiptSignedUrl(payment.id);
          setPreview({ url, companyName, period });
        } catch (caughtError) {
          console.error('receipt fetch error', caughtError);
          setError(caughtError instanceof Error ? caughtError.message : '영수증을 불러오지 못했습니다.');
        } finally {
          setActivePaymentId(null);
        }
      });
    },
    [companyLookup],
  );

  return (
    <div className={clsx(CARD_CONTAINER, 'px-6 py-7 space-y-5')}>
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className={TYPO.sectionTitle}>결제 내역</h2>
          <p className={TYPO.subtitle}>이번 달 결제 기록과 영수증을 확인할 수 있습니다.</p>
        </div>
      </div>

      {error ? <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p> : null}

      <div className="overflow-hidden rounded-3xl border border-slate-100 shadow-[0_12px_32px_-26px_rgba(15,115,88,0.45)] shadow-emerald-100">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2">회사</th>
              <th className="px-3 py-2">기간</th>
              <th className="px-3 py-2 text-right">인원</th>
              <th className="px-3 py-2 text-right">단가</th>
              <th className="px-3 py-2 text-right">금액</th>
              <th className="px-3 py-2">결제일</th>
              <th className="px-3 py-2">영수증</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payments.map((payment) => {
              const company = companyLookup.get(payment.companyId);
              const isLoading = pending && activePaymentId === payment.id;
              return (
                <tr key={payment.id}>
                  <td className="px-3 py-3">
                    <div className="flex items-start gap-3">
                      <span
                        aria-hidden
                        className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-sm text-emerald-600"
                      >
                        🏢
                      </span>
                      <div className="flex flex-col gap-2">
                        <span className="font-medium text-slate-900">{company?.name ?? '미등록 회사'}</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 font-mono">
                          #{company?.code ?? '----'}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-slate-500">
                    {payment.fromDate} ~ {payment.toDate}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-500">{payment.totalCount.toLocaleString()}명</td>
                  <td className="px-3 py-2 text-right text-slate-500">{payment.unitPrice.toLocaleString()}원</td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-900">{payment.totalAmount.toLocaleString()}원</td>
                  <td className="px-3 py-2 text-slate-500">
                    {payment.paidAt ? format(new Date(payment.paidAt), 'yyyy-MM-dd') : '-'}
                  </td>
                  <td className="px-3 py-2">
                    {payment.receiptUrl ? (
                      <button
                        type="button"
                        onClick={() => handleViewReceipt(payment)}
                        disabled={isLoading}
                        className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-emerald-600 transition hover:border-emerald-400 hover:text-emerald-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                      >
                        <span aria-hidden className="mr-1">🧾</span>
                        {isLoading ? '링크 생성 중...' : '영수증 보기'}
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-400">
                        <span aria-hidden>—</span> 없음
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {payments.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-sm text-slate-500">
                  이번 달 결제 내역이 없습니다.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {preview ? <ReceiptModal preview={preview} onClose={() => setPreview(null)} /> : null}
    </div>
  );
}

type EntrySuccessInfo = {
  companyName: string;
  entryDate: string;
  count: number;
};

function LeftPanel({
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
  onSuccess: (info: EntrySuccessInfo) => void;
}) {
  const selectedCompany = companies.find((company) => company.id === selectedCompanyId);
  const initialState: CreateEntryState = {};
  const [state, formAction] = useFormState(createEntry, initialState);
  const isCodeValid = !!selectedCompany && codeInput === selectedCompany.code;

  useEffect(() => {
    if (state?.success) {
      const companyName = selectedCompany?.name ?? '미등록 회사';
      onSuccess({ companyName, entryDate, count });
    }
    // state.success가 변경될 때에만 실행되도록 의존성 최소화
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.success]);

  return (
    <div className={clsx(CARD_CONTAINER, 'p-6 space-y-6')}>
      <div>
        <h2 className={TYPO.sectionTitle}>회사 선택 & 인원 등록</h2>
        <p className={TYPO.subtitle}>회사를 선택하고 4자리 코드를 입력한 후 인원을 등록하세요.</p>
      </div>

      <form action={formAction} className="space-y-4">
        {/* 회사 선택 */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">회사 선택</label>
          <select
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
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
                {company.name} (#{company.code})
              </option>
            ))}
          </select>
        </div>

        {/* 회사 코드 */}
        <div className="space-y-2">
          <label htmlFor="code" className="text-sm font-medium text-slate-700">
            회사 코드 (4자리)
          </label>
          <input
            id="code"
            type="password"
            inputMode="numeric"
            maxLength={4}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            value={codeInput}
            onChange={(event) => setCodeInput(event.target.value.trim())}
            placeholder="0000"
            required
            disabled={!selectedCompanyId}
          />
          {selectedCompanyId && !isCodeValid && codeInput.length === 4 ? (
            <p className="text-sm text-rose-600">회사 코드가 일치하지 않습니다.</p>
          ) : null}
        </div>

        {/* 구분선 */}
        <div className="border-t border-slate-200 pt-4">
          <h3 className="text-sm font-medium text-slate-700 mb-3">방문 정보 입력</h3>
        </div>

        {/* 날짜 */}
        <div className="space-y-2">
          <label htmlFor="entryDate" className="text-sm font-medium text-slate-700">
            방문 날짜
          </label>
          <input
            id="entryDate"
            name="entryDate"
            type="date"
            className={clsx(
              "w-full rounded-lg border px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200",
              !isCodeValid ? "border-slate-200 bg-slate-100 text-slate-400" : "border-slate-300"
            )}
            value={entryDate}
            onChange={(event) => setEntryDate(event.target.value)}
            disabled={!isCodeValid}
            required
          />
        </div>

        {/* 인원 수 */}
        <div className="space-y-2">
          <label htmlFor="count" className="text-sm font-medium text-slate-700">
            방문 인원
          </label>
          <select
            id="count"
            name="count"
            className={clsx(
              "w-full rounded-lg border px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200",
              !isCodeValid ? "border-slate-200 bg-slate-100 text-slate-400" : "border-slate-300"
            )}
            value={count}
            onChange={(event) => setCount(Number(event.target.value))}
            disabled={!isCodeValid}
            required
          >
            {visitorOptions.map((option) => (
              <option key={option} value={option}>
                {option}명
              </option>
            ))}
          </select>
        </div>

        {/* 서명자 */}
        <div className="space-y-2">
          <label htmlFor="signer" className="text-sm font-medium text-slate-700">
            서명자 (선택)
          </label>
          <input
            id="signer"
            name="signer"
            type="text"
            className={clsx(
              "w-full rounded-lg border px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200",
              !isCodeValid ? "border-slate-200 bg-slate-100 text-slate-400" : "border-slate-300"
            )}
            value={signer}
            onChange={(event) => setSigner(event.target.value)}
            placeholder="홍길동"
            disabled={!isCodeValid}
          />
        </div>

        <input type="hidden" name="companyId" value={selectedCompanyId ?? ''} />
        <input type="hidden" name="code" value={codeInput} />

        {state?.error ? <p className="text-sm text-rose-600">{state.error}</p> : null}
        {state?.success ? (
          <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {state.success}
          </div>
        ) : null}

        <button
          type="submit"
          className={clsx(
            "w-full rounded-lg px-4 py-2 text-sm font-medium transition",
            isCodeValid
              ? "bg-emerald-600 text-white hover:bg-emerald-700"
              : "bg-slate-300 text-slate-500 cursor-not-allowed"
          )}
          disabled={!isCodeValid}
        >
          등록하기
        </button>
      </form>
    </div>
  );
}

function PaymentSubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={BUTTON.primary}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-8">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className={TYPO.sectionTitle}>결제 처리</h3>
            {defaults ? <p className={TYPO.subtitle}>{defaults.companyName} — {defaults.totalCount}명</p> : null}
          </div>
          <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-900">
            닫기
          </button>
        </div>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto px-6 py-5">
          {fetchError ? (
            <p className="rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-600">{fetchError}</p>
          ) : null}
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
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

        <div className="border-t border-slate-200 px-6 py-5">
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
                  className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm"
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
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
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
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-600">합계</label>
                <input
                  type="text"
                  value={`${totalAmount.toLocaleString()}원`}
                  readOnly
                  className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold"
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

            <div className="flex justify-end gap-3">
              <button type="button" onClick={onClose} className={BUTTON.secondary}>
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

export function CounterDashboard({ companies, entries, prevUnpaidEntries, payments, selectedYear, selectedMonth }: CounterDashboardProps) {
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
  const [entryConfirm, setEntryConfirm] = useState<{
    open: boolean;
    companyName: string;
    entryDate: string;
    count: number;
  } | null>(null);

  useEffect(() => {
    // 월이 변경되거나 회사가 변경될 때, 해당 회사의 미결제 항목(전월 포함)을 기본 선택
    if (selectedCompanyId) {
      const unpaidIds = [...entries, ...prevUnpaidEntries]
        .filter((entry) => !entry.isPaid && entry.companyId === selectedCompanyId)
        .map((entry) => entry.id);
      setSelectedEntryIds(unpaidIds);
    } else {
      setSelectedEntryIds([]);
    }
  }, [selectedYear, selectedMonth, entries, prevUnpaidEntries, selectedCompanyId]);

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

  const allEntries = useMemo(() => [...entries, ...prevUnpaidEntries], [entries, prevUnpaidEntries]);
  const selectedEntries = useMemo(
    () => allEntries.filter((entry) => selectedEntryIds.includes(entry.id)),
    [allEntries, selectedEntryIds],
  );

  const canProceedPayment =
    selectedEntries.length > 0 &&
    selectedEntries.every((entry) => entry.companyId === selectedEntries[0].companyId);

  const paymentHint = selectedEntries.length === 0
    ? '결제할 장부를 선택해주세요.'
    : !canProceedPayment
      ? '동일한 회사의 항목만 선택할 수 있습니다.'
      : null;

  const handleEntrySuccess = useCallback((info: EntrySuccessInfo) => {
    setEntryConfirm({ open: true, ...info });
  }, []);

  const handleEntryConfirmClose = useCallback(() => {
    setEntryConfirm(null);
    // 팝업이 닫힐 때 입력값 초기화 및 장부 닫기
    setCount(1);
    setSigner('');
    setCodeInput('');
  }, []);

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
      {/* 상단 헤더 */}
      <div className={clsx(CARD_CONTAINER, 'flex flex-col gap-4 px-6 py-7 md:flex-row md:items-center md:justify-between mb-6')}>
        <div className="flex items-center gap-4">
          <MonthSelector year={selectedYear} month={selectedMonth} />
        </div>
        <div className="text-center">
          <h1 className={TYPO.pageTitle}>온기한식뷔페 회사별 장부 시스템</h1>
          <p className={TYPO.subtitle}>
            {selectedYear}년 {selectedMonth}월 기준. {session.name ?? '사용자'}님 안녕하세요!
          </p>
        </div>
        <div></div>
      </div>

      {paymentMessage ? (
        <div className="rounded-3xl border border-emerald-100 bg-emerald-50/70 px-6 py-4 text-sm text-emerald-900 shadow-[0_10px_24px_-20px_rgba(15,115,88,0.45)] shadow-emerald-200 mb-6">
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg text-emerald-500 shadow-sm"
            >
              ✅
            </span>
            <div className="space-y-1">
              {paymentMessage.split('\n').map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* 메인 레이아웃: 왼쪽 30% + 오른쪽 70% */}
      <div className="grid gap-6 lg:grid-cols-[35%_65%]">
        {/* 왼쪽 패널: 회사 선택 & 인원 등록 */}
        <div className="relative">
          <LeftPanel
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

          {/* 등록 확인 토스트 (왼쪽 패널 안쪽에 고정) */}
          <EntryConfirmModal
            open={!!entryConfirm?.open}
            companyName={entryConfirm?.companyName ?? ''}
            entryDate={entryConfirm?.entryDate ?? ''}
            count={entryConfirm?.count ?? 0}
            onClose={handleEntryConfirmClose}
          />
        </div>

        {/* 오른쪽 패널: 장부 테이블 */}
        <div className="space-y-6">
          {/* 비활성 상태 또는 장부 테이블 */}
          {!selectedCompanyId || !codeInput || codeInput !== companies.find(c => c.id === selectedCompanyId)?.code ? (
            <div className={clsx(CARD_CONTAINER, 'p-8 text-center space-y-4')}>
              <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-2xl text-slate-400">
                📋
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-slate-900">장부 영역</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  왼쪽에서 회사를 선택하고 올바른 4자리 코드를 입력하면<br />
                  이곳에 해당 회사의 월별 방문 기록이 표시됩니다.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span>📅</span>
                  <span>날짜별 정리</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>👥</span>
                  <span>인원 수 관리</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>✅</span>
                  <span>다중 선택</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>💳</span>
                  <span>결제 처리</span>
                </div>
              </div>
            </div>
          ) : (
            <LedgerTable
              entries={[...entries, ...prevUnpaidEntries].filter(entry => entry.companyId === selectedCompanyId)}
              payments={payments}
              selectedEntryIds={selectedEntryIds}
              setSelectedEntryIds={setSelectedEntryIds}
              selectedEntries={selectedEntries}
              canProceedPayment={canProceedPayment}
              onRequestPayment={() => setIsPaymentOpen(true)}
              paymentHint={paymentHint}
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
            />
          )}
        </div>
      </div>

      {/* 하단 섹션들 */}
      <div className="mt-8 space-y-6">
        <PaymentHistory payments={payments} companies={companies} />
        <CounterAuditLog />
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

type EntryConfirmModalProps = {
  open: boolean;
  companyName: string;
  entryDate: string; // yyyy-MM-dd
  count: number;
  onClose: () => void;
};

function EntryConfirmModal({ open, companyName, entryDate, count, onClose }: EntryConfirmModalProps) {
  const [remaining, setRemaining] = useState(5);

  useEffect(() => {
    if (!open) return;
    setRemaining(5);
    const iv = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(iv);
          // 안전하게 닫기
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="pointer-events-auto w-[90%] max-w-md overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-emerald-100 px-4 py-3">
          <h3 className={TYPO.sectionTitle}>방문 등록 완료</h3>
          <button onClick={onClose} className="text-xs text-slate-500 hover:text-slate-900">닫기</button>
        </div>
        <div className="px-4 py-4 space-y-2 text-sm text-slate-700">
          <p>
            <span className="font-medium">{entryDate}</span>
            <span className="mx-2">—</span>
            <span className="font-medium">{companyName}</span>
            <span className="mx-2">•</span>
            <span className="font-medium">{count}명</span>
          </p>
          <p>장부에 등록되었습니다.</p>
          <p className="text-xs text-slate-400">{remaining}초 후 자동으로 닫힙니다.</p>
        </div>
        <div className="border-t border-emerald-100 px-4 py-3 flex justify-end">
          <button onClick={onClose} className={BUTTON.primary}>확인</button>
        </div>
      </div>
    </div>
  );
}

function CounterAuditLog() {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAuditLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      // Import audit log actions dynamically to avoid circular dependencies
      const { getAuditLogs } = await import('@/app/(protected)/actions/audit-log-actions');
      const result = await getAuditLogs(20);

      if (result.error) {
        setError(result.error);
        setAuditLogs([]);
      } else {
        setAuditLogs(result.data ?? []);
      }
    } catch (err) {
      setError('감사 로그를 불러오는데 실패했습니다.');
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  return (
    <div className={clsx(CARD_CONTAINER, 'px-6 py-7 space-y-5')}>
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className={TYPO.sectionTitle}>감사 로그</h2>
          <p className={TYPO.subtitle}>카운터에서 수행된 작업 기록을 확인할 수 있습니다.</p>
        </div>
        <button
          type="button"
          onClick={loadAuditLogs}
          disabled={loading}
          className="rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? '새로고침 중...' : '새로고침'}
        </button>
      </div>

      {error ? (
        <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-slate-100 shadow-[0_12px_32px_-26px_rgba(15,115,88,0.45)] shadow-emerald-100">
        {loading ? (
          <div className="p-6 text-center text-sm text-slate-500">감사 로그를 불러오는 중...</div>
        ) : auditLogs.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">감사 로그가 없습니다.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {auditLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-4 px-6 py-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-sm text-blue-600">
                  📋
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-900">{log.description}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        작업자: {log.user_name} · {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm')}
                      </p>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {log.action === 'entry_created' ? '등록' :
                       log.action === 'payment_completed' ? '결제' :
                       log.action}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
