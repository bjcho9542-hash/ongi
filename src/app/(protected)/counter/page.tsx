import { format } from 'date-fns';

import {
  CounterDashboard,
  type CompanySummary,
  type LedgerEntry,
  type PaymentSummary,
} from '@/components/counter/counter-dashboard';
import { getServiceSupabaseClient } from '@/lib/supabase/service-client';

function getYearMonth(searchParams: Record<string, string | string[] | undefined>) {
  const now = new Date();
  const rawYear = searchParams.year;
  const rawMonth = searchParams.month;

  const year = Number(Array.isArray(rawYear) ? rawYear[0] : rawYear) || now.getFullYear();
  const month = Number(Array.isArray(rawMonth) ? rawMonth[0] : rawMonth) || now.getMonth() + 1;

  return {
    year,
    month: Math.min(Math.max(month, 1), 12),
  };
}

export default async function CounterPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { year, month } = getYearMonth(searchParams);
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 0));
  const startDate = format(monthStart, 'yyyy-MM-dd');
  const endDate = format(monthEnd, 'yyyy-MM-dd');

  const supabase = getServiceSupabaseClient();

  const [{ data: companyRows }, { data: entryRows }, { data: paymentRows }, { data: prevUnpaidRows }] = await Promise.all([
    supabase
      .from('company')
      .select('id, name, code, contact_name, contact_phone, business_number, address')
      .order('name', { ascending: true }),
    supabase
      .from('entry')
      .select(
        'id, company_id, entry_date, count, signer, is_paid, payment_id, company:company(id, name, code)'
      )
      .gte('entry_date', startDate)
      .lte('entry_date', endDate)
      .order('entry_date', { ascending: false }),
    supabase
      .from('payment')
      .select('id, company_id, from_date, to_date, total_count, total_amount, unit_price, paid_at, receipt_url')
      .gte('from_date', startDate)
      .lte('to_date', endDate)
      .order('paid_at', { ascending: false }),
    supabase
      .from('entry')
      .select(
        'id, company_id, entry_date, count, signer, is_paid, payment_id, company:company(id, name, code)'
      )
      .lt('entry_date', startDate)
      .is('is_paid', false)
      .order('entry_date', { ascending: false }),
  ]);

  const companies: CompanySummary[] = (companyRows ?? []).map((company) => ({
    id: company.id,
    name: company.name,
    code: company.code,
    contactName: company.contact_name,
    contactPhone: company.contact_phone,
    businessNumber: company.business_number ?? null,
    address: company.address ?? null,
  }));

  const entries: LedgerEntry[] = (entryRows ?? []).map((entry) => ({
    id: entry.id,
    companyId: entry.company_id,
    companyName: entry.company?.name ?? '미기록 회사',
    companyCode: entry.company?.code ?? '----',
    entryDate: entry.entry_date,
    count: entry.count,
    signer: entry.signer,
    isPaid: entry.is_paid ?? false,
    paymentId: entry.payment_id,
  }));

  const prevUnpaidEntries: LedgerEntry[] = (prevUnpaidRows ?? []).map((entry) => ({
    id: entry.id,
    companyId: entry.company_id,
    companyName: entry.company?.name ?? '미기록 회사',
    companyCode: entry.company?.code ?? '----',
    entryDate: entry.entry_date,
    count: entry.count,
    signer: entry.signer,
    isPaid: entry.is_paid ?? false,
    paymentId: entry.payment_id,
  }));

  const payments: PaymentSummary[] = (paymentRows ?? []).map((payment) => ({
    id: payment.id,
    companyId: payment.company_id,
    fromDate: payment.from_date,
    toDate: payment.to_date,
    totalCount: payment.total_count,
    totalAmount: payment.total_amount,
    unitPrice: payment.unit_price,
    paidAt: payment.paid_at,
    receiptUrl: payment.receipt_url,
  }));

  return (
    <CounterDashboard
      companies={companies}
      entries={entries}
      prevUnpaidEntries={prevUnpaidEntries}
      payments={payments}
      selectedYear={year}
      selectedMonth={month}
    />
  );
}
