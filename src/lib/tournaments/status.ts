export type TournamentStatus = 'upcoming' | 'active' | 'ended' | 'canceled';

export interface TournamentStatusInput {
  starts_at: string | Date;
  ends_at: string | Date;
  canceled_at?: string | Date | null;
}

/**
 * Derives tournament status from timestamps. Status is never stored in DB.
 */
export function getTournamentStatus(
  tournament: TournamentStatusInput,
  referenceDate: Date = new Date()
): TournamentStatus {
  if (tournament.canceled_at) {
    return 'canceled';
  }

  const nowMs = referenceDate.getTime();
  const startMs = new Date(tournament.starts_at).getTime();
  const endMs = new Date(tournament.ends_at).getTime();

  if (nowMs < startMs) {
    return 'upcoming';
  }

  if (nowMs >= endMs) {
    return 'ended';
  }

  return 'active';
}
