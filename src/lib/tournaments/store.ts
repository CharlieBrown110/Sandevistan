import crypto from 'crypto';
import { generateTournamentCode } from './code';
import { getTournamentStatus, TournamentStatus } from './status';
import { rankParticipants, RankedParticipant } from './rules';
import { EngineResult, KeyEvent } from '../typing/types';
import { verifyAttempt } from './verify';
import { pool } from '@/lib/db';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  username: string;
  createdAt: string;
}

export interface TournamentRecord {
  id: string;
  code: string;
  creatorId: string;
  title: string;
  description: string;
  mode: 'time' | 'words';
  modeValue: number;
  language: 'english';
  punctuation: boolean;
  numbers: boolean;
  minAccuracy: number;
  maxParticipants: number;
  startsAt: string; // ISO
  endsAt: string; // ISO
  canceledAt?: string | null;
  createdAt: string;
}

export interface ParticipantRecord {
  tournamentId: string;
  userId: string;
  joinedAt: string;
  attemptsCount: number;
  bestAttemptId?: string | null;
  bestWpm?: number | null;
  bestAccuracy?: number | null;
  bestAt?: string | null;
}

export interface AttemptRecord {
  id: string;
  tournamentId: string;
  userId: string;
  seed: number;
  status: 'started' | 'submitted' | 'abandoned' | 'rejected' | 'flagged';
  startedAt: string;
  expiresAt: string;
  submittedAt?: string | null;
  wpm?: number | null;
  rawWpm?: number | null;
  accuracy?: number | null;
  consistency?: number | null;
  charsCorrect?: number | null;
  charsIncorrect?: number | null;
  charsExtra?: number | null;
  charsMissed?: number | null;
  durationMs?: number | null;
  eligible: boolean;
  rejectReason?: string | null;
  events?: KeyEvent[] | null;
}

// In-memory persistent database singleton for instant zero-config & fallback
class TournamentStore {
  users = new Map<string, UserRecord>();
  usersByUsername = new Map<string, string>();
  tournaments = new Map<string, TournamentRecord>();
  tournamentsByCode = new Map<string, string>();
  participants = new Map<string, ParticipantRecord>(); // key: `${tournamentId}:${userId}`
  attempts = new Map<string, AttemptRecord>();

  constructor() {
    this.seedDemoData();
  }

  private seedDemoData() {
    // Seed initial Cyberpunk demo users & tournament for preview
    const demoUser1: UserRecord = {
      id: 'usr_david',
      name: 'David Martinez',
      email: 'david@edgerunners.nc',
      image: 'https://api.dicebear.com/7.x/bottts/svg?seed=David',
      username: 'sandevistan_01',
      createdAt: new Date().toISOString(),
    };
    const demoUser2: UserRecord = {
      id: 'usr_lucy',
      name: 'Lucyna Kushinada',
      email: 'lucy@moon.nc',
      image: 'https://api.dicebear.com/7.x/bottts/svg?seed=Lucy',
      username: 'deep_diver_lucy',
      createdAt: new Date().toISOString(),
    };
    const demoUser3: UserRecord = {
      id: 'usr_rebecca',
      name: 'Rebecca Gunner',
      email: 'rebecca@carnage.nc',
      image: 'https://api.dicebear.com/7.x/bottts/svg?seed=Rebecca',
      username: 'carnage_shot',
      createdAt: new Date().toISOString(),
    };

    [demoUser1, demoUser2, demoUser3].forEach((u) => {
      this.users.set(u.id, u);
      this.usersByUsername.set(u.username, u.id);
    });

    if (pool) {
      for (const u of [demoUser1, demoUser2, demoUser3]) {
        pool.query(
          'INSERT INTO users (id, name, email, username, image) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING',
          [u.id, u.name, u.email, u.username, u.image]
        ).catch(() => {});
      }
    }

    const now = new Date();
    const demoTournament: TournamentRecord = {
      id: 'trn_afterlife_championship',
      code: 'NC77RUNR',
      creatorId: demoUser1.id,
      title: 'Afterlife Sandevistan Speedrun',
      description: 'Night City top netrunners & solos showdown. Hit 90%+ accuracy at maximum speed.',
      mode: 'time',
      modeValue: 60,
      language: 'english',
      punctuation: false,
      numbers: false,
      minAccuracy: 90,
      maxParticipants: 50,
      startsAt: new Date(now.getTime() - 2 * 3600_000).toISOString(),
      endsAt: new Date(now.getTime() + 22 * 3600_000).toISOString(),
      canceledAt: null,
      createdAt: new Date(now.getTime() - 2 * 3600_000).toISOString(),
    };

    this.tournaments.set(demoTournament.id, demoTournament);
    this.tournamentsByCode.set(demoTournament.code, demoTournament.id);

    // Add participants with ranked best scores
    this.participants.set(`${demoTournament.id}:${demoUser1.id}`, {
      tournamentId: demoTournament.id,
      userId: demoUser1.id,
      joinedAt: new Date(now.getTime() - 7200_000).toISOString(),
      attemptsCount: 3,
      bestAttemptId: 'att_david_best',
      bestWpm: 128.45,
      bestAccuracy: 98.5,
      bestAt: new Date(now.getTime() - 3600_000).toISOString(),
    });

    this.participants.set(`${demoTournament.id}:${demoUser2.id}`, {
      tournamentId: demoTournament.id,
      userId: demoUser2.id,
      joinedAt: new Date(now.getTime() - 7000_000).toISOString(),
      attemptsCount: 2,
      bestAttemptId: 'att_lucy_best',
      bestWpm: 134.8,
      bestAccuracy: 99.2,
      bestAt: new Date(now.getTime() - 1800_000).toISOString(),
    });

    this.participants.set(`${demoTournament.id}:${demoUser3.id}`, {
      tournamentId: demoTournament.id,
      userId: demoUser3.id,
      joinedAt: new Date(now.getTime() - 6500_000).toISOString(),
      attemptsCount: 4,
      bestAttemptId: 'att_rebecca_best',
      bestWpm: 112.3,
      bestAccuracy: 94.1,
      bestAt: new Date(now.getTime() - 900_000).toISOString(),
    });
  }

