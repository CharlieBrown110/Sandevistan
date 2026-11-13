import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/tournaments/store';
import { apiError } from '@/lib/errors';
import { getTournamentStatus } from '@/lib/tournaments/status';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const code = params.code;
  const tournament = store.getTournamentByCode(code);
  if (!tournament) {
    return apiError('not_found', 'Tournament not found');
  }

  const leaderboard = store.getLeaderboard(tournament.id);
  const status = getTournamentStatus(tournament);

  const res = NextResponse.json({
    leaderboard,
    status,
    totalParticipants: leaderboard.length,
    serverNow: new Date().toISOString(),
  });

  // Allowed Cache-Control from Section 6
  res.headers.set('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=10');

  return res;
}
