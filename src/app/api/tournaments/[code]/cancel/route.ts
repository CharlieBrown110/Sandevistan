import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { store } from '@/lib/tournaments/store';
import { apiError } from '@/lib/errors';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  const session = await getSession(req);
  if (!session) {
    return apiError('unauthorized', 'Must be signed in');
  }

  store.upsertUser(session.user);

  const code = params.code;
  const res = store.cancelTournament(code, session.user.id);

  if (!res.success) {
    return apiError(res.error === 'Tournament not found' ? 'not_found' : 'forbidden', res.error || 'Cannot cancel');
  }

  return NextResponse.json({ success: true, message: 'Tournament canceled' });
}
