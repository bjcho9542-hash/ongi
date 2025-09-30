import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { env } from '@/env';

const SESSION_COOKIE = 'ongi.session';
const SESSION_DURATION = 60 * 60 * 24 * 7; // 7 days

type SessionPayload = {
  sub: string;
  role: 'admin' | 'counter';
  name: string | null;
};

export type SessionData = SessionPayload & {
  issuedAt: number;
  expiresAt: number;
};

async function getSecretKey() {
  return new TextEncoder().encode(env.server.AUTH_SECRET);
}

export async function createSession(payload: SessionPayload) {
  const secret = await getSecretKey();
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + SESSION_DURATION;

  const token = await new SignJWT({
    ...payload,
    issuedAt,
    expiresAt,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(issuedAt)
    .setExpirationTime(expiresAt)
    .sign(secret);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_DURATION,
    path: '/',
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: new Date(0),
    path: '/',
  });
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  try {
    const secret = await getSecretKey();
    const { payload } = await jwtVerify<SessionData>(token, secret);

    if (!payload.sub || !payload.role || !payload.expiresAt) {
      return null;
    }

    if (payload.expiresAt < Math.floor(Date.now() / 1000)) {
      await clearSession();
      return null;
    }

    return {
      sub: payload.sub,
      role: payload.role,
      name: payload.name ?? null,
      issuedAt: payload.issuedAt ?? 0,
      expiresAt: payload.expiresAt,
    };
  } catch (error) {
    console.error('Failed to verify session', error);
    await clearSession();
    return null;
  }
}
