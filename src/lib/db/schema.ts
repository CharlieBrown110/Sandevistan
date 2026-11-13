import { pgTable, text, timestamp, boolean, integer, numeric, jsonb, primaryKey, uuid, index } from 'drizzle-orm/pg-core';

// 1. Users table (extended for Better Auth and tournament usernames)
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email'),
  emailVerified: boolean('email_verified').default(false),
  image: text('image'),
  username: text('username').unique().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Better Auth tables
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const verifications = pgTable('verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 2. Tournaments
export const tournaments = pgTable('tournaments', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: text('code').notNull().unique(),
  creatorId: text('creator_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  description: text('description').default(''),
  mode: text('mode').notNull(), // 'time' or 'words'
  modeValue: integer('mode_value').notNull(),
  language: text('language').default('english').notNull(),
  punctuation: boolean('punctuation').default(false).notNull(),
  numbers: boolean('numbers').default(false).notNull(),
  minAccuracy: integer('min_accuracy').default(90).notNull(),
  maxParticipants: integer('max_participants').default(50).notNull(),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
  canceledAt: timestamp('canceled_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    creatorIdx: index('tournaments_creator_idx').on(table.creatorId),
  };
});

// 3. Tournament Participants
export const tournamentParticipants = pgTable('tournament_participants', {
  tournamentId: uuid('tournament_id').notNull().references(() => tournaments.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
  attemptsCount: integer('attempts_count').default(0).notNull(),
  bestAttemptId: uuid('best_attempt_id'),
  bestWpm: numeric('best_wpm', { precision: 6, scale: 2 }),
  bestAccuracy: numeric('best_accuracy', { precision: 5, scale: 2 }),
  bestAt: timestamp('best_at', { withTimezone: true }),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.tournamentId, table.userId] }),
    leaderboardIdx: index('tournament_participants_lb_idx').on(table.tournamentId, table.bestWpm, table.bestAccuracy, table.bestAt),
    userTournamentsIdx: index('tournament_participants_user_idx').on(table.userId),
  };
});

// 4. Tournament Attempts
export const tournamentAttempts = pgTable('tournament_attempts', {
  id: uuid('id').defaultRandom().primaryKey(),
  tournamentId: uuid('tournament_id').notNull().references(() => tournaments.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  seed: integer('seed').notNull(),
  status: text('status').notNull(), // 'started', 'submitted', 'abandoned', 'rejected', 'flagged'
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  wpm: numeric('wpm', { precision: 6, scale: 2 }),
  rawWpm: numeric('raw_wpm', { precision: 6, scale: 2 }),
  accuracy: numeric('accuracy', { precision: 5, scale: 2 }),
  consistency: numeric('consistency', { precision: 5, scale: 2 }),
  charsCorrect: integer('chars_correct'),
  charsIncorrect: integer('chars_incorrect'),
  charsExtra: integer('chars_extra'),
  charsMissed: integer('chars_missed'),
  durationMs: integer('duration_ms'),
  eligible: boolean('eligible').default(false).notNull(),
  rejectReason: text('reject_reason'),
  events: jsonb('events'),
}, (table) => {
  return {
    historyIdx: index('tournament_attempts_hist_idx').on(table.tournamentId, table.userId, table.startedAt),
  };
});
