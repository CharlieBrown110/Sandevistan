import { EngineState, EngineResult, MetricChars } from './types';

export function round2(num: number): number {
  if (isNaN(num) || !isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function computeScore(state: EngineState, durationOverrideMs?: number): EngineResult {
  const { config, committedWords, currentInput, currentWordIndex, words, events } = state;

  // Determine test duration in minutes
  let testDurationMs = durationOverrideMs ?? 0;
  if (!testDurationMs) {
    if (config.mode === 'time') {
      testDurationMs = config.modeValue * 1000;
    } else {
      const lastEventTime = events.length > 0 ? events[events.length - 1][0] : 0;
      testDurationMs = Math.max(1000, lastEventTime);
    }
  }

  const minutes = Math.max(0.0001, testDurationMs / 60000);

  // 1. Correct characters calculation
  let correctChars = 0;
  for (let i = 0; i < committedWords.length; i++) {
    const item = committedWords[i];
    if (item.isCorrect) {
      correctChars += item.target.length;
      // 1 per space after a correct word (except potentially trailing)
      correctChars += 1;
    }
  }

  // Final in-progress word check
  const currentTarget = words[currentWordIndex] || '';
  if (currentInput.length > 0 && currentTarget.startsWith(currentInput)) {
    correctChars += currentInput.length;
  }

  // 2. Chars breakdown: { correct, incorrect, extra, missed }
  const chars: MetricChars = {
    correct: 0,
    incorrect: 0,
    extra: 0,
    missed: 0,
  };

  for (const item of committedWords) {
    const minLen = Math.min(item.target.length, item.typed.length);
    for (let c = 0; c < minLen; c++) {
      if (item.typed[c] === item.target[c]) {
        chars.correct++;
      } else {
        chars.incorrect++;
      }
    }
    if (item.typed.length > item.target.length) {
      chars.extra += (item.typed.length - item.target.length);
    } else if (item.typed.length < item.target.length) {
      chars.missed += (item.target.length - item.typed.length);
    }
    // Count the space character
    if (item.isCorrect) {
      chars.correct++;
    } else {
      chars.incorrect++;
    }
  }

  // Final in-progress word chars
  if (currentInput.length > 0) {
    const minLen = Math.min(currentTarget.length, currentInput.length);
    for (let c = 0; c < minLen; c++) {
      if (currentInput[c] === currentTarget[c]) {
        chars.correct++;
      } else {
        chars.incorrect++;
      }
    }
    if (currentInput.length > currentTarget.length) {
      chars.extra += (currentInput.length - currentTarget.length);
    }
  }

  // 3. Raw chars typed (excluding backspace)
  let totalNonBackspaceEvents = 0;
  for (const [, key] of events) {
    if (key !== '\b') {
      totalNonBackspaceEvents++;
    }
  }

  // 4. Accuracy: correctKeypresses / totalCharacterKeypresses * 100
  let accuracy = 100;
  if (state.totalKeysPressed > 0) {
    accuracy = (state.correctKeysPressed / state.totalKeysPressed) * 100;
  } else if (totalNonBackspaceEvents > 0) {
    accuracy = (chars.correct / totalNonBackspaceEvents) * 100;
  }
  accuracy = Math.min(100, Math.max(0, accuracy));

  // 5. WPM calculations
  const wpm = (correctChars / 5) / minutes;
  const rawWpm = (totalNonBackspaceEvents / 5) / minutes;

  // 6. Per-second breakdown (Raw WPM per second bucket)
  const totalSeconds = Math.max(1, Math.ceil(testDurationMs / 1000));
  const perSecondCounts: number[] = new Array(totalSeconds).fill(0);

  for (const [tMs, key] of events) {
    if (key !== '\b') {
      const sec = Math.min(totalSeconds - 1, Math.max(0, Math.floor(tMs / 1000)));
      perSecondCounts[sec]++;
    }
  }

  // Convert chars per second to WPM: (count / 5) * 60 = count * 12
  const perSecond: number[] = perSecondCounts.map((count) => count * 12);

  // 7. Consistency calculation: max(0, 100 * (1 - stdev / mean))
  let consistency = 100;
  if (perSecond.length > 1) {
    const sum = perSecond.reduce((acc, v) => acc + v, 0);
    const mean = sum / perSecond.length;
    if (mean > 0) {
      const variance = perSecond.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / perSecond.length;
      const stdev = Math.sqrt(variance);
      consistency = Math.max(0, 100 * (1 - stdev / mean));
    } else {
      consistency = 0;
    }
  }

  return {
    wpm: round2(wpm),
    rawWpm: round2(rawWpm),
    accuracy: round2(accuracy),
    consistency: round2(consistency),
    correctChars,
    totalChars: totalNonBackspaceEvents,
    chars,
    perSecond,
    durationMs: Math.round(testDurationMs),
    completedAt: new Date().toISOString(),
  };
}
