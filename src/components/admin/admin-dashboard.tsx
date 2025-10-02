'use client';

import { useMemo, useState, useTransition, type FormEvent, type ReactNode } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import clsx from 'clsx';
import { format } from 'date-fns';

import { AdminCompanyManager } from '@/components/admin/admin-company-manager';
import { AdminPinManager } from '@/components/admin/admin-pin-manager';
import { CsvExport } from '@/components/admin/csv-export';
import type { CompanySummary } from '@/components/counter/counter-dashboard';
import { getReceiptSignedUrl } from '@/app/(protected)/counter/payment-actions';
import { getPaymentDetail, type PaymentDetailResult } from '@/app/(protected)/admin/payment-actions';

export type AdminPaymentRow = {
  id: string;
  companyId: string;
  companyName: string;
  companyCode: string;
  fromDate: string;
  toDate: string;
  totalCount: number;
  totalAmount: number;
  unitPrice: number;
  paidAt: string | null;
  receiptUrl: string | null;
};

type AdminDashboardProps = {
  companies: CompanySummary[];
  payments: AdminPaymentRow[];
  searchDefaults: {
    company: string;
    start: string;
    end: string;
  };
};

const BUTTON = {
  primary:
    'rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400',
  secondary:
    'rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900',
  subtle:
    'rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900',
};

type ReceiptMeta = {
  companyName: string;
  period: string;
};

type DetailMeta = {
  companyName: string;
  period: string;
  amount: number;
  totalCount: number;
  unitPrice: number;
  paidAt: string | null;
};

