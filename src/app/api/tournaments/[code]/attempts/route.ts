import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { store } from '@/lib/tournaments/store';
import { apiError } from '@/lib/errors';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  const session = await getSession(req);
  if (!session) {
    return apiError('unauthorized', 'Must be signed in to start an attempt');
  }

  // Rate limit check: at most 1 attempt per 2 seconds per user
  const rlKey = `start_attempt:${session.user.id}`;
  const rateLimit2s = await checkRateLimit(`${rlKey}:2s`, 1, 2000);
  if (!rateLimit2s.success) {
    return apiError('rate_limited', 'Slow down: attempts can only be started once every 2 seconds');
  }

  // 120 per hour per user
  const rateLimitHour = await checkRateLimit(`${rlKey}:1h`, 120, 3600_000);
  if (!rateLimitHour.success) {
    return apiError('rate_limited', 'Hourly attempt limit reached (120 per hour)');
  }

  store.upsertUser(session.user);

  const code = params.code;
  const tournament = await store.getTournamentByCode(code);
  if (!tournament) {
    return apiError('not_found', 'Tournament not found');
  }

  const startRes = store.startAttempt(tournament.id, session.user.id);
  if (!startRes.success || !startRes.attempt) {
    if (startRes.error === 'Tournament is not active') {
      return apiError('not_active', 'Tournament is not currently active');
    }
    if (startRes.error === 'Must join tournament before starting an attempt') {
      return apiError('not_joined', 'You must join the tournament before playing');
    }
    return apiError('forbidden', startRes.error || 'Failed to start attempt');
  }

  return NextResponse.json(startRes.attempt, { status: 201 });
}
