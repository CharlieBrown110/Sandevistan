import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { store } from '@/lib/tournaments/store';
import { apiError } from '@/lib/errors';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  const session = await getSession(req);
  if (!session) {
    return apiError('unauthorized', 'Must be signed in to join tournament');
  }

  const code = params.code;
  const tournament = store.getTournamentByCode(code);
  if (!tournament) {
    return apiError('not_found', 'Tournament not found');
  }

  const res = store.joinTournament(tournament.id, session.user.id);
  if (!res.success) {
    if (res.error === 'Tournament is full') {
      return apiError('full', 'Tournament has reached maximum participants cap');
    }
    return apiError('not_active', res.error || 'Cannot join tournament');
  }

  return NextResponse.json({ success: true, message: 'Successfully joined tournament' });
}
