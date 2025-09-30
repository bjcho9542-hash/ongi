'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { getSession } from '@/lib/auth/session';
import { getServiceSupabaseClient } from '@/lib/supabase/service-client';

const createEntrySchema = z.object({
  companyId: z.string().uuid('회사 정보가 올바르지 않습니다.'),
  code: z.string().length(4, '회사 코드는 4자리여야 합니다.'),
  entryDate: z.string().regex(/\d{4}-\d{2}-\d{2}/, '날짜 형식이 올바르지 않습니다.'),
  count: z.coerce.number().int().min(1).max(20),
  signer: z.string().max(50).optional().or(z.literal('')),
});

export type CreateEntryState = {
  error?: string;
  success?: string;
};

export async function createEntry(_: CreateEntryState, formData: FormData): Promise<CreateEntryState> {
  const session = await getSession();

  if (!session) {
    return { error: '세션이 만료되었습니다. 다시 로그인해주세요.' };
  }

  const parseResult = createEntrySchema.safeParse({
    companyId: formData.get('companyId'),
    code: formData.get('code'),
    entryDate: formData.get('entryDate'),
    count: formData.get('count'),
    signer: formData.get('signer'),
  });

  if (!parseResult.success) {
    return { error: parseResult.error.issues[0]?.message ?? '입력값을 다시 확인해주세요.' };
  }

  const { companyId, code, entryDate, count, signer } = parseResult.data;

  const supabase = getServiceSupabaseClient();

  const { data: company, error: companyError } = await supabase
    .from('company')
    .select('id, code')
    .eq('id', companyId)
    .single();

  if (companyError || !company) {
    console.error('회사 조회 실패', companyError);
    return { error: '회사를 찾을 수 없습니다. 새로고침 후 다시 시도해주세요.' };
  }

  if (company.code !== code) {
    return { error: '회사 코드가 일치하지 않습니다.' };
  }

  const { error: insertError } = await supabase.from('entry').insert({
    company_id: companyId,
    entry_date: entryDate,
    count,
    signer: signer ? signer.trim() : null,
    created_by: session.sub,
  });

  if (insertError) {
    console.error('입력 등록 실패', insertError);
    return { error: '등록 중 문제가 발생했습니다. 관리자에게 문의해주세요.' };
  }

  // Log the action
  try {
    const { logAction } = await import('@/app/(protected)/actions/audit-log-actions');
    await logAction(
      'entry_created',
      `회사 등록: ${(company as any).name} (${(company as any).code}) - ${count}명`,
      {
        company_id: companyId,
        entry_date: entryDate,
        count,
        signer: signer || null,
      }
    );
  } catch (logError) {
    console.error('Failed to log entry creation:', logError);
  }

  revalidatePath('/counter', 'layout');

  return { success: '입력되었습니다.' };
}
