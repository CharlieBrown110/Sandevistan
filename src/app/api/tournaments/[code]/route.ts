import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { store } from '@/lib/tournaments/store';
import { getTournamentStatus } from '@/lib/tournaments/status';
import { apiError } from '@/lib/errors';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const code = params.code;
  const tournament = store.getTournamentByCode(code);

  if (!tournament) {
    return apiError('not_found', 'Tournament not found');
  }

  const session = await getSession(req);
  const now = new Date();
  const status = getTournamentStatus(tournament, now);

  const creator = store.getUser(tournament.creatorId);

  let myParticipation = null;
  let myAttempts: unknown[] = [];

  if (session) {
    const p = store.getParticipant(tournament.id, session.user.id);
    if (p) {
      myParticipation = {
        joinedAt: p.joinedAt,
        attemptsCount: p.attemptsCount,
        bestWpm: p.bestWpm,
        bestAccuracy: p.bestAccuracy,
        bestAt: p.bestAt,
      };
      myAttempts = store.getUserAttempts(tournament.id, session.user.id);
    }
  }

  return NextResponse.json({
    tournament: {
      id: tournament.id,
      code: tournament.code,
      title: tournament.title,
      description: tournament.description,
      mode: tournament.mode,
      modeValue: tournament.modeValue,
      language: tournament.language,
      punctuation: tournament.punctuation,
      numbers: tournament.numbers,
      minAccuracy: tournament.minAccuracy,
      maxParticipants: tournament.maxParticipants,
      startsAt: tournament.startsAt,
      endsAt: tournament.endsAt,
      canceledAt: tournament.canceledAt,
      createdAt: tournament.createdAt,
      creator: {
        id: creator?.id || tournament.creatorId,
        username: creator?.username || 'Creator',
        image: creator?.image || null,
      },
      status,
    },
    serverNow: now.toISOString(),
    isCreator: session?.user?.id === tournament.creatorId,
    myParticipation,
    myAttempts,
  });
}

const patchSchema = z.object({
  title: z.string().min(3).max(60).optional(),
  description: z.string().max(280).optional(),
  endsAt: z.string().datetime().optional(),
  mode: z.enum(['time', 'words']).optional(),
  modeValue: z.number().int().positive().optional(),
  punctuation: z.boolean().optional(),
  numbers: z.boolean().optional(),
  minAccuracy: z.number().int().min(0).max(100).optional(),
  startsAt: z.string().datetime().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { code: string } }) {
  const session = await getSession(req);
  if (!session) {
    return apiError('unauthorized', 'Must be signed in');
  }

  const code = params.code;
  const body = await req.json().catch(() => ({}));
  const parseResult = patchSchema.safeParse(body);

  if (!parseResult.success) {
    return apiError('validation', parseResult.error.errors[0]?.message || 'Invalid updates');
  }

  const res = store.updateTournament(code, session.user.id, parseResult.data);
  if (!res.success) {
    return apiError(res.error === 'Tournament not found' ? 'not_found' : 'forbidden', res.error || 'Failed to update');
  }

  return NextResponse.json({
    success: true,
    tournament: res.tournament,
  });
}
