'use server';

import { z } from 'zod';

import { getSession } from '@/lib/auth/session';
import { getServiceSupabaseClient } from '@/lib/supabase/service-client';

const paymentDetailSchema = z.object({
  paymentId: z.string().uuid('결제 정보가 올바르지 않습니다.'),
});

export type PaymentDetailEntry = {
  id: string;
  entryDate: string;
  count: number;
  signer: string | null;
  unitPrice: number;
  amount: number;
};

export type PaymentDetailResult = {
  id: string;
  companyId: string;
  companyName: string;
  companyCode: string;
  fromDate: string;
  toDate: string;
  paidAt: string | null;
  totalCount: number;
  unitPrice: number;
  totalAmount: number;
  entries: PaymentDetailEntry[];
};

export async function getPaymentDetail(paymentId: string): Promise<PaymentDetailResult> {
  const session = await getSession();

  if (!session || session.role !== 'admin') {
    throw new Error('관리자 권한이 필요합니다.');
  }

  const parsed = paymentDetailSchema.safeParse({ paymentId });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? '결제 정보가 올바르지 않습니다.');
  }

  const supabase = getServiceSupabaseClient();

  const { data: paymentRow, error: paymentError } = await supabase
    .from('payment')
    .select(
      'id, company_id, from_date, to_date, total_count, total_amount, unit_price, paid_at, company:company(name, code)'
    )
    .eq('id', paymentId)
    .maybeSingle();

  if (paymentError || !paymentRow) {
    console.error('payment detail fetch error', paymentError);
    throw new Error('결제 정보를 찾을 수 없습니다.');
  }

  const { data: entryRows, error: entryError } = await supabase
    .from('entry')
    .select('id, entry_date, count, signer')
    .eq('payment_id', paymentId)
    .order('entry_date', { ascending: true });

  if (entryError) {
    console.error('payment detail entry fetch error', entryError);
    throw new Error('장부 내역을 불러오지 못했습니다.');
  }

  const payment: any = paymentRow;

  const entries: PaymentDetailEntry[] = (entryRows ?? []).map((entry) => ({
    id: entry.id,
    entryDate: entry.entry_date,
    count: entry.count,
    signer: entry.signer ?? null,
    unitPrice: payment.unit_price,
    amount: entry.count * payment.unit_price,
  }));

  return {
    id: payment.id,
    companyId: payment.company_id,
    companyName: payment.company?.name ?? '미등록 회사',
    companyCode: payment.company?.code ?? '----',
    fromDate: payment.from_date,
    toDate: payment.to_date,
    paidAt: payment.paid_at,
    totalCount: payment.total_count,
    unitPrice: payment.unit_price,
    totalAmount: payment.total_amount,
    entries,
  };
}
