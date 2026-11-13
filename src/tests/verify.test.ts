import { describe, it, expect } from 'vitest';
import { verifyAttempt, VERIFICATION_CONFIG } from '../lib/tournaments/verify';
import { createWordGenerator } from '../lib/typing/words';
import { KeyEvent, TestConfig } from '../lib/typing/types';

describe('Fair Play & Score Verification Pipeline', () => {
  const seed = 54321;
  const config: TestConfig = {
    mode: 'time',
    modeValue: 15,
    punctuation: false,
    numbers: false,
    language: 'english',
  };

  const gen = createWordGenerator(config, seed);
  const words = gen.getWords(10);

  function createHumanLikeEvents(): KeyEvent[] {
    const events: KeyEvent[] = [];
    let curTime = 120;
    for (let w = 0; w < 6; w++) {
      const word = words[w];
      for (let c = 0; c < word.length; c++) {
        // Human variance: gaps between 60ms and 140ms
        const gap = 60 + Math.floor(Math.sin(w * 10 + c) * 30 + 30);
        curTime += gap;
        events.push([curTime, word[c]]);
      }
      curTime += 100;
      events.push([curTime, ' ']);
    }
    return events;
  }

  it('accepts a valid human-like typing event log', () => {
    const events = createHumanLikeEvents();
    const startedAt = new Date('2026-11-10T00:00:00Z');
    const endsAt = new Date('2026-11-10T01:00:00Z');
    const expiresAt = new Date('2026-11-10T00:25:00Z');
    const submittedAt = new Date(startedAt.getTime() + 15_500); // 15.5 seconds later

    const res = verifyAttempt({
      attempt: {
        id: 'att_valid',
        userId: 'usr_1',
        status: 'started',
        startedAt,
        expiresAt,
        seed,
      },
      callerId: 'usr_1',
      tournament: {
        canceledAt: null,
        endsAt,
        minAccuracy: 90,
        mode: config.mode,
        modeValue: config.modeValue,
        punctuation: config.punctuation,
        numbers: config.numbers,
        language: config.language,
      },
      events,
      submittedAt,
    });

    expect(res.status).toBe('submitted');
    expect(res.eligible).toBe(true);
    expect(res.engineResult?.wpm).toBeGreaterThan(0);
  });

  it('rejects an expired attempt (Step 2)', () => {
    const events = createHumanLikeEvents();
    const startedAt = new Date('2026-11-10T00:00:00Z');
    const expiresAt = new Date('2026-11-10T00:15:00Z');
    const submittedAt = new Date('2026-11-10T00:16:00Z'); // after expiresAt

    const res = verifyAttempt({
      attempt: {
        id: 'att_expired',
        userId: 'usr_1',
        status: 'started',
        startedAt,
        expiresAt,
        seed,
      },
      callerId: 'usr_1',
      tournament: {
        canceledAt: null,
        endsAt: new Date('2026-11-10T01:00:00Z'),
        minAccuracy: 90,
        mode: config.mode,
        modeValue: config.modeValue,
        punctuation: config.punctuation,
        numbers: config.numbers,
        language: config.language,
      },
      events,
      submittedAt,
    });

    expect(res.status).toBe('rejected');
    expect(res.rejectReason).toBe('expired');
  });

  it('rejects attempt submitted faster than real-time (Step 5)', () => {
    const events = createHumanLikeEvents();
    const startedAt = new Date('2026-11-10T00:00:00Z');
    // Test is 15 seconds, but submitted only 2 seconds after startedAt!
    const submittedAt = new Date(startedAt.getTime() + 2000);

    const res = verifyAttempt({
      attempt: {
        id: 'att_speedhack',
        userId: 'usr_1',
        status: 'started',
        startedAt,
        expiresAt: new Date('2026-11-10T01:00:00Z'),
        seed,
      },
      callerId: 'usr_1',
      tournament: {
        canceledAt: null,
        endsAt: new Date('2026-11-10T01:00:00Z'),
        minAccuracy: 90,
        mode: 'time',
        modeValue: 15,
        punctuation: false,
        numbers: false,
        language: 'english',
      },
      events,
      submittedAt,
    });

    expect(res.status).toBe('rejected');
    expect(res.rejectReason).toBe('too_fast');
  });

  it('flags bot-like submission with perfectly constant timing (Step 9)', () => {
    // Generate 60 events with exact identical 20ms delta (stdev = 0)
    const events: KeyEvent[] = [];
    let curTime = 100;
    for (let i = 0; i < 60; i++) {
      curTime += 20; // 0ms stdev
      events.push([curTime, 'a']);
    }

    const startedAt = new Date('2026-11-10T00:00:00Z');
    const submittedAt = new Date(startedAt.getTime() + 16_000);

    const res = verifyAttempt({
      attempt: {
        id: 'att_bot',
        userId: 'usr_1',
        status: 'started',
        startedAt,
        expiresAt: new Date('2026-11-10T01:00:00Z'),
        seed,
      },
      callerId: 'usr_1',
      tournament: {
        canceledAt: null,
        endsAt: new Date('2026-11-10T01:00:00Z'),
        minAccuracy: 50,
        mode: 'time',
        modeValue: 15,
        punctuation: false,
        numbers: false,
        language: 'english',
      },
      events,
      submittedAt,
    });

    expect(res.status).toBe('flagged');
    expect(res.rejectReason).toBe('bot_like');
    expect(res.eligible).toBe(false);
  });
});
