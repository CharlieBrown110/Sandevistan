import { describe, it, expect } from 'vitest';
import { computeScore, round2 } from '../lib/typing/scoring';
import { EngineState, TestConfig } from '../lib/typing/types';

describe('Scoring Logic & Precision', () => {
  const config: TestConfig = {
    mode: 'time',
    modeValue: 60,
    punctuation: false,
    numbers: false,
    language: 'english',
  };

  it('correctly rounds to 2 decimals using round2', () => {
    expect(round2(123.456)).toBe(123.46);
    expect(round2(123.454)).toBe(123.45);
    expect(round2(0)).toBe(0);
    expect(round2(NaN)).toBe(0);
  });

  it('computes 100% accuracy and accurate net WPM for correct words', () => {
    // 5 words of 4 chars each ("test", "code", "fast", "type", "good") = 20 chars + 5 spaces = 25 chars.
    // 25 chars / 5 = 5 words in 1 minute (60s) = 5 WPM
    const state: EngineState = {
      config,
      seed: 123,
      words: ['test', 'code', 'fast', 'type', 'good'],
      currentWordIndex: 5,
      currentInput: '',
      committedWords: [
        { target: 'test', typed: 'test', isCorrect: true },
        { target: 'code', typed: 'code', isCorrect: true },
        { target: 'fast', typed: 'fast', isCorrect: true },
        { target: 'type', typed: 'type', isCorrect: true },
        { target: 'good', typed: 'good', isCorrect: true },
      ],
      startTime: 0,
      lastTime: 60000,
      isFinished: true,
      events: [
        [100, 't'], [200, 'e'], [300, 's'], [400, 't'], [500, ' '],
        [600, 'c'], [700, 'o'], [800, 'd'], [900, 'e'], [1000, ' '],
        [1100, 'f'], [1200, 'a'], [1300, 's'], [1400, 't'], [1500, ' '],
        [1600, 't'], [1700, 'y'], [1800, 'p'], [1900, 'e'], [2000, ' '],
        [2100, 'g'], [2200, 'o'], [2300, 'o'], [2400, 'd'], [2500, ' '],
      ],
      totalKeysPressed: 25,
      correctKeysPressed: 25,
    };

    const res = computeScore(state, 60000);
    expect(res.wpm).toBe(5);
    expect(res.accuracy).toBe(100);
    expect(res.chars.correct).toBe(25);
    expect(res.chars.incorrect).toBe(0);
  });

  it('calculates penalty for incorrect words', () => {
    const state: EngineState = {
      config,
      seed: 123,
      words: ['test', 'wrong'],
      currentWordIndex: 2,
      currentInput: '',
      committedWords: [
        { target: 'test', typed: 'test', isCorrect: true },
        { target: 'wrong', typed: 'wroxx', isCorrect: false },
      ],
      startTime: 0,
      lastTime: 60000,
      isFinished: true,
      events: [
        [100, 't'], [200, 'e'], [300, 's'], [400, 't'], [500, ' '],
        [600, 'w'], [700, 'r'], [800, 'o'], [900, 'x'], [1000, 'x'], [1100, ' '],
      ],
      totalKeysPressed: 11,
      correctKeysPressed: 8,
    };

    const res = computeScore(state, 60000);
    // Only "test" + 1 space = 5 correct characters. 5 / 5 / 1 = 1 WPM
    expect(res.wpm).toBe(1);
    expect(res.accuracy).toBe(round2((8 / 11) * 100));
    expect(res.chars.incorrect).toBeGreaterThan(0);
  });
});
