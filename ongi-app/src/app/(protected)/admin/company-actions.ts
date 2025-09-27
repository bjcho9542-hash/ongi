'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { getSession } from '@/lib/auth/session';
import { getServiceSupabaseClient } from '@/lib/supabase/service-client';

const companySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, '회사명을 입력해주세요.'),
  code: z.string().length(4, '코드는 4자리여야 합니다.'),
  contactName: z.string().max(50).optional(),
  contactPhone: z.string().max(30).optional(),
  businessNumber: z.string().max(20).optional(),
  address: z.string().max(200).optional(),
});

export type CompanyFormState = {
  error?: string;
  success?: string;
};

export async function upsertCompany(_: CompanyFormState, formData: FormData): Promise<CompanyFormState> {
  const session = await getSession();

  if (!session || session.role !== 'admin') {
    return { error: '관리자 권한이 필요합니다.' };
  }

  const parseResult = companySchema.safeParse({
    id: formData.get('id') ? String(formData.get('id')) : undefined,
    name: formData.get('name'),
    code: formData.get('code'),
    contactName: formData.get('contactName'),
    contactPhone: formData.get('contactPhone'),
    businessNumber: formData.get('businessNumber'),
    address: formData.get('address'),
  });

  if (!parseResult.success) {
    return { error: parseResult.error.issues[0]?.message ?? '입력값을 확인해주세요.' };
  }

  const { id, name, code, contactName, contactPhone, businessNumber, address } = parseResult.data;
  const supabase = getServiceSupabaseClient();

  if (id) {
    const { error } = await supabase
      .from('company')
      .update({
        name,
        code,
        contact_name: contactName ?? null,
        contact_phone: contactPhone ?? null,
        business_number: businessNumber ?? null,
        address: address ?? null,
      })
      .eq('id', id);

    if (error) {
      console.error('company update error', error);
      return { error: '회사 정보를 수정하지 못했습니다.' };
    }

    revalidatePath('/admin');
    return { success: '회사 정보가 수정되었습니다.' };
  }

  const { error } = await supabase.from('company').insert({
    name,
    code,
    contact_name: contactName ?? null,
    contact_phone: contactPhone ?? null,
    business_number: businessNumber ?? null,
    address: address ?? null,
  });

  if (error) {
    console.error('company insert error', error);
    return { error: error.code === '23505' ? '이미 사용 중인 회사 코드입니다.' : '회사 등록에 실패했습니다.' };
  }

  revalidatePath('/admin');
  return { success: '회사가 등록되었습니다.' };
}

export async function deleteCompany(id: string): Promise<{ error?: string; success?: string }> {
  const session = await getSession();

  if (!session || session.role !== 'admin') {
    return { error: '관리자 권한이 필요합니다.' };
  }

  const supabase = getServiceSupabaseClient();
  const { error } = await supabase.from('company').delete().eq('id', id);

  if (error) {
    console.error('company delete error', error);
    return { error: '회사 삭제에 실패했습니다.' };
  }

  revalidatePath('/admin');
  return { success: '회사가 삭제되었습니다.' };
}