  // --- Users ---
  getUser(id: string): UserRecord | null {
    return this.users.get(id) || null;
  }

  getUserByUsername(username: string): UserRecord | null {
    const id = this.usersByUsername.get(username.toLowerCase());
    return id ? this.getUser(id) : null;
  }

  upsertUser(user: Omit<UserRecord, 'createdAt'> & { createdAt?: string }): UserRecord {
    const existing = this.users.get(user.id);
    const record: UserRecord = {
      ...user,
      createdAt: existing ? existing.createdAt : (user.createdAt || new Date().toISOString()),
    };
    if (existing && existing.username !== user.username) {
      this.usersByUsername.delete(existing.username.toLowerCase());
    }
    this.users.set(user.id, record);
    this.usersByUsername.set(user.username.toLowerCase(), user.id);

    if (pool) {
      pool.query(
        'INSERT INTO users (id, name, email, username, image) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username, name = EXCLUDED.name, image = EXCLUDED.image',
        [record.id, record.name, record.email, record.username, record.image || null]
      ).catch((err) => console.error('Failed to sync user to DB:', err));
    }

    return record;
  }

  updateUsername(userId: string, newUsername: string): { success: boolean; error?: string } {
    const user = this.users.get(userId);
    if (!user) return { success: false, error: 'User not found' };

    const lower = newUsername.toLowerCase();
    const existingId = this.usersByUsername.get(lower);
    if (existingId && existingId !== userId) {
      return { success: false, error: 'Username is already taken' };
    }

    this.usersByUsername.delete(user.username.toLowerCase());
    user.username = newUsername;
    this.usersByUsername.set(lower, userId);

    if (pool) {
      pool.query('UPDATE users SET username = $1 WHERE id = $2', [newUsername, userId])
        .catch((err) => console.error('Failed to update username in DB:', err));
    }

    return { success: true };
  }

