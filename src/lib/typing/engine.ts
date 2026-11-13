import { EngineState, EngineResult, KeyEvent, TestConfig } from './types';
import { generateInitialWords, createWordGenerator } from './words';
import { computeScore } from './scoring';

export const MAX_EXTRA_CHARS = 10;

/**
 * Initializes a new engine state.
 */
export function initialState(config: TestConfig, seed: number): EngineState {
  const words = generateInitialWords(config, seed);

  return {
    config,
    seed,
    words,
    currentWordIndex: 0,
    currentInput: '',
    committedWords: [],
    startTime: null,
    lastTime: null,
    isFinished: false,
    events: [],
    totalKeysPressed: 0,
    correctKeysPressed: 0,
  };
}

/**
 * Pure function: applies a single key event to the engine state and returns the next state.
 */
export function applyKey(state: EngineState, key: string, tMs: number): EngineState {
  if (state.isFinished) {
    return state;
  }

  // Clone shallow state structures to ensure purity
  const committedWords = [...state.committedWords];
  let words = state.words;
  let currentWordIndex = state.currentWordIndex;
  let currentInput = state.currentInput;
  let isFinished: boolean = state.isFinished;
  let totalKeysPressed = state.totalKeysPressed;
  let correctKeysPressed = state.correctKeysPressed;
  const events: KeyEvent[] = [...state.events, [tMs, key]];

  const targetWord = words[currentWordIndex] || '';

  // Handle Space: commit current word
  if (key === ' ') {
    if (currentInput.length === 0) {
      // Space does nothing if current word is empty
      return { ...state, events };
    }

    totalKeysPressed++;
    // Space is counted as correct if the typed word completely matches target
    const isCorrect = currentInput === targetWord;
    if (isCorrect) {
      correctKeysPressed++;
    }

    committedWords.push({
      target: targetWord,
      typed: currentInput,
      isCorrect,
    });

    currentWordIndex++;
    currentInput = '';

    // In time mode: if we need more words, dynamically generate
    if (state.config.mode === 'time' && currentWordIndex >= words.length - 20) {
      const generator = createWordGenerator(state.config, state.seed);
      words = generator.getWords(words.length + 50);
    }

    // In words mode: check if all words finished
    if (state.config.mode === 'words' && currentWordIndex >= state.config.modeValue) {
      isFinished = true;
    }

    return {
      ...state,
      words,
      currentWordIndex,
      currentInput,
      committedWords,
      isFinished,
      events,
      totalKeysPressed,
      correctKeysPressed,
      lastTime: tMs,
      startTime: state.startTime ?? tMs,
    };
  }

  // Handle Backspace
  if (key === '\b') {
    if (currentInput.length > 0) {
      currentInput = currentInput.slice(0, -1);
    } else if (currentWordIndex > 0 && committedWords.length > 0) {
      // Backspace at the start of a word goes back to the previous word only if incorrectly committed
      const lastCommitted = committedWords[committedWords.length - 1];
      if (!lastCommitted.isCorrect) {
        committedWords.pop();
        currentWordIndex--;
        currentInput = lastCommitted.typed;
      }
    }

    return {
      ...state,
      committedWords,
      currentWordIndex,
      currentInput,
      events,
      lastTime: tMs,
      startTime: state.startTime ?? tMs,
    };
  }

  // Handle printable character
  if (key.length === 1) {
    // Check extra char limit
    if (currentInput.length >= targetWord.length + MAX_EXTRA_CHARS) {
      return { ...state, events };
    }

    totalKeysPressed++;

    // Check accuracy correctness for this keypress
    if (currentInput.length < targetWord.length) {
      const expectedChar = targetWord[currentInput.length];
      if (key === expectedChar) {
        correctKeysPressed++;
      }
    }

    currentInput += key;

    // Check end condition for words mode: last word typed exactly
    if (
      state.config.mode === 'words' &&
      currentWordIndex === state.config.modeValue - 1 &&
      currentInput === targetWord
    ) {
      // Commit the final word
      committedWords.push({
        target: targetWord,
        typed: currentInput,
        isCorrect: true,
      });
      isFinished = true;
    }

    return {
      ...state,
      committedWords,
      currentInput,
      isFinished,
      events,
      totalKeysPressed,
      correctKeysPressed,
      lastTime: tMs,
      startTime: state.startTime ?? tMs,
    };
  }

  return state;
}

/**
 * Replays a full event stream from seed and config to compute verified score.
 */
export function replay(config: TestConfig, seed: number, events: KeyEvent[]): EngineResult {
  let state = initialState(config, seed);

  for (const [tMs, key] of events) {
    state = applyKey(state, key, tMs);
    if (state.isFinished) {
      break;
    }
  }

  // If time mode, test duration is modeValue in seconds; otherwise from events
  let durationMs: number | undefined;
  if (config.mode === 'time') {
    durationMs = config.modeValue * 1000;
  }

  return computeScore(state, durationMs);
}
