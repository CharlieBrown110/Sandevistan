import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession, isValidUsername, createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { store } from '@/lib/tournaments/store';
import { apiError } from '@/lib/errors';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const updateUsernameSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-z0-9_]+$/, 'Username must be lowercase letters, numbers, or underscores'),
});

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return apiError('unauthorized', 'Must be signed in');
  }

  let user = store.getUser(session.user.id);
  if (!user) {
    user = store.upsertUser(session.user);
  }

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      username: user.username,
      createdAt: user.createdAt,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return apiError('unauthorized', 'Must be signed in');
  }

  const body = await req.json().catch(() => ({}));
  const parseResult = updateUsernameSchema.safeParse(body);

  if (!parseResult.success) {
    return apiError('validation', parseResult.error.errors[0]?.message || 'Invalid username');
  }

  const newUsername = parseResult.data.username.toLowerCase();

  // Ensure user is present in store for this container
  if (!store.getUser(session.user.id)) {
    store.upsertUser(session.user);
  }

  const updateRes = store.updateUsername(session.user.id, newUsername);

  if (!updateRes.success) {
    return apiError('validation', updateRes.error || 'Username already taken', 400);
  }

  const updatedUser = {
    ...session.user,
    username: newUsername,
  };
  store.upsertUser(updatedUser);

  // Issue new session token with updated username so cookies reflect new username
  const newToken = createSessionToken(updatedUser);

  const res = NextResponse.json({
    success: true,
    user: updatedUser,
  });

  res.cookies.set(SESSION_COOKIE_NAME, newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  });

  return res;
}