export function AdminDashboard({ companies, payments, searchDefaults }: AdminDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [companyInput, setCompanyInput] = useState(searchDefaults.company);
  const [startDate, setStartDate] = useState(searchDefaults.start);
  const [endDate, setEndDate] = useState(searchDefaults.end);

  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [receiptMeta, setReceiptMeta] = useState<ReceiptMeta | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [receiptPaymentId, setReceiptPaymentId] = useState<string | null>(null);
  const [isReceiptPending, startReceiptTransition] = useTransition();

  const [detailMeta, setDetailMeta] = useState<DetailMeta | null>(null);
  const [detailData, setDetailData] = useState<PaymentDetailResult | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailPaymentId, setDetailPaymentId] = useState<string | null>(null);
  const [isDetailPending, startDetailTransition] = useTransition();

  const metrics = useMemo(() => {
    const totalAmount = payments.reduce((sum, payment) => sum + (payment.totalAmount ?? 0), 0);
    const totalCount = payments.reduce((sum, payment) => sum + (payment.totalCount ?? 0), 0);
    return {
      paymentCount: payments.length,
      totalAmount,
      totalCount,
    };
  }, [payments]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams(searchParams?.toString() ?? '');

    if (companyInput) {
      params.set('company', companyInput);
    } else {
      params.delete('company');
    }

    if (startDate) {
      params.set('start', startDate);
    } else {
      params.delete('start');
    }

    if (endDate) {
      params.set('end', endDate);
    } else {
      params.delete('end');
    }

    const query = params.toString();
    router.replace(query ? `?${query}` : '?', { scroll: false });
  };

  const handleReset = () => {
    setCompanyInput('');
    setStartDate(searchDefaults.start);
    setEndDate(searchDefaults.end);
    router.replace('?', { scroll: false });
  };

  const handleOpenReceipt = (payment: AdminPaymentRow) => {
    if (!payment.receiptUrl) {
      return;
    }

    setShowReceiptModal(true);
    setReceiptMeta({ companyName: payment.companyName, period: `${payment.fromDate} ~ ${payment.toDate}` });
    setReceiptUrl(null);
    setReceiptError(null);

    startReceiptTransition(async () => {
      try {
        setReceiptPaymentId(payment.id);
        const { url } = await getReceiptSignedUrl(payment.id);
        setReceiptUrl(url);
      } catch (error) {
        console.error('receipt fetch error', error);
        setReceiptError(error instanceof Error ? error.message : '영수증을 불러오지 못했습니다.');
      } finally {
        setReceiptPaymentId(null);
      }
    });
  };

  const handleCloseReceipt = () => {
    setShowReceiptModal(false);
    setReceiptMeta(null);
    setReceiptUrl(null);
    setReceiptError(null);
  };

  const handleOpenDetail = (payment: AdminPaymentRow) => {
    if (!payment.paidAt) {
      return;
    }

    setShowDetailModal(true);
    setDetailMeta({
      companyName: payment.companyName,
      period: `${payment.fromDate} ~ ${payment.toDate}`,
      amount: payment.totalAmount,
      totalCount: payment.totalCount,
      unitPrice: payment.unitPrice,
      paidAt: payment.paidAt,
    });
    setDetailData(null);
    setDetailError(null);

    startDetailTransition(async () => {
      try {
        setDetailPaymentId(payment.id);
        const detail = await getPaymentDetail(payment.id);
        setDetailData(detail);
      } catch (error) {
        console.error('payment detail fetch error', error);
        setDetailError(error instanceof Error ? error.message : '결제 정보를 불러오지 못했습니다.');
      } finally {
        setDetailPaymentId(null);
      }
    });
  };

  const handleCloseDetail = () => {
    setShowDetailModal(false);
    setDetailMeta(null);
    setDetailData(null);
    setDetailError(null);
  };

  const receiptLoadingId = isReceiptPending ? receiptPaymentId : null;
  const detailLoadingId = isDetailPending ? detailPaymentId : null;

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">관리자 대시보드</h1>
            <p className="mt-1 text-sm text-slate-500">회사와 기간을 선택해 결제 내역을 조회하세요.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setShowCompanyModal(true)} className={BUTTON.primary}>
              회사 등록
            </button>
            <button type="button" onClick={() => setShowPinModal(true)} className={BUTTON.subtle}>
              PIN 관리
            </button>
            <button type="button" onClick={() => setShowExportModal(true)} className={BUTTON.subtle}>
              데이터 내보내기
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <form
          className="grid gap-4 md:grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))_auto]"
          onSubmit={handleSearch}
        >
          <div className="space-y-2">
            <label htmlFor="company-search" className="text-xs font-medium text-slate-600">
              회사 검색
            </label>
            <input
              id="company-search"
              type="text"
              value={companyInput}
              onChange={(event) => setCompanyInput(event.target.value)}
              placeholder="회사명 또는 코드 입력"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="start-date" className="text-xs font-medium text-slate-600">
              시작일
            </label>
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="end-date" className="text-xs font-medium text-slate-600">
              종료일
            </label>
            <input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              required
            />
          </div>
          <div className="flex items-end gap-2">
            <button type="submit" className={BUTTON.primary}>
              검색
            </button>
            <button type="button" onClick={handleReset} className={BUTTON.secondary}>
              초기화
            </button>
          </div>
        </form>

        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <span>검색 결과 {metrics.paymentCount.toLocaleString()}건</span>
          <span>총 인원 {metrics.totalCount.toLocaleString()}명</span>
          <span>총 금액 {metrics.totalAmount.toLocaleString()}원</span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">회사명</th>
                <th className="px-3 py-2">결제일</th>
                <th className="px-3 py-2">기간</th>
                <th className="px-3 py-2 text-right">수량</th>
                <th className="px-3 py-2 text-right">금액</th>
                <th className="px-3 py-2">영수증</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((payment) => {
                const paidLabel = payment.paidAt ? format(new Date(payment.paidAt), 'yyyy-MM-dd') : '-';
                const isReceiptLoading = receiptLoadingId === payment.id;
                const isDetailLoading = detailLoadingId === payment.id;

                return (
                  <tr key={payment.id}>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-slate-900">{payment.companyName}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-mono text-slate-500">
                          #{payment.companyCode}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {payment.paidAt ? (
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(payment)}
                          disabled={isDetailLoading}
                          className="text-sm font-semibold text-emerald-600 transition hover:text-emerald-500 disabled:cursor-not-allowed disabled:text-slate-400"
                        >
                          {isDetailLoading ? '불러오는 중...' : paidLabel}
                        </button>
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-500">
                      {payment.fromDate} ~ {payment.toDate}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-600">
                      {payment.totalCount.toLocaleString()}명
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-slate-900">
                      {payment.totalAmount.toLocaleString()}원
                    </td>
                    <td className="px-3 py-3">
                      {payment.receiptUrl ? (
                        <button
                          type="button"
                          onClick={() => handleOpenReceipt(payment)}
                          disabled={isReceiptLoading}
                          className="rounded-md border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-600 transition hover:border-emerald-300 hover:text-emerald-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                        >
                          {isReceiptLoading ? '불러오는 중...' : '보기'}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">없음</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-500">
                    검색 조건에 해당하는 결제 내역이 없습니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <ModalShell
        open={showCompanyModal}
        onClose={() => setShowCompanyModal(false)}
        title="회사 등록/관리"
        sizeClass="max-w-5xl"
      >
        <div className="pb-2">
          <AdminCompanyManager companies={companies} />
        </div>
      </ModalShell>

      <ModalShell
        open={showPinModal}
        onClose={() => setShowPinModal(false)}
        title="PIN 관리"
        sizeClass="max-w-3xl"
      >
        <div className="pb-2">
          <AdminPinManager />
        </div>
      </ModalShell>

      <ModalShell
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="데이터 내보내기"
        sizeClass="max-w-3xl"
      >
        <div className="pb-2">
          <CsvExport />
        </div>
      </ModalShell>

      <ReceiptModal
        open={showReceiptModal}
        onClose={handleCloseReceipt}
        meta={receiptMeta}
        url={receiptUrl}
        isLoading={isReceiptPending}
        error={receiptError}
      />

      <PaymentDetailModal
        open={showDetailModal}
        onClose={handleCloseDetail}
        meta={detailMeta}
        data={detailData}
        isLoading={isDetailPending}
        error={detailError}
      />
    </div>
  );
}

function ModalShell({
  open,
  onClose,
  title,
  children,
  sizeClass = 'max-w-4xl',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  sizeClass?: string;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-8">
      <div
        className={clsx(
          'flex w-full max-h-[85vh] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl',
          sizeClass,
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-slate-500 transition hover:text-slate-900"
          >
            닫기
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

function ReceiptModal({
  open,
  onClose,
  meta,
  url,
  isLoading,
  error,
}: {
  open: boolean;
  onClose: () => void;
  meta: ReceiptMeta | null;
  url: string | null;
  isLoading: boolean;
  error: string | null;
}) {
  if (!open) {
    return null;
  }

  const extension = url ? url.split('?')[0]?.toLowerCase() ?? '' : '';
  const isPdf = extension.endsWith('.pdf');
  const isImage = /\.(png|jpe?g|gif|webp)$/i.test(extension);

  return (
    <ModalShell open={open} onClose={onClose} title="영수증 보기" sizeClass="max-w-3xl">
      <div className="space-y-4">
        {meta ? (
          <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <p className="font-medium text-slate-900">{meta.companyName}</p>
            <p className="mt-1 text-slate-500">{meta.period}</p>
          </div>
        ) : null}

        {error ? <p className="rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p> : null}

        {isLoading ? (
          <div className="flex h-48 items-center justify-center text-sm text-slate-500">불러오는 중...</div>
        ) : url ? (
          <div className="space-y-3">
            <div className="flex justify-end">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-emerald-600 transition hover:text-emerald-500"
              >
                새 창에서 열기
              </a>
            </div>
            {isPdf ? (
              <iframe src={url} title="영수증" className="h-[60vh] w-full rounded-lg border border-slate-200" />
            ) : isImage ? (
              <div className="relative h-[60vh] w-full">
                <Image
                  src={url}
                  alt="영수증"
                  fill
                  className="rounded-lg object-contain"
                  sizes="(min-width: 1024px) 700px, 100vw"
                  unoptimized
                  priority
                />
              </div>
            ) : (
              <p className="text-sm text-slate-500">지원하지 않는 파일 형식입니다. 새 창에서 열어 확인하세요.</p>
            )}
          </div>
        ) : !error ? (
          <div className="flex h-48 items-center justify-center text-sm text-slate-500">영수증을 준비하고 있습니다.</div>
        ) : null}
      </div>
    </ModalShell>
  );
}

function PaymentDetailModal({
  open,
  onClose,
  meta,
  data,
  isLoading,
  error,
}: {
  open: boolean;
  onClose: () => void;
  meta: DetailMeta | null;
  data: PaymentDetailResult | null;
  isLoading: boolean;
  error: string | null;
}) {
  if (!open) {
    return null;
  }

  return (
    <ModalShell open={open} onClose={onClose} title="결제 상세" sizeClass="max-w-4xl">
      <div className="space-y-5">
        {meta ? (
          <div className="grid gap-3 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600 sm:grid-cols-2">
            <div>
              <p className="text-xs text-slate-500">회사</p>
              <p className="font-medium text-slate-900">{meta.companyName}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">결제일</p>
              <p className="font-medium text-slate-900">
                {meta.paidAt ? format(new Date(meta.paidAt), 'yyyy-MM-dd') : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">기간</p>
              <p className="font-medium text-slate-900">{meta.period}</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center sm:col-span-2">
              <div className="rounded-md bg-white px-3 py-2 shadow-inner">
                <p className="text-[11px] text-slate-500">수량</p>
                <p className="mt-1 text-base font-semibold text-slate-900">{meta.totalCount.toLocaleString()}명</p>
              </div>
              <div className="rounded-md bg-white px-3 py-2 shadow-inner">
                <p className="text-[11px] text-slate-500">단가</p>
                <p className="mt-1 text-base font-semibold text-slate-900">{meta.unitPrice.toLocaleString()}원</p>
              </div>
              <div className="rounded-md bg-white px-3 py-2 shadow-inner">
                <p className="text-[11px] text-slate-500">금액</p>
                <p className="mt-1 text-base font-semibold text-emerald-600">{meta.amount.toLocaleString()}원</p>
              </div>
            </div>
          </div>
        ) : null}

        {error ? <p className="rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p> : null}

        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-500">
            결제 정보를 불러오는 중입니다.
          </div>
        ) : data ? (
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">방문일</th>
                  <th className="px-3 py-2 text-left">서명자</th>
                  <th className="px-3 py-2 text-right">인원</th>
                  <th className="px-3 py-2 text-right">단가</th>
                  <th className="px-3 py-2 text-right">금액</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-3 py-2 text-slate-600">{format(new Date(entry.entryDate), 'yyyy-MM-dd')}</td>
                    <td className="px-3 py-2 text-slate-500">{entry.signer ?? '-'}</td>
                    <td className="px-3 py-2 text-right text-slate-600">{entry.count.toLocaleString()}명</td>
                    <td className="px-3 py-2 text-right text-slate-600">{entry.unitPrice.toLocaleString()}원</td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-900">{entry.amount.toLocaleString()}원</td>
                  </tr>
                ))}
                {data.entries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-sm text-slate-500">
                      연결된 장부 내역이 없습니다.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : !error ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-500">
            결제 정보를 준비하고 있습니다.
          </div>
        ) : null}
      </div>
    </ModalShell>
  );
}
