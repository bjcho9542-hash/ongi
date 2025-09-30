// @ts-nocheck
'use server';

import { getSession } from '@/lib/auth/session';
import { getServiceSupabaseClient } from '@/lib/supabase/service-client';

export type AuditLogEntry = {
  id: string;
  action: string;
  description: string;
  user_id: string;
  user_name: string;
  created_at: string;
  metadata?: Record<string, any>;
};

export async function createAuditLog(
  action: string,
  description: string,
  metadata?: Record<string, any>
): Promise<{ success?: string; error?: string }> {
  try {
    const session = await getSession();
    if (!session) {
      return { error: '인증되지 않은 사용자입니다.' };
    }

    const supabase = getServiceSupabaseClient();

    // TODO: Implement actual audit log creation
    // For now, this is a placeholder that would insert into an audit_log table
    const { error } = await (supabase as any)
      .from('audit_log')
      .insert({
        action,
        description,
        user_id: session.sub,
        user_name: session.name ?? 'Unknown User',
        metadata,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Failed to create audit log:', error);
      return { error: '감사 로그 생성에 실패했습니다.' };
    }

    return { success: '감사 로그가 생성되었습니다.' };
  } catch (error) {
    console.error('Audit log creation error:', error);
    return { error: '감사 로그 생성 중 오류가 발생했습니다.' };
  }
}

export async function getAuditLogs(
  limit: number = 50,
  offset: number = 0
): Promise<{ data?: AuditLogEntry[]; error?: string }> {
  try {
    const session = await getSession();
    if (!session) {
      return { error: '인증되지 않은 사용자입니다.' };
    }

    const supabase = getServiceSupabaseClient();

    // TODO: Implement actual audit log fetching
    // For now, return mock data
    const mockData: AuditLogEntry[] = [
      {
        id: '1',
        action: 'entry_created',
        description: '회사 등록: 삼성전자 (1234) - 5명',
        user_id: session.sub,
        user_name: session.name ?? 'Unknown User',
        created_at: new Date().toISOString(),
        metadata: { company_id: '1', count: 5 },
      },
      {
        id: '2',
        action: 'payment_completed',
        description: '결제 완료: 삼성전자 (1234) - 40,000원',
        user_id: session.sub,
        user_name: session.name ?? 'Unknown User',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        metadata: { company_id: '1', amount: 40000 },
      },
      {
        id: '3',
        action: 'company_created',
        description: '새 회사 등록: LG전자 (5678)',
        user_id: session.sub,
        user_name: session.name ?? 'Unknown User',
        created_at: new Date(Date.now() - 7200000).toISOString(),
        metadata: { company_id: '2', company_name: 'LG전자', company_code: '5678' },
      },
    ];

    return { data: mockData.slice(offset, offset + limit) };
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    return { error: '감사 로그를 불러오는데 실패했습니다.' };
  }
}

export async function getAuditLogsByUser(
  userId: string,
  limit: number = 50
): Promise<{ data?: AuditLogEntry[]; error?: string }> {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return { error: '관리자 권한이 필요합니다.' };
    }

    // TODO: Implement actual user-specific audit log fetching
    // For now, return filtered mock data
    const allLogs = await getAuditLogs(100);
    if (allLogs.error) {
      return allLogs;
    }

    const userLogs = allLogs.data?.filter(log => log.user_id === userId).slice(0, limit);
    return { data: userLogs };
  } catch (error) {
    console.error('Failed to fetch user audit logs:', error);
    return { error: '사용자 감사 로그를 불러오는데 실패했습니다.' };
  }
}

// Helper function to be called from other actions when important events occur
export async function logAction(action: string, description: string, metadata?: Record<string, any>) {
  // This is a fire-and-forget logging function
  try {
    await createAuditLog(action, description, metadata);
  } catch (error) {
    // Don't throw errors for logging failures
    console.error('Failed to log action:', error);
  }
}