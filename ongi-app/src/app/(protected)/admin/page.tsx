import { format } from 'date-fns';
import { redirect } from 'next/navigation';

import { AdminCompanyManager } from '@/components/admin/admin-company-manager';
import type { CompanySummary, PaymentSummary } from '@/components/counter/counter-dashboard';
import { getSession } from '@/lib/auth/session';
import { getServiceSupabaseClient } from '@/lib/supabase/service-client';

export const revalidate = 0;

export default async function AdminPage() {
  const session = await getSession();

  if (!session || session.role !== 'admin') {
    redirect('/');
  }

  const supabase = getServiceSupabaseClient();
  const now = new Date();
  const monthStart = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');

  const [companyRes, recentPaymentRes, monthlySumRes, overallSumRes] = await Promise.all([
    supabase
      .from('company')
      .select('id, name, code, contact_name, contact_phone, business_number, address')
      .order('name', { ascending: true }),
    supabase
      .from('payment')
      .select(
        'id, company_id, from_date, to_date, total_count, total_amount, unit_price, paid_at, receipt_url, company:company(name, code)'
      )
      .order('paid_at', { ascending: false })
      .limit(12),
    supabase
      .from('payment')
      .select('total_amount')
      .gte('paid_at', monthStart),
    supabase
      .from('payment')
      .select('total_amount'),
  ]);

  const companies: CompanySummary[] = (companyRes.data ?? []).map((company) => ({
    id: company.id,
    name: company.name,
    code: company.code,
    contactName: company.contact_name,
    contactPhone: company.contact_phone,
    businessNumber: company.business_number ?? null,
    address: company.address ?? null,
  }));

  const recentPayments: (PaymentSummary & { companyName: string; companyCode: string })[] = (recentPaymentRes.data ?? []).map(
    (payment) => ({
      id: payment.id,
      companyId: payment.company_id,
      fromDate: payment.from_date,
      toDate: payment.to_date,
      totalCount: payment.total_count,
      totalAmount: payment.total_amount,
      unitPrice: payment.unit_price,
      paidAt: payment.paid_at,
      receiptUrl: payment.receipt_url,
      companyName: payment.company?.name ?? '미등록',
      companyCode: payment.company?.code ?? '----',
    }),
  );

  const monthlyTotal = (monthlySumRes.data ?? []).reduce((sum, row) => sum + (row.total_amount ?? 0), 0);
  const overallTotal = (overallSumRes.data ?? []).reduce((sum, row) => sum + (row.total_amount ?? 0), 0);

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">관리자 대시보드</h1>
        <p className="mt-1 text-sm text-slate-500">총 매출과 최근 결제 내역을 한눈에 확인하세요.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs text-slate-500">이번 달 매출</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{monthlyTotal.toLocaleString()}원</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs text-slate-500">누적 매출</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{overallTotal.toLocaleString()}원</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs text-slate-500">등록된 회사</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{companies.length}곳</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs text-slate-500">최근 결제</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{recentPayments.length}건</p>
          </div>
        </div>
      </div>

      <AdminCompanyManager companies={companies} />

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">최근 결제 내역</h2>
        <p className="mt-1 text-sm text-slate-500">최근 12건의 결제 이력을 확인할 수 있습니다.</p>
        <div className="mt-4 overflow-x-auto">
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
              {recentPayments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-3 py-2 font-medium text-slate-900">
                    {payment.companyName}
                    <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-500">
                      {payment.companyCode}
                    </span>
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
                  <td className="px-3 py-2 text-slate-500">
                    {payment.receiptUrl ? <span className="text-emerald-600">첨부됨</span> : '-'}
                  </td>
                </tr>
              ))}
              {recentPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-sm text-slate-500">
                    결제 내역이 없습니다.
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
