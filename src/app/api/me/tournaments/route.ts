import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { store } from '@/lib/tournaments/store';
import { apiError } from '@/lib/errors';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return apiError('unauthorized', 'Must be signed in');
  }

  const list = store.getUserTournaments(session.user.id);

  return NextResponse.json({
    tournaments: list,
  });
}
