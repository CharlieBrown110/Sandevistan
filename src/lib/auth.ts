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

// In-memory session registry (fallback for local dev & serverless runtime)
// Use globalThis to survive Next.js HMR (Hot Module Replacement) in dev mode
const globalForSessions = globalThis as unknown as { activeSessions?: Map<string, AuthUser> };
const activeSessions = globalForSessions.activeSessions ?? new Map<string, AuthUser>();
if (process.env.NODE_ENV !== 'production') {
  globalForSessions.activeSessions = activeSessions;
}

export function registerSession(token: string, user: AuthUser) {
  activeSessions.set(token, user);
}

export function removeSession(token: string) {
  activeSessions.delete(token);
}

export function getUserFromToken(token: string): AuthUser | null {
  return activeSessions.get(token) || null;
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
