import { TestConfig } from './types';
import { createMulberry32, randomInt } from './prng';
import englishWordList from './wordlists/english-1k.json';

const WORD_LIST = englishWordList as string[];

export interface WordGenerator {
  getWord: (index: number) => string;
  getWords: (count: number) => string[];
}

/**
 * Creates a deterministic word generator for a given config and seed.
 */
export function createWordGenerator(config: Pick<TestConfig, 'punctuation' | 'numbers'>, seed: number): WordGenerator {
  const rng = createMulberry32(seed);
  const cache: string[] = [];
  let prevWordEndsSentence = true; // Capitalize the first word

  function generateNext(): string {
    const isNumber = config.numbers && rng() < 0.10;
    let baseWord = '';

    if (isNumber) {
      baseWord = String(randomInt(rng, 1, 9999));
    } else {
      const idx = Math.floor(rng() * WORD_LIST.length);
      baseWord = WORD_LIST[idx] || 'runner';
    }

    if (config.punctuation) {
      // Capitalize if sentence start
      if (prevWordEndsSentence && !isNumber) {
        baseWord = baseWord.charAt(0).toUpperCase() + baseWord.slice(1);
        prevWordEndsSentence = false;
      }

      // Add punctuation
      const pRoll = rng();
      if (pRoll < 0.08) {
        baseWord = baseWord + '.';
        prevWordEndsSentence = true;
      } else if (pRoll < 0.15) {
        baseWord = baseWord + ',';
      } else if (pRoll < 0.17) {
        baseWord = baseWord + '!';
        prevWordEndsSentence = true;
      } else if (pRoll < 0.19) {
        baseWord = baseWord + '?';
        prevWordEndsSentence = true;
      } else if (pRoll < 0.22 && !isNumber) {
        baseWord = `"${baseWord}"`;
      }
    }

    return baseWord;
  }

  function getWord(index: number): string {
    while (cache.length <= index) {
      cache.push(generateNext());
    }
    return cache[index];
  }

  function getWords(count: number): string[] {
    while (cache.length < count) {
      cache.push(generateNext());
    }
    return cache.slice(0, count);
  }

  return { getWord, getWords };
}

/**
 * Pure helper function getWord(config, seed, index) as specified in the build plan.
 */
export function getWord(config: Pick<TestConfig, 'punctuation' | 'numbers'>, seed: number, index: number): string {
  const gen = createWordGenerator(config, seed);
  return gen.getWord(index);
}

/**
 * Generates an initial batch of words for a test.
 */
export function generateInitialWords(config: TestConfig, seed: number): string[] {
  const gen = createWordGenerator(config, seed);
  const initialCount = config.mode === 'words' ? config.modeValue : Math.max(100, config.modeValue * 3);
  return gen.getWords(initialCount);
}
