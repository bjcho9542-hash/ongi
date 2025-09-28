'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';

import { getServiceSupabaseClient } from '@/lib/supabase/service-client';
import { getSession } from '@/lib/auth/session';

const prepareSchema = z.object({
  entryIds: z.array(z.string().uuid()).min(1),
});

function addDays(dateString: string, days: number) {
  const date = parseISO(dateString);
  date.setUTCDate(date.getUTCDate() + days);
  return format(date, 'yyyy-MM-dd');
}

export type PaymentPreparationResult = {
  companyId: string;
  companyName: string;
  fromDate: string;
  toDate: string;
  totalCount: number;
  unitPrice: number;
};

export async function preparePayment(entryIds: string[]): Promise<PaymentPreparationResult> {
  const session = await getSession();

  if (!session) {
    throw new Error('세션이 만료되었습니다. 다시 로그인해주세요.');
  }

  const parseResult = prepareSchema.safeParse({ entryIds });
  if (!parseResult.success) {
    throw new Error('결제 준비 요청이 올바르지 않습니다.');
  }

  const supabase = getServiceSupabaseClient();

  const { data: entryRows, error: entryError } = await supabase
    .from('entry')
    .select('id, company_id, entry_date, count, is_paid, company:company(name)')
    .in('id', entryIds);

  if (entryError || !entryRows || entryRows.length === 0) {
    throw new Error('선택된 장부를 불러오지 못했습니다.');
  }

  if (entryRows.some((entry) => entry.is_paid)) {
    throw new Error('이미 결제 처리된 항목이 포함되어 있습니다.');
  }

  const companyIds = new Set(entryRows.map((entry) => entry.company_id));
  if (companyIds.size !== 1) {
    throw new Error('동일한 회사의 항목만 선택할 수 있습니다.');
  }

  const companyId = entryRows[0].company_id;
  const companyName = entryRows[0].company?.name ?? '미등록 회사';

  const { data: lastPayment } = await supabase
    .from('payment')
    .select('to_date')
    .eq('company_id', companyId)
    .order('to_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  const earliestEntryDate = entryRows.reduce((earliest, entry) =>
    entry.entry_date < earliest ? entry.entry_date : earliest,
  entryRows[0].entry_date);

  const fromDate = lastPayment?.to_date ? addDays(lastPayment.to_date, 1) : earliestEntryDate;
  const today = format(new Date(), 'yyyy-MM-dd');
  const totalCount = entryRows.reduce((sum, entry) => sum + entry.count, 0);

  return {
    companyId,
    companyName,
    fromDate,
    toDate: today,
    totalCount,
    unitPrice: 8000,
  };
}

const completeSchema = z.object({
  entryIds: z.array(z.string().uuid()).min(1),
  toDate: z.string().regex(/\d{4}-\d{2}-\d{2}/),
  unitPrice: z.coerce.number().int().min(0),
});

const receiptSchema = z.object({
  paymentId: z.string().uuid('결제 정보가 올바르지 않습니다.'),
});

export type CompletePaymentState = {
  error?: string;
  success?: string;
};

