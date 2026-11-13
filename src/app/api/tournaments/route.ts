import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { store } from '@/lib/tournaments/store';
import { apiError } from '@/lib/errors';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const createTournamentSchema = z.object({
  title: z.string().min(3).max(60),
  description: z.string().max(280).optional(),
  mode: z.enum(['time', 'words']),
  modeValue: z.number().int().positive(),
  language: z.literal('english').default('english'),
  punctuation: z.boolean().default(false),
  numbers: z.boolean().default(false),
  minAccuracy: z.number().int().min(0).max(100).default(90),
  maxParticipants: z.number().int().min(2).max(200).default(50),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
}).refine((data) => {
  const start = new Date(data.startsAt).getTime();
  const end = new Date(data.endsAt).getTime();
  const diffMinutes = (end - start) / (1000 * 60);
  const diffDays = diffMinutes / (60 * 24);
  return end > start && diffMinutes >= 10 && diffDays <= 90;
}, {
  message: 'End time must be at least 10 minutes after start time, and duration at most 90 days',
  path: ['endsAt'],
});

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return apiError('unauthorized', 'Must be signed in to create a tournament');
  }

  const body = await req.json().catch(() => ({}));
  const parseResult = createTournamentSchema.safeParse(body);

  if (!parseResult.success) {
    return apiError('validation', parseResult.error.errors[0]?.message || 'Invalid form input');
  }

  const data = parseResult.data;
  const tournament = store.createTournament({
    creatorId: session.user.id,
    title: data.title,
    description: data.description,
    mode: data.mode,
    modeValue: data.modeValue,
    language: data.language,
    punctuation: data.punctuation,
    numbers: data.numbers,
    minAccuracy: data.minAccuracy,
    maxParticipants: data.maxParticipants,
    startsAt: data.startsAt,
    endsAt: data.endsAt,
  });

  return NextResponse.json({
    code: tournament.code,
    tournament,
  }, { status: 201 });
}
