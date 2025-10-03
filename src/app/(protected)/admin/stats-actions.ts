'use server';

import { format } from 'date-fns';
import { getServiceSupabaseClient } from '@/lib/supabase/service-client';

export type CompanyStats = {
  companyId: string;
  companyName: string;
  todayCount: number;
  monthCount: number;
};

export async function getTodayVisitStats(): Promise<CompanyStats[]> {
  const today = format(new Date(), 'yyyy-MM-dd');
  const monthStart = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd');
  const monthEnd = format(new Date(), 'yyyy-MM-dd');

  const supabase = getServiceSupabaseClient();

  // Get all companies
  const { data: companies } = await supabase
    .from('company')
    .select('id, name')
    .order('name', { ascending: true });

  if (!companies || companies.length === 0) {
    return [];
  }

  // Get stats for each company
  const companyStats = await Promise.all(
    companies.map(async (company: any) => {
      const [todayResult, monthResult] = await Promise.all([
        supabase
          .from('entry')
          .select('count')
          .eq('company_id', company.id)
          .eq('entry_date', today),
        supabase
          .from('entry')
          .select('count')
          .eq('company_id', company.id)
          .gte('entry_date', monthStart)
          .lte('entry_date', monthEnd),
      ]);

      const todayCount = (todayResult.data ?? []).reduce((sum: number, e: any) => sum + e.count, 0);
      const monthCount = (monthResult.data ?? []).reduce((sum: number, e: any) => sum + e.count, 0);

      return {
        companyId: company.id,
        companyName: company.name,
        todayCount,
        monthCount,
      };
    })
  );

  return companyStats
    .filter(s => s.monthCount > 0)
    .sort((a, b) => b.todayCount - a.todayCount);
}
