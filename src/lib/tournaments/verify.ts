import { EngineResult, KeyEvent, TestConfig } from '../typing/types';
import { replay } from '../typing/engine';

export const VERIFICATION_CONFIG = {
  MAX_EVENTS: 5000,
  GRACE_PERIOD_MS: 15_000, // 15 seconds grace period
  MAX_PLAUSIBLE_WPM: 300,
  HUMAN_TIMING_MIN_KEYS: 50,
  HUMAN_TIMING_FAST_GAP_MS: 10,
  HUMAN_TIMING_MAX_FAST_RATIO: 0.20,
  HUMAN_TIMING_MIN_STDEV_MS: 5,
  CLAIMED_TOLERANCE: 0.5,
  EARLY_SUBMIT_TOLERANCE_MS: 1000,
} as const;

export interface VerifyInput {
  attempt: {
    id: string;
    userId: string;
    status: string;
    startedAt: Date;
    expiresAt: Date;
    seed: number;
  };
  callerId: string;
  tournament: {
    canceledAt?: Date | null;
    endsAt: Date;
    minAccuracy: number;
    mode: 'time' | 'words';
    modeValue: number;
    punctuation: boolean;
    numbers: boolean;
    language: 'english';
  };
  events: KeyEvent[];
  claimed?: {
    wpm: number;
    accuracy: number;
  };
  submittedAt: Date;
}

export interface VerifyResult {
  status: 'submitted' | 'rejected' | 'flagged';
  eligible: boolean;
  rejectReason?: string;
  engineResult?: EngineResult;
}

/**
 * Executes the full 11-step verification pipeline specified in Section 7.
 */
export function verifyAttempt(input: VerifyInput): VerifyResult {
  const { attempt, callerId, tournament, events, claimed, submittedAt } = input;

  // Step 1: Ownership and state
  if (attempt.userId !== callerId || attempt.status !== 'started' || tournament.canceledAt) {
    return {
      status: 'rejected',
      eligible: false,
      rejectReason: 'invalid_attempt_state',
    };
  }

  // Step 2: Expiry
  if (submittedAt.getTime() > attempt.expiresAt.getTime()) {
    return {
      status: 'rejected',
      eligible: false,
      rejectReason: 'expired',
    };
  }

  // Step 3: Window fairness
  // Attempt started_at must be before tournament's ends_at
  if (attempt.startedAt.getTime() >= tournament.endsAt.getTime()) {
    return {
      status: 'rejected',
      eligible: false,
      rejectReason: 'outside_window',
    };
  }

  // Step 4: Payload shape
  if (!Array.isArray(events) || events.length === 0 || events.length > VERIFICATION_CONFIG.MAX_EVENTS) {
    return {
      status: 'rejected',
      eligible: false,
      rejectReason: 'validation',
    };
  }

  let prevTime = 0;
  for (let i = 0; i < events.length; i++) {
    const [tMs, key] = events[i];
    if (typeof tMs !== 'number' || tMs < 0 || tMs < prevTime || typeof key !== 'string') {
      return {
        status: 'rejected',
        eligible: false,
        rejectReason: 'validation',
      };
    }
    // printable, space, or backspace
    if (key !== '\b' && key !== ' ' && (key.length !== 1 || key.charCodeAt(0) < 32)) {
      return {
        status: 'rejected',
        eligible: false,
        rejectReason: 'validation',
      };
    }
    prevTime = tMs;
  }

  // Step 5: No faster than real time
  const lastEventTimeMs = events[events.length - 1][0];
  const testDurationMs = tournament.mode === 'time'
    ? tournament.modeValue * 1000
    : lastEventTimeMs;

  const wallClockDurationMs = submittedAt.getTime() - attempt.startedAt.getTime();
  if (wallClockDurationMs < testDurationMs - VERIFICATION_CONFIG.EARLY_SUBMIT_TOLERANCE_MS) {
    return {
      status: 'rejected',
      eligible: false,
      rejectReason: 'too_fast',
    };
  }

  // Step 6: Replay using shared engine
  const testConfig: TestConfig = {
    mode: tournament.mode,
    modeValue: tournament.modeValue,
    punctuation: tournament.punctuation,
    numbers: tournament.numbers,
    language: tournament.language,
  };

  const engineResult = replay(testConfig, attempt.seed, events);

  // Step 7: Claim check
  if (claimed) {
    const wpmDiff = Math.abs(claimed.wpm - engineResult.wpm);
    const accDiff = Math.abs(claimed.accuracy - engineResult.accuracy);
    if (wpmDiff > VERIFICATION_CONFIG.CLAIMED_TOLERANCE || accDiff > VERIFICATION_CONFIG.CLAIMED_TOLERANCE) {
      return {
        status: 'rejected',
        eligible: false,
        rejectReason: 'mismatch',
        engineResult,
      };
    }
  }

  // Step 8: Plausible speed
  if (engineResult.wpm > VERIFICATION_CONFIG.MAX_PLAUSIBLE_WPM) {
    return {
      status: 'flagged',
      eligible: false,
      rejectReason: 'speed_implausible',
      engineResult,
    };
  }

  // Step 9: Human timing check
  if (events.length >= VERIFICATION_CONFIG.HUMAN_TIMING_MIN_KEYS) {
    const gaps: number[] = [];
    let fastGaps = 0;

    for (let i = 1; i < events.length; i++) {
      const gap = events[i][0] - events[i - 1][0];
      gaps.push(gap);
      if (gap < VERIFICATION_CONFIG.HUMAN_TIMING_FAST_GAP_MS) {
        fastGaps++;
      }
    }

    const fastRatio = fastGaps / gaps.length;
    if (fastRatio > VERIFICATION_CONFIG.HUMAN_TIMING_MAX_FAST_RATIO) {
      return {
        status: 'flagged',
        eligible: false,
        rejectReason: 'bot_like',
        engineResult,
      };
    }

    const meanGap = gaps.reduce((acc, g) => acc + g, 0) / gaps.length;
    const gapVariance = gaps.reduce((acc, g) => acc + Math.pow(g - meanGap, 2), 0) / gaps.length;
    const gapStdev = Math.sqrt(gapVariance);

    if (gapStdev < VERIFICATION_CONFIG.HUMAN_TIMING_MIN_STDEV_MS) {
      return {
        status: 'flagged',
        eligible: false,
        rejectReason: 'bot_like',
        engineResult,
      };
    }
  }

  // Step 10: Eligibility minimum accuracy check
  const isEligible = engineResult.accuracy >= tournament.minAccuracy;

  // Step 11: Return verified payload ready for DB transaction
  return {
    status: 'submitted',
    eligible: isEligible,
    rejectReason: isEligible ? undefined : 'below_min_accuracy',
    engineResult,
  };
}
