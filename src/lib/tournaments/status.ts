export type TournamentStatus = 'upcoming' | 'active' | 'ended' | 'canceled';

export interface TournamentStatusInput {
  starts_at?: string | Date;
  ends_at?: string | Date;
  canceled_at?: string | Date | null;
  // Also accept camelCase (from in-memory store)
  startsAt?: string | Date;
  endsAt?: string | Date;
  canceledAt?: string | Date | null;
}

/**
 * Derives tournament status from timestamps. Status is never stored in DB.
 */
export function getTournamentStatus(
  tournament: TournamentStatusInput,
  referenceDate: Date = new Date()
): TournamentStatus {
  const canceledAt = tournament.canceled_at ?? tournament.canceledAt;
  if (canceledAt) {
    return 'canceled';
  }

  const nowMs = referenceDate.getTime();
  const startsAt = tournament.starts_at ?? tournament.startsAt;
  const endsAt = tournament.ends_at ?? tournament.endsAt;
  const startMs = new Date(startsAt!).getTime();
  const endMs = new Date(endsAt!).getTime();

  if (nowMs < startMs) {
    return 'upcoming';
  }

  if (nowMs >= endMs) {
    return 'ended';
  }

  return 'active';
}
