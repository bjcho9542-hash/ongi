import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/env';
import type { Database } from '@/types/supabase';

let cachedClient: SupabaseClient<Database> | null = null;

export function getServiceSupabaseClient(): SupabaseClient<Database> {
  if (cachedClient) {
    return cachedClient;
  }

  cachedClient = createClient<Database>(
    env.server.NEXT_PUBLIC_SUPABASE_URL,
    env.server.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
      },
    },
  );

  return cachedClient;
}