  // --- Tournaments ---
  createTournament(data: {
    creatorId: string;
    title: string;
    description?: string;
    mode: 'time' | 'words';
    modeValue: number;
    language?: 'english';
    punctuation?: boolean;
    numbers?: boolean;
    minAccuracy?: number;
    maxParticipants?: number;
    startsAt: string;
    endsAt: string;
  }): TournamentRecord {
    const id = crypto.randomUUID();
    let code = generateTournamentCode();
    while (this.tournamentsByCode.has(code)) {
      code = generateTournamentCode();
    }

    const record: TournamentRecord = {
      id,
      code,
      creatorId: data.creatorId,
      title: data.title,
      description: data.description || '',
      mode: data.mode,
      modeValue: data.modeValue,
      language: data.language || 'english',
      punctuation: !!data.punctuation,
      numbers: !!data.numbers,
      minAccuracy: data.minAccuracy ?? 90,
      maxParticipants: data.maxParticipants ?? 50,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      canceledAt: null,
      createdAt: new Date().toISOString(),
    };

    this.tournaments.set(id, record);
    this.tournamentsByCode.set(code, id);

    // Creator is joined automatically (Rule 2)
    this.joinTournament(record.id, data.creatorId);

    if (pool) {
      pool.query(
        `INSERT INTO tournaments (id, code, creator_id, title, description, mode, mode_value, language, punctuation, numbers, min_accuracy, max_participants, starts_at, ends_at, canceled_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         ON CONFLICT (id) DO NOTHING`,
        [record.id, record.code, record.creatorId, record.title, record.description, record.mode, record.modeValue, record.language, record.punctuation, record.numbers, record.minAccuracy, record.maxParticipants, record.startsAt, record.endsAt, record.canceledAt, record.createdAt]
      ).catch((err) => console.error('Failed to insert tournament into DB:', err));

      pool.query(
        `INSERT INTO tournament_participants (tournament_id, user_id, joined_at)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [record.id, data.creatorId, new Date().toISOString()]
      ).catch((err) => console.error('Failed to insert participant into DB:', err));
    }

    return record;
  }

  async getTournamentByCode(code: string): Promise<TournamentRecord | null> {
    const id = this.tournamentsByCode.get(code);
    if (id && this.tournaments.has(id)) {
      return this.tournaments.get(id) || null;
    }

    if (pool) {
      try {
        const res = await pool.query('SELECT * FROM tournaments WHERE code = $1 LIMIT 1', [code]);
        if (res.rows.length > 0) {
          const row = res.rows[0];
          const record: TournamentRecord = {
            id: row.id,
            code: row.code,
            creatorId: row.creator_id,
            title: row.title,
            description: row.description || '',
            mode: row.mode,
            modeValue: row.mode_value,
            language: row.language,
            punctuation: row.punctuation,
            numbers: row.numbers,
            minAccuracy: row.min_accuracy,
            maxParticipants: row.max_participants,
            startsAt: new Date(row.starts_at).toISOString(),
            endsAt: new Date(row.ends_at).toISOString(),
            canceledAt: row.canceled_at ? new Date(row.canceled_at).toISOString() : null,
            createdAt: new Date(row.created_at).toISOString(),
          };
          this.tournaments.set(record.id, record);
          this.tournamentsByCode.set(record.code, record.id);
          return record;
        }
      } catch (err) {
        console.error('Failed to get tournament from DB:', err);
      }
    }

    return null;
  }

  getTournamentByCodeSync(code: string): TournamentRecord | null {
    const id = this.tournamentsByCode.get(code);
    return id ? this.tournaments.get(id) || null : null;
  }

  getTournamentById(id: string): TournamentRecord | null {
    return this.tournaments.get(id) || null;
  }

  updateTournament(
    code: string,
    creatorId: string,
    updates: Partial<Pick<TournamentRecord, 'title' | 'description' | 'endsAt' | 'mode' | 'modeValue' | 'punctuation' | 'numbers' | 'minAccuracy' | 'startsAt'>>
  ): { success: boolean; error?: string; tournament?: TournamentRecord } {
    const t = this.getTournamentByCodeSync(code);
    if (!t) return { success: false, error: 'Tournament not found' };
    if (t.creatorId !== creatorId) return { success: false, error: 'Only the creator can edit' };

    const status = getTournamentStatus(t);

    if (updates.title !== undefined) t.title = updates.title;
    if (updates.description !== undefined) t.description = updates.description;

    if (updates.endsAt !== undefined) {
      const newEnd = new Date(updates.endsAt).getTime();
      const curEnd = new Date(t.endsAt).getTime();
      if (status === 'active' && newEnd < curEnd) {
        return { success: false, error: 'Can only extend ends_at while active' };
      }
      t.endsAt = updates.endsAt;
    }

    // Config changes only allowed before starts_at (Upcoming)
    if (status !== 'upcoming') {
      if (
        updates.mode !== undefined ||
        updates.modeValue !== undefined ||
        updates.punctuation !== undefined ||
        updates.numbers !== undefined ||
        updates.minAccuracy !== undefined ||
        updates.startsAt !== undefined
      ) {
        return { success: false, error: 'Cannot change configuration once tournament has started' };
      }
    } else {
      if (updates.mode !== undefined) t.mode = updates.mode;
      if (updates.modeValue !== undefined) t.modeValue = updates.modeValue;
      if (updates.punctuation !== undefined) t.punctuation = updates.punctuation;
      if (updates.numbers !== undefined) t.numbers = updates.numbers;
      if (updates.minAccuracy !== undefined) t.minAccuracy = updates.minAccuracy;
      if (updates.startsAt !== undefined) t.startsAt = updates.startsAt;
    }

    if (pool) {
      pool.query(
        'UPDATE tournaments SET title = $1, description = $2, ends_at = $3 WHERE code = $4',
        [t.title, t.description, t.endsAt, code]
      ).catch((err) => console.error('Failed to update tournament in DB:', err));
    }

    return { success: true, tournament: t };
  }

  cancelTournament(code: string, creatorId: string): { success: boolean; error?: string } {
    const t = this.getTournamentByCodeSync(code);
    if (!t) return { success: false, error: 'Tournament not found' };
    if (t.creatorId !== creatorId) return { success: false, error: 'Forbidden' };

    t.canceledAt = new Date().toISOString();

    if (pool) {
      pool.query('UPDATE tournaments SET canceled_at = $1 WHERE code = $2', [t.canceledAt, code])
        .catch((err) => console.error('Failed to cancel tournament in DB:', err));
    }

    return { success: true };
  }

  // --- Participants ---
  joinTournament(tournamentId: string, userId: string): { success: boolean; error?: string } {
    const t = this.getTournamentById(tournamentId);
    if (!t) return { success: false, error: 'Tournament not found' };

    const status = getTournamentStatus(t);
    if (status === 'ended') return { success: false, error: 'Tournament has ended' };
    if (status === 'canceled') return { success: false, error: 'Tournament is canceled' };

    const key = `${tournamentId}:${userId}`;
    if (this.participants.has(key)) {
      return { success: true }; // Idempotent
    }

    // Check capacity
    const currentParticipants = this.getParticipants(tournamentId);
    if (currentParticipants.length >= t.maxParticipants) {
      return { success: false, error: 'Tournament is full' };
    }

    const participantRecord: ParticipantRecord = {
      tournamentId,
      userId,
      joinedAt: new Date().toISOString(),
      attemptsCount: 0,
      bestAttemptId: null,
      bestWpm: null,
      bestAccuracy: null,
      bestAt: null,
    };

    this.participants.set(key, participantRecord);

    if (pool) {
      pool.query(
        'INSERT INTO tournament_participants (tournament_id, user_id, joined_at) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [tournamentId, userId, participantRecord.joinedAt]
      ).catch((err) => console.error('Failed to join tournament in DB:', err));
    }

    return { success: true };
  }

  isParticipant(tournamentId: string, userId: string): boolean {
    return this.participants.has(`${tournamentId}:${userId}`);
  }

  getParticipant(tournamentId: string, userId: string): ParticipantRecord | null {
    return this.participants.get(`${tournamentId}:${userId}`) || null;
  }

  getParticipants(tournamentId: string): ParticipantRecord[] {
    const list: ParticipantRecord[] = [];
    for (const p of this.participants.values()) {
      if (p.tournamentId === tournamentId) {
        list.push(p);
      }
    }
    return list;
  }

  getLeaderboard(tournamentId: string): RankedParticipant[] {
    const participants = this.getParticipants(tournamentId);
    const scores = participants.map((p) => {
      const user = this.getUser(p.userId);
      return {
        userId: p.userId,
        username: user?.username || 'unknown',
        image: user?.image || null,
        bestWpm: p.bestWpm ?? null,
        bestAccuracy: p.bestAccuracy ?? null,
        bestAt: p.bestAt ?? null,
        attemptsCount: p.attemptsCount,
      };
    });

    return rankParticipants(scores);
  }

  getUserTournaments(userId: string) {
    const result: Array<{
      tournament: TournamentRecord;
      status: TournamentStatus;
      myBestWpm: number | null;
      myBestAccuracy: number | null;
      myRank: number | null;
      totalParticipants: number;
    }> = [];

    for (const p of this.participants.values()) {
      if (p.userId === userId) {
        const t = this.getTournamentById(p.tournamentId);
        if (t) {
          const lb = this.getLeaderboard(t.id);
          const myEntry = lb.find((row) => row.userId === userId);
          result.push({
            tournament: t,
            status: getTournamentStatus(t),
            myBestWpm: p.bestWpm ?? null,
            myBestAccuracy: p.bestAccuracy ?? null,
            myRank: myEntry?.rank ?? null,
            totalParticipants: lb.length,
          });
        }
      }
    }

    // Sort by createdAt DESC
    result.sort((a, b) => new Date(b.tournament.createdAt).getTime() - new Date(a.tournament.createdAt).getTime());
    return result;
  }

  // --- Attempts ---
  getUserAttempts(tournamentId: string, userId: string): AttemptRecord[] {
    const list: AttemptRecord[] = [];
    for (const att of this.attempts.values()) {
      if (att.tournamentId === tournamentId && att.userId === userId) {
        list.push(att);
      }
    }
    list.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    return list;
  }

  startAttempt(tournamentId: string, userId: string): {
    success: boolean;
    error?: string;
    attempt?: {
      attemptId: string;
      seed: number;
      config: {
        mode: 'time' | 'words';
        modeValue: number;
        punctuation: boolean;
        numbers: boolean;
        language: 'english';
      };
      serverNow: string;
      maxDurationMs: number;
    };
  } {
    const t = this.getTournamentById(tournamentId);
    if (!t) return { success: false, error: 'Tournament not found' };

    const status = getTournamentStatus(t);
    if (status !== 'active') {
      return { success: false, error: 'Tournament is not active' };
    }

    if (!this.isParticipant(tournamentId, userId)) {
      return { success: false, error: 'Must join tournament before starting an attempt' };
    }

    // Abandon any open attempt for this user in this tournament
    for (const att of this.attempts.values()) {
      if (att.tournamentId === tournamentId && att.userId === userId && att.status === 'started') {
        att.status = 'abandoned';
      }
    }

    const now = new Date();
    // 32-bit positive integer seed
    const seed = crypto.randomInt(1, 2147483647);
    const maxTestDurationMs = t.mode === 'time' ? t.modeValue * 1000 : 300_000;
    // expires_at = started_at + 10 minutes + max test duration
    const expiresAt = new Date(now.getTime() + 10 * 60_000 + maxTestDurationMs);

    const attemptId = `att_${crypto.randomUUID()}`;
    const newAttempt: AttemptRecord = {
      id: attemptId,
      tournamentId,
      userId,
      seed,
      status: 'started',
      startedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      eligible: false,
    };

    this.attempts.set(attemptId, newAttempt);

    return {
      success: true,
      attempt: {
        attemptId,
        seed,
        config: {
          mode: t.mode,
          modeValue: t.modeValue,
          punctuation: t.punctuation,
          numbers: t.numbers,
          language: 'english',
        },
        serverNow: now.toISOString(),
        maxDurationMs: maxTestDurationMs,
      },
    };
  }

  submitAttempt(
    tournamentId: string,
    attemptId: string,
    userId: string,
    events: KeyEvent[],
    claimed?: { wpm: number; accuracy: number }
  ): {
    success: boolean;
    error?: { code: string; message: string };
    response?: {
      attempt: {
        id: string;
        status: 'submitted' | 'rejected' | 'flagged';
        wpm: number;
        rawWpm: number;
        accuracy: number;
        consistency: number;
        chars: { correct: number; incorrect: number; extra: number; missed: number };
        perSecond: number[];
        eligible: boolean;
        reason?: string;
      };
      isNewBest: boolean;
      rank: number | null;
      totalParticipants: number;
      best: { wpm: number; accuracy: number } | null;
    };
  } {
    const t = this.getTournamentById(tournamentId);
    if (!t) return { success: false, error: { code: 'not_found', message: 'Tournament not found' } };

    const att = this.attempts.get(attemptId);
    if (!att || att.tournamentId !== tournamentId) {
      return { success: false, error: { code: 'not_found', message: 'Attempt not found' } };
    }

    // Idempotent: submitting twice returns stored result
    if (att.status === 'submitted' || att.status === 'rejected' || att.status === 'flagged') {
      const participant = this.getParticipant(tournamentId, userId);
      const lb = this.getLeaderboard(tournamentId);
      const myRank = lb.find((r) => r.userId === userId)?.rank ?? null;

      return {
        success: true,
        response: {
          attempt: {
            id: att.id,
            status: att.status,
            wpm: att.wpm ?? 0,
            rawWpm: att.rawWpm ?? 0,
            accuracy: att.accuracy ?? 0,
            consistency: att.consistency ?? 0,
            chars: {
              correct: att.charsCorrect ?? 0,
              incorrect: att.charsIncorrect ?? 0,
              extra: att.charsExtra ?? 0,
              missed: att.charsMissed ?? 0,
            },
            perSecond: [],
            eligible: att.eligible,
            reason: att.rejectReason || undefined,
          },
          isNewBest: false,
          rank: myRank,
          totalParticipants: lb.length,
          best: participant && participant.bestWpm != null && participant.bestAccuracy != null ? {
            wpm: participant.bestWpm as number,
            accuracy: participant.bestAccuracy as number,
          } : null,
        },
      };
    }

    const submittedAt = new Date();

    // Run verification pipeline
    const verification = verifyAttempt({
      attempt: {
        id: att.id,
        userId: att.userId,
        status: att.status,
        startedAt: new Date(att.startedAt),
        expiresAt: new Date(att.expiresAt),
        seed: att.seed,
      },
      callerId: userId,
      tournament: {
        canceledAt: t.canceledAt ? new Date(t.canceledAt) : null,
        endsAt: new Date(t.endsAt),
        minAccuracy: t.minAccuracy,
        mode: t.mode,
        modeValue: t.modeValue,
        punctuation: t.punctuation,
        numbers: t.numbers,
        language: t.language,
      },
      events,
      claimed,
      submittedAt,
    });

    att.status = verification.status;
    att.submittedAt = submittedAt.toISOString();
    att.eligible = verification.eligible;
    att.rejectReason = verification.rejectReason || null;
    att.events = events;

    const result = verification.engineResult;
    if (result) {
      att.wpm = result.wpm;
      att.rawWpm = result.rawWpm;
      att.accuracy = result.accuracy;
      att.consistency = result.consistency;
      att.charsCorrect = result.chars.correct;
      att.charsIncorrect = result.chars.incorrect;
      att.charsExtra = result.chars.extra;
      att.charsMissed = result.chars.missed;
      att.durationMs = result.durationMs;
    }

    // Update participant attempts count
    const participant = this.getParticipant(tournamentId, userId);
    let isNewBest = false;

    if (participant) {
      participant.attemptsCount += 1;

      // Conditional update: only if eligible and improves score
      if (verification.eligible && result) {
        const currentBestWpm = participant.bestWpm ?? -1;
        const currentBestAcc = participant.bestAccuracy ?? -1;

        if (
          participant.bestWpm === null ||
          result.wpm > currentBestWpm ||
          (result.wpm === currentBestWpm && result.accuracy > currentBestAcc)
        ) {
          isNewBest = true;
          participant.bestAttemptId = att.id;
          participant.bestWpm = result.wpm;
          participant.bestAccuracy = result.accuracy;
          participant.bestAt = submittedAt.toISOString();
        }
      }
    }

    const lb = this.getLeaderboard(tournamentId);
    const myRank = lb.find((r) => r.userId === userId)?.rank ?? null;

    return {
      success: true,
      response: {
        attempt: {
          id: att.id,
          status: att.status,
          wpm: result?.wpm ?? 0,
          rawWpm: result?.rawWpm ?? 0,
          accuracy: result?.accuracy ?? 0,
          consistency: result?.consistency ?? 0,
          chars: result?.chars ?? { correct: 0, incorrect: 0, extra: 0, missed: 0 },
          perSecond: result?.perSecond ?? [],
          eligible: verification.eligible,
          reason: verification.rejectReason,
        },
        isNewBest,
        rank: myRank,
        totalParticipants: lb.length,
        best: participant && participant.bestWpm != null && participant.bestAccuracy != null ? {
          wpm: participant.bestWpm as number,
          accuracy: participant.bestAccuracy as number,
        } : null,
      },
    };
  }
}

// Global singleton instance
const globalForStore = globalThis as unknown as { tournamentStore?: TournamentStore };
export const store = globalForStore.tournamentStore ?? new TournamentStore();
if (process.env.NODE_ENV !== 'production') {
  globalForStore.tournamentStore = store;
}
