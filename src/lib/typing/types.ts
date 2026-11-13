export type TestMode = 'time' | 'words';

export interface TestConfig {
  mode: TestMode;
  modeValue: number; // e.g. 15, 30, 60, 120 (seconds) or 10, 25, 50, 100 (words)
  punctuation: boolean;
  numbers: boolean;
  language: 'english';
}

export type KeyEvent = [number, string]; // [tMs, key] where key is 1 char, ' ', or '\b'

export interface CommittedWord {
  target: string;
  typed: string;
  isCorrect: boolean;
}

export interface EngineState {
  config: TestConfig;
  seed: number;
  words: string[];
  currentWordIndex: number;
  currentInput: string;
  committedWords: CommittedWord[];
  startTime: number | null;
  lastTime: number | null;
  isFinished: boolean;
  events: KeyEvent[];
  totalKeysPressed: number;
  correctKeysPressed: number;
}

export interface MetricChars {
  correct: number;
  incorrect: number;
  extra: number;
  missed: number;
}

export interface EngineResult {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  correctChars: number;
  totalChars: number;
  chars: MetricChars;
  perSecond: number[];
  durationMs: number;
  completedAt?: string;
}
