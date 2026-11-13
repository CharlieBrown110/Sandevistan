import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { store } from '@/lib/tournaments/store';
import { apiError } from '@/lib/errors';
import { KeyEvent } from '@/lib/typing/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const submitSchema = z.object({
  events: z.array(z.tuple([z.number(), z.string()])).min(1).max(5000),
  claimed: z.object({
    wpm: z.number(),
    accuracy: z.number(),
  }).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { code: string; id: string } }
) {
  const session = await getSession(req);
  if (!session) {
    return apiError('unauthorized', 'Must be signed in to submit an attempt');
  }

  const { code, id: attemptId } = params;
  const tournament = store.getTournamentByCode(code);
  if (!tournament) {
    return apiError('not_found', 'Tournament not found');
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return apiError('validation', 'Missing request body');
  }

  const parseResult = submitSchema.safeParse(body);
  if (!parseResult.success) {
    return apiError('validation', parseResult.error.errors[0]?.message || 'Invalid attempt payload');
  }

  const { events, claimed } = parseResult.data;

  const result = store.submitAttempt(
    tournament.id,
    attemptId,
    session.user.id,
    events as KeyEvent[],
    claimed
  );

  if (!result.success || !result.response) {
    const errCode = (result.error?.code || 'forbidden') as any;
    return apiError(errCode, result.error?.message || 'Failed to submit attempt');
  }

  return NextResponse.json(result.response);
}
