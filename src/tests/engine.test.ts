import { describe, it, expect } from 'vitest';
import { initialState, applyKey, replay } from '../lib/typing/engine';
import { getWord, createWordGenerator } from '../lib/typing/words';
import { TestConfig, KeyEvent } from '../lib/typing/types';

describe('Deterministic PRNG and Words', () => {
  it('should return identical words for identical seed', () => {
    const config: TestConfig = {
      mode: 'time',
      modeValue: 30,
      punctuation: false,
      numbers: false,
      language: 'english',
    };

    const word1 = getWord(config, 424242, 0);
    const word2 = getWord(config, 424242, 0);
    const word3 = getWord(config, 424242, 5);
    const word4 = getWord(config, 424242, 5);

    expect(word1).toBe(word2);
    expect(word3).toBe(word4);
  });

  it('should format punctuation and capitalization deterministically', () => {
    const config: TestConfig = {
      mode: 'words',
      modeValue: 50,
      punctuation: true,
      numbers: true,
      language: 'english',
    };

    const gen1 = createWordGenerator(config, 1337);
    const gen2 = createWordGenerator(config, 1337);

    const words1 = gen1.getWords(20);
    const words2 = gen2.getWords(20);

    expect(words1).toEqual(words2);
    // First word should be capitalized
    expect(words1[0].charAt(0)).toBe(words1[0].charAt(0).toUpperCase());
  });
});

describe('Typing Engine & Replay Equivalence', () => {
  const config: TestConfig = {
    mode: 'words',
    modeValue: 3,
    punctuation: false,
    numbers: false,
    language: 'english',
  };

  it('should agree between applyKey stepping and replay', () => {
    const seed = 98765;
    const testGen = createWordGenerator(config, seed);
    const targetWords = testGen.getWords(3);

    // Simulate typing the words perfectly
    const events: KeyEvent[] = [];
    let curTime = 100;

    for (let w = 0; w < targetWords.length; w++) {
      const word = targetWords[w];
      for (let c = 0; c < word.length; c++) {
        events.push([curTime, word[c]]);
        curTime += 80;
      }
      if (w < targetWords.length - 1) {
        events.push([curTime, ' ']);
        curTime += 90;
      }
    }

    // Run applyKey step-by-step
    let state = initialState(config, seed);
    for (const [t, k] of events) {
      state = applyKey(state, k, t);
    }

    // Run replay
    const replayResult = replay(config, seed, events);

    expect(state.isFinished).toBe(true);
    expect(replayResult.accuracy).toBe(100);
    expect(replayResult.wpm).toBeGreaterThan(0);
    expect(replayResult.chars.incorrect).toBe(0);
  });

  it('should handle backspace in current word and into previous incorrect word', () => {
    const seed = 12345;
    const testGen = createWordGenerator(config, seed);
    const targetWords = testGen.getWords(2);
    let state = initialState(config, seed);

    // Type a typo in first word
    state = applyKey(state, 'z', 10);
    expect(state.currentInput).toBe('z');

    // Backspace should clear it
    state = applyKey(state, '\b', 20);
    expect(state.currentInput).toBe('');

    // Now type an incorrect word and press Space to commit it
    state = applyKey(state, 'x', 30);
    state = applyKey(state, ' ', 40);
    expect(state.currentWordIndex).toBe(1);
    expect(state.committedWords.length).toBe(1);
    expect(state.committedWords[0].isCorrect).toBe(false);

    // Backspace at the start of word 1 should go back into word 0 because it was incorrect!
    state = applyKey(state, '\b', 50);
    expect(state.currentWordIndex).toBe(0);
    expect(state.currentInput).toBe('x');
    expect(state.committedWords.length).toBe(0);
  });

  it('should not go back into previous word if it was committed correctly', () => {
    const seed = 12345;
    const testGen = createWordGenerator(config, seed);
    const targetWords = testGen.getWords(2);
    let state = initialState(config, seed);

    // Type first word correctly
    for (const char of targetWords[0]) {
      state = applyKey(state, char, 10);
    }
    state = applyKey(state, ' ', 20);
    expect(state.currentWordIndex).toBe(1);
    expect(state.committedWords[0].isCorrect).toBe(true);

    // Backspace at start of word 1 should do nothing because word 0 was correct
    state = applyKey(state, '\b', 30);
    expect(state.currentWordIndex).toBe(1);
    expect(state.currentInput).toBe('');
  });

  it('should cap extra characters at 10 past word length', () => {
    const seed = 12345;
    const testGen = createWordGenerator(config, seed);
    const target = testGen.getWord(0);
    let state = initialState(config, seed);

    // Type target
    for (const char of target) {
      state = applyKey(state, char, 10);
    }

    // Type 15 extra characters
    for (let i = 0; i < 15; i++) {
      state = applyKey(state, 'x', 20 + i);
    }

    // Should have target length + 10 characters exactly
    expect(state.currentInput.length).toBe(target.length + 10);
  });
});
