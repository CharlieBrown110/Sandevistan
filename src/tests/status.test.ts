import { describe, it, expect } from 'vitest';
import { getTournamentStatus } from '../lib/tournaments/status';

describe('Tournament Status Derivation (Fake Clock)', () => {
  const startsAt = new Date('2026-11-10T12:00:00Z');
  const endsAt = new Date('2026-11-11T12:00:00Z');

  it('returns upcoming when before starts_at', () => {
    const fakeNow = new Date('2026-11-10T11:59:59Z');
    const status = getTournamentStatus({ starts_at: startsAt, ends_at: endsAt }, fakeNow);
    expect(status).toBe('upcoming');
  });

  it('returns active when between starts_at and ends_at', () => {
    const fakeNow = new Date('2026-11-10T15:00:00Z');
    const status = getTournamentStatus({ starts_at: startsAt, ends_at: endsAt }, fakeNow);
    expect(status).toBe('active');
  });

  it('returns ended when at or after ends_at', () => {
    const fakeNow = new Date('2026-11-11T12:00:00Z');
    const status = getTournamentStatus({ starts_at: startsAt, ends_at: endsAt }, fakeNow);
    expect(status).toBe('ended');
  });

  it('returns canceled when canceled_at is set regardless of times', () => {
    const fakeNow = new Date('2026-11-10T15:00:00Z');
    const status = getTournamentStatus(
      { starts_at: startsAt, ends_at: endsAt, canceled_at: '2026-11-10T13:00:00Z' },
      fakeNow
    );
    expect(status).toBe('canceled');
  });
});