export async function completePayment(_: CompletePaymentState, formData: FormData): Promise<CompletePaymentState> {
  const session = await getSession();

  if (!session) {
    return { error: '세션이 만료되었습니다. 다시 로그인해주세요.' };
  }

  const rawEntryIds = formData.getAll('entryIds');
  const parsed = completeSchema.safeParse({
    entryIds: rawEntryIds.map(String),
    toDate: formData.get('toDate'),
    unitPrice: formData.get('unitPrice'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? '결제 정보가 올바르지 않습니다.' };
  }

  const { entryIds, toDate, unitPrice } = parsed.data;
  const supabase = getServiceSupabaseClient();

  const { data: entryRows, error: entryError } = await supabase
    .from('entry')
    .select('id, company_id, entry_date, count, is_paid')
    .in('id', entryIds);

  if (entryError || !entryRows || entryRows.length === 0) {
    return { error: '선택된 장부를 불러오지 못했습니다.' };
  }

  if (entryRows.some((entry) => entry.is_paid)) {
    return { error: '이미 결제 처리된 항목이 포함되어 있습니다.' };
  }

  const companyIds = new Set(entryRows.map((entry) => entry.company_id));
  if (companyIds.size !== 1) {
    return { error: '동일한 회사의 항목만 결제할 수 있습니다.' };
  }

  const companyId = entryRows[0].company_id;
  const earliestEntryDate = entryRows.reduce((earliest, entry) =>
    entry.entry_date < earliest ? entry.entry_date : earliest,
  entryRows[0].entry_date);
  const latestEntryDate = entryRows.reduce((latest, entry) =>
    entry.entry_date > latest ? entry.entry_date : latest,
  entryRows[0].entry_date);

  const { data: lastPayment } = await supabase
    .from('payment')
    .select('to_date')
    .eq('company_id', companyId)
    .order('to_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  const expectedFromDate = lastPayment?.to_date ? addDays(lastPayment.to_date, 1) : earliestEntryDate;

  if (toDate < latestEntryDate) {
    return { error: '종료일은 선택한 장부의 가장 최근 날짜보다 빠를 수 없습니다.' };
  }

  const totalCount = entryRows.reduce((sum, entry) => sum + entry.count, 0);

  const { data: paymentRow, error: paymentError } = await supabase
    .from('payment')
    .insert({
      company_id: companyId,
      from_date: expectedFromDate,
      to_date: toDate,
      total_count: totalCount,
      unit_price: unitPrice,
      paid_by: session.sub,
    })
    .select('id')
    .single();

  if (paymentError || !paymentRow) {
    console.error('payment insert error', paymentError);
    return { error: '결제 정보를 저장하지 못했습니다.' };
  }

  const receiptFile = formData.get('receipt');
  let receiptPath: string | null = null;

  if (receiptFile instanceof File && receiptFile.size > 0) {
    const arrayBuffer = await receiptFile.arrayBuffer();
    const ext = receiptFile.name.split('.').pop() ?? 'jpg';
    const safeName = `${paymentRow.id}.${ext}`;
    const filePath = `${companyId}/${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(filePath, arrayBuffer, {
        contentType: receiptFile.type || 'application/octet-stream',
        upsert: true,
      });

    if (uploadError) {
      console.error('receipt upload error', uploadError);
      return { error: '영수증 업로드에 실패했습니다.' };
    }

    receiptPath = filePath;

    await supabase.from('receipt').insert({
      payment_id: paymentRow.id,
      file_path: filePath,
      uploaded_by: session.sub,
    });

    await supabase
      .from('payment')
      .update({ receipt_url: filePath })
      .eq('id', paymentRow.id);
  }

  const { error: updateError } = await supabase
    .from('entry')
    .update({ is_paid: true, payment_id: paymentRow.id })
    .in('id', entryIds);

  if (updateError) {
    console.error('entry update error', updateError);
    return { error: '장부 업데이트에 실패했습니다. 관리자에게 문의해주세요.' };
  }

  // Log the payment completion
  try {
    const { logAction } = await import('@/app/(protected)/actions/audit-log-actions');

    // Get company info for logging
    const { data: companyData } = await supabase
      .from('company')
      .select('name, code')
      .eq('id', companyId)
      .single();

    const companyName = (companyData as any)?.name ?? 'Unknown Company';
    const companyCode = (companyData as any)?.code ?? '----';
    const totalAmount = totalCount * unitPrice;

    await logAction(
      'payment_completed',
      `결제 완료: ${companyName} (${companyCode}) - ${totalAmount.toLocaleString()}원`,
      {
        payment_id: paymentRow.id,
        company_id: companyId,
        total_count: totalCount,
        unit_price: unitPrice,
        total_amount: totalAmount,
        from_date: fromDate,
        to_date: toDate,
        has_receipt: !!receiptPath,
      }
    );
  } catch (logError) {
    console.error('Failed to log payment completion:', logError);
  }

  revalidatePath('/counter', 'layout');

  return {
    success: `결제 완료 (${totalCount.toLocaleString()}명, ${unitPrice.toLocaleString()}원 단가)` +
      (receiptPath ? '\n영수증이 업로드되었습니다.' : ''),
  };
}

export async function getReceiptSignedUrl(paymentId: string): Promise<{ url: string }> {
  const session = await getSession();

  if (!session) {
    throw new Error('세션이 만료되었습니다. 다시 로그인해주세요.');
  }

  const parsed = receiptSchema.safeParse({ paymentId });

  if (!parsed.success) {
    throw new Error('영수증 조회 요청이 올바르지 않습니다.');
  }

  const supabase = getServiceSupabaseClient();

  const { data: payment, error: paymentError } = await supabase
    .from('payment')
    .select('id, receipt_url')
    .eq('id', parsed.data.paymentId)
    .maybeSingle();

  if (paymentError || !payment) {
    console.error('payment fetch error', paymentError);
    throw new Error('결제 정보를 찾을 수 없습니다. 새로고침 후 다시 시도해주세요.');
  }

  if (!payment.receipt_url) {
    throw new Error('첨부된 영수증이 없습니다.');
  }

  const { data: signed, error: signedError } = await supabase.storage
    .from('receipts')
    .createSignedUrl(payment.receipt_url, 60 * 10);

  if (signedError || !signed?.signedUrl) {
    console.error('signed url error', signedError);
    throw new Error('영수증 링크를 생성하지 못했습니다. 관리자에게 문의해주세요.');
  }

  return { url: signed.signedUrl };
}
