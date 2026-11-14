import crypto from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  username: string;
}

export interface Session {
  user: AuthUser;
  token: string;
}

export const SESSION_COOKIE_NAME = 'cyber_session_token';

// In-memory session registry (fallback for local dev & serverless runtime)
// Use globalThis to survive Next.js HMR (Hot Module Replacement) in dev mode
const globalForSessions = globalThis as unknown as { activeSessions?: Map<string, AuthUser> };
const activeSessions = globalForSessions.activeSessions ?? new Map<string, AuthUser>();
if (process.env.NODE_ENV !== 'production') {
  globalForSessions.activeSessions = activeSessions;
}

const AUTH_SECRET = process.env.BETTER_AUTH_SECRET || 'default-secret-change-in-production-12345';

/**
 * Creates a stateless signed session token containing the user payload.
 * Format: base64url(JSON) + '.' + HMAC-SHA256(payload, secret)
 * This allows ANY serverless lambda to verify the user without shared RAM.
 */
export function createSessionToken(user: AuthUser): string {
  const payload = Buffer.from(JSON.stringify(user)).toString('base64url');
  const hmac = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');
  const token = `${payload}.${hmac}`;
  // Also register in memory for fast local lookup
  activeSessions.set(token, user);
  activeSessions.set(`sess_${user.id}`, user);
  return token;
}

/**
 * Generates an edgerunner / cyberpunk style unique username.
 * 3-20 characters, [a-z0-9_]
 */
export function generateDefaultUsername(name?: string | null): string {
  const cleanBase = (name || 'runner')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .slice(0, 12);
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const candidate = `${cleanBase}_${randomSuffix}`.replace(/_+/g, '_').slice(0, 20);
  return candidate.length >= 3 ? candidate : `runner_${randomSuffix}`;
}

/**
 * Validates a username against the 3-20 char [a-z0-9_] rule.
 */
export function isValidUsername(username: string): boolean {
  return /^[a-z0-9_]{3,20}$/.test(username);
}

export function registerSession(token: string, user: AuthUser) {
  activeSessions.set(token, user);
}

export function removeSession(token: string) {
  activeSessions.delete(token);
}

export function getUserFromToken(token: string): AuthUser | null {
  if (!token) return null;

  // 1. Check in-memory map
  if (activeSessions.has(token)) {
    return activeSessions.get(token)!;
  }

  // 2. If it's a signed token (payload.signature)
  if (token.includes('.')) {
    try {
      const [payload, sig] = token.split('.');
      if (!payload || !sig) return null;

      const expectedSig = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');
      const sigBuf = Buffer.from(sig);
      const expectedBuf = Buffer.from(expectedSig);
      if (sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf)) {
        const userJson = Buffer.from(payload, 'base64url').toString('utf8');
        const user = JSON.parse(userJson) as AuthUser;
        // Cache in memory for this container's lifetime
        activeSessions.set(token, user);
        return user;
      }
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Reads session from incoming NextRequest or Next.js headers/cookies.
 */
export async function getSession(req?: NextRequest): Promise<Session | null> {
  let token: string | undefined;

  if (req) {
    token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      const authHeader = req.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
  } else {
    try {
      const cookieStore = cookies();
      token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    } catch {
      // In contexts without cookies()
    }
  }

  if (!token) {
    return null;
  }

  const user = getUserFromToken(token);
  if (!user) {
    return null;
  }

  return { user, token };
}
