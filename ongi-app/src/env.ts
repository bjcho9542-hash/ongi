import { z } from 'zod';

const baseSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url({ message: 'NEXT_PUBLIC_SUPABASE_URL must be a valid URL' }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
});

const serverSchema = baseSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required on the server'),
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET must be at least 32 characters for session signing'),
});

const clientEnv = baseSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

const serverEnv = serverSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  AUTH_SECRET: process.env.AUTH_SECRET,
});

if (!clientEnv.success) {
  console.error('Invalid client environment variables', clientEnv.error.flatten().fieldErrors);
  throw new Error('Invalid client environment variables');
}

if (!serverEnv.success) {
  console.error('Invalid server environment variables', serverEnv.error.flatten().fieldErrors);
  throw new Error('Invalid server environment variables');
}

export const env = {
  client: clientEnv.data,
  server: serverEnv.data,
};
