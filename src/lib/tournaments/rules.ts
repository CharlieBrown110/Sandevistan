export interface ParticipantScore {
  userId: string;
  username: string;
  image?: string | null;
  bestWpm: number | null;
  bestAccuracy: number | null;
  bestAt: string | Date | null;
  attemptsCount: number;
}

export interface RankedParticipant extends ParticipantScore {
  rank: number | null; // null if no score yet
}

/**
 * Sorts and ranks tournament participants according to Section 4 rules:
 * 1. Best eligible net WPM DESC
 * 2. Ties broken by higher accuracy DESC
 * 3. Ties broken by earlier best_at ASC
 * 4. Participants with no score listed at bottom with rank: null
 */
export function rankParticipants(participants: ParticipantScore[]): RankedParticipant[] {
  const scored = participants.filter((p) => p.bestWpm !== null && p.bestWpm !== undefined);
  const unscored = participants.filter((p) => p.bestWpm === null || p.bestWpm === undefined);

  scored.sort((a, b) => {
    // 1. WPM DESC
    if (b.bestWpm !== a.bestWpm) {
      return (b.bestWpm ?? 0) - (a.bestWpm ?? 0);
    }
    // 2. Accuracy DESC
    if (b.bestAccuracy !== a.bestAccuracy) {
      return (b.bestAccuracy ?? 0) - (a.bestAccuracy ?? 0);
    }
    // 3. Earliest best_at ASC
    const timeA = a.bestAt ? new Date(a.bestAt).getTime() : Infinity;
    const timeB = b.bestAt ? new Date(b.bestAt).getTime() : Infinity;
    return timeA - timeB;
  });

  const rankedScored: RankedParticipant[] = scored.map((p, index) => ({
    ...p,
    rank: index + 1,
  }));

  const rankedUnscored: RankedParticipant[] = unscored.map((p) => ({
    ...p,
    rank: null,
  }));

  return [...rankedScored, ...rankedUnscored];
}
