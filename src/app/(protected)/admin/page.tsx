import { format } from 'date-fns';
import { redirect } from 'next/navigation';

import { AdminDashboard, type AdminPaymentRow } from '@/components/admin/admin-dashboard';
import type { CompanySummary } from '@/components/counter/counter-dashboard';
import { getSession } from '@/lib/auth/session';
import { getServiceSupabaseClient } from '@/lib/supabase/service-client';

export const revalidate = 0;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function toStringParam(value: string | string[] | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await getSession();

  if (!session || session.role !== 'admin') {
    redirect('/');
  }

  const now = new Date();
  const defaultStart = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
  const defaultEnd = format(now, 'yyyy-MM-dd');

  const companyQuery = (toStringParam(searchParams.company) ?? '').trim();
  const startParam = toStringParam(searchParams.start);
  const endParam = toStringParam(searchParams.end);

  let startDate = startParam && DATE_PATTERN.test(startParam) ? startParam : defaultStart;
  let endDate = endParam && DATE_PATTERN.test(endParam) ? endParam : defaultEnd;

  if (startDate > endDate) {
    const temp = startDate;
    startDate = endDate;
    endDate = temp;
  }

  const supabase = getServiceSupabaseClient();

  const [companyRes, paymentRes] = await Promise.all([
    supabase
      .from('company')
      .select('id, name, code, contact_name, contact_phone, business_number, address')
      .order('name', { ascending: true }),
    supabase
      .from('payment')
      .select(
        'id, company_id, from_date, to_date, total_count, total_amount, unit_price, paid_at, receipt_url, company:company(name, code)'
      )
      .gte('paid_at', `${startDate}T00:00:00`)
      .lte('paid_at', `${endDate}T23:59:59`)
      .order('paid_at', { ascending: false }),
  ]);

  const companies: CompanySummary[] = (companyRes.data ?? []).map((company) => ({
    id: (company as any).id,
    name: (company as any).name,
    code: (company as any).code,
    contactName: (company as any).contact_name,
    contactPhone: (company as any).contact_phone,
    businessNumber: (company as any).business_number ?? null,
    address: (company as any).address ?? null,
  }));

  const payments: AdminPaymentRow[] = (paymentRes.data ?? [])
    .map((payment) => ({
      id: (payment as any).id,
      companyId: (payment as any).company_id,
      companyName: (payment as any).company?.name ?? '미등록 회사',
      companyCode: (payment as any).company?.code ?? '----',
      fromDate: (payment as any).from_date,
      toDate: (payment as any).to_date,
      totalCount: (payment as any).total_count,
      totalAmount: (payment as any).total_amount,
      unitPrice: (payment as any).unit_price,
      paidAt: (payment as any).paid_at,
      receiptUrl: (payment as any).receipt_url,
    }))
    .filter((payment) => {
      if (!companyQuery) {
        return true;
      }
      const keyword = companyQuery.toLowerCase();
      const haystack = `${payment.companyName} ${payment.companyCode}`.toLowerCase();
      return haystack.includes(keyword);
    });

  return (
    <AdminDashboard
      companies={companies}
      payments={payments}
      searchDefaults={{ company: companyQuery, start: startDate, end: endDate }}
    />
  );
}
