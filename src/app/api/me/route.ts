import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession, isValidUsername } from '@/lib/auth';
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

  const user = store.getUser(session.user.id);
  if (!user) {
    return apiError('not_found', 'User not found');
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
  const updateRes = store.updateUsername(session.user.id, newUsername);

  if (!updateRes.success) {
    return apiError('validation', updateRes.error || 'Username already taken', 400);
  }

  const updatedUser = store.getUser(session.user.id);

  return NextResponse.json({
    success: true,
    user: updatedUser,
  });
}
