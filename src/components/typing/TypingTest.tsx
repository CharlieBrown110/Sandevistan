'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TestConfig, EngineState, EngineResult, KeyEvent } from '@/lib/typing/types';
import { initialState, applyKey } from '@/lib/typing/engine';
import { computeScore } from '@/lib/typing/scoring';
import { WordsView } from './WordsView';
import { ConfigBar } from './ConfigBar';
import { ResultsPanel } from './ResultsPanel';
import { useTheme } from '../theme/ThemeProvider';
import { AlertCircle, MousePointer, RotateCcw } from 'lucide-react';
import { clsx } from 'clsx';

interface TypingTestProps {
  initialConfig?: TestConfig;
  initialSeed?: number;
  isTournamentLocked?: boolean;
  onSubmitAttempt?: (events: KeyEvent[], claimed: { wpm: number; accuracy: number }) => Promise<void>;
  tournamentResultContext?: {
    isNewBest: boolean;
    rank: number | null;
    totalParticipants: number;
    eligible: boolean;
    reason?: string;
  };
  serverVerifiedResult?: EngineResult | null;
}

const DEFAULT_CONFIG: TestConfig = {
  mode: 'time',
  modeValue: 30,
  punctuation: false,
  numbers: false,
  language: 'english',
};

const DEFAULT_INITIAL_SEED = 133742;

export function TypingTest({
  initialConfig = DEFAULT_CONFIG,
  initialSeed,
  isTournamentLocked = false,
  onSubmitAttempt,
  tournamentResultContext,
  serverVerifiedResult,
}: TypingTestProps) {
  const [config, setConfig] = useState<TestConfig>(initialConfig);
  // Deterministic seed for SSR / initial render prevents hydration mismatches
  const [seed, setSeed] = useState<number>(() => initialSeed ?? DEFAULT_INITIAL_SEED);
  const [state, setState] = useState<EngineState>(() => initialState(initialConfig, initialSeed ?? DEFAULT_INITIAL_SEED));
  const [result, setResult] = useState<EngineResult | null>(null);
  const [mounted, setMounted] = useState<boolean>(false);

  const [isFocused, setIsFocused] = useState<boolean>(true);
  const [capsLockActive, setCapsLockActive] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Live timer / WPM ticker
  const [timeRemaining, setTimeRemaining] = useState<number>(config.mode === 'time' ? config.modeValue : 0);
  const [wordsRemaining, setWordsRemaining] = useState<number>(config.mode === 'words' ? config.modeValue : 0);
  const [liveWpm, setLiveWpm] = useState<number>(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const testStartTimeRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const stateRef = useRef<EngineState>(state);
  stateRef.current = state;

  const { fontSize, showLiveWpm } = useTheme();

  // Reset or restart test
  const restartTest = useCallback((newSeed?: number) => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    const nextSeed = newSeed ?? (initialSeed ?? Math.floor(Math.random() * 2147483647));
    setSeed(nextSeed);
    const freshState = initialState(config, nextSeed);
    setState(freshState);
    setResult(null);
    testStartTimeRef.current = null;
    setTimeRemaining(config.mode === 'time' ? config.modeValue : 0);
    setWordsRemaining(config.mode === 'words' ? config.modeValue : 0);
    setLiveWpm(0);

    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  }, [config, initialSeed]);

  // When component mounts on client, randomize seed for standalone test
  useEffect(() => {
    setMounted(true);
    if (initialSeed === undefined) {
      restartTest(Math.floor(Math.random() * 2147483647));
    }
  }, []);

  // When initialSeed or initialConfig changes (e.g. tournament loaded)
  useEffect(() => {
    if (initialSeed !== undefined) {
      restartTest(initialSeed);
    }
  }, [initialSeed, restartTest]);

  // When server verified result is supplied
  useEffect(() => {
    if (serverVerifiedResult) {
      setResult(serverVerifiedResult);
      setIsSubmitting(false);
    }
  }, [serverVerifiedResult]);

  // Focus input automatically
  useEffect(() => {
    inputRef.current?.focus();
  }, [result]);

  // Finish test handler
  const finishTest = useCallback(async (finalState: EngineState) => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    const localScore = computeScore(finalState);

    if (onSubmitAttempt) {
      // Tournament mode: submit to server
      setIsSubmitting(true);
      try {
        await onSubmitAttempt(finalState.events, {
          wpm: localScore.wpm,
          accuracy: localScore.accuracy,
        });
      } catch {
        setIsSubmitting(false);
      }
    } else {
      // Standalone mode: save to practice history in localStorage
      setResult(localScore);
      try {
        const historyKey = 'cyber_practice_history';
        const existing = JSON.parse(localStorage.getItem(historyKey) || '[]');
        const updated = [
          {
            wpm: localScore.wpm,
            rawWpm: localScore.rawWpm,
            accuracy: localScore.accuracy,
            mode: config.mode,
            modeValue: config.modeValue,
            date: new Date().toISOString(),
          },
          ...existing.slice(0, 9),
        ];
        localStorage.setItem(historyKey, JSON.stringify(updated));
      } catch {
        // ignore localStorage errors
      }
    }
  }, [config, onSubmitAttempt]);

  // Handle timer tick for time mode
  const startTimerTick = useCallback(() => {
    if (timerIntervalRef.current) return;

    timerIntervalRef.current = setInterval(() => {
      if (!testStartTimeRef.current) return;
      const elapsedMs = performance.now() - testStartTimeRef.current;
      const elapsedSec = Math.floor(elapsedMs / 1000);

      if (config.mode === 'time') {
        const remaining = Math.max(0, config.modeValue - elapsedSec);
        setTimeRemaining(remaining);

        // Update live WPM
        if (elapsedSec > 0) {
          const currentScore = computeScore(stateRef.current, elapsedMs);
          setLiveWpm(currentScore.wpm);
        }

        if (remaining <= 0) {
          clearInterval(timerIntervalRef.current!);
          timerIntervalRef.current = null;
          const finalState = { ...stateRef.current, isFinished: true };
          setState(finalState);
          finishTest(finalState);
        }
      } else {
        // Words mode
        const remainingWords = Math.max(0, config.modeValue - stateRef.current.currentWordIndex);
        setWordsRemaining(remainingWords);

        if (elapsedSec > 0) {
          const currentScore = computeScore(stateRef.current, elapsedMs);
          setLiveWpm(currentScore.wpm);
        }
      }
    }, 100);
  }, [config, finishTest]);

  // Input key listener
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Ignore Ctrl/Meta modifiers
    if (e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }

    // Check Caps Lock
    setCapsLockActive(e.getModifierState('CapsLock'));

    // Handle Tab to restart
    if (e.key === 'Tab') {
      e.preventDefault();
      restartTest();
      return;
    }

    // Do nothing if already finished
    if (state.isFinished || result) {
      return;
    }

    let key = e.key;
    if (key === 'Backspace') {
      key = '\b';
    } else if (key === ' ') {
      key = ' ';
    } else if (key.length !== 1) {
      // Ignore functional keys like Shift, ArrowUp, etc.
      return;
    }

    e.preventDefault();

    // Start timer on first printable keystroke
    const now = performance.now();
    if (testStartTimeRef.current === null) {
      testStartTimeRef.current = now;
      startTimerTick();
    }

    const tMs = Math.round(now - testStartTimeRef.current);
    const nextState = applyKey(state, key, tMs);
    setState(nextState);

    // If words mode finished on this keypress
    if (nextState.isFinished) {
      finishTest(nextState);
    }
  };

  // Prevent paste, drop, context menu
  const handlePasteDrop = (e: React.SyntheticEvent) => {
    e.preventDefault();
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center select-none font-mono">
      {/* Config Bar (Hidden in tournament locked mode or results) */}
      {!isTournamentLocked && !result && (
        <div className="mb-6 w-full flex justify-center">
          <ConfigBar
            config={config}
            onChange={(newConfig) => {
              setConfig(newConfig);
              const freshSeed = Math.floor(Math.random() * 2147483647);
              setSeed(freshSeed);
              setState(initialState(newConfig, freshSeed));
              setTimeRemaining(newConfig.mode === 'time' ? newConfig.modeValue : 0);
              setWordsRemaining(newConfig.mode === 'words' ? newConfig.modeValue : 0);
            }}
            disabled={state.startTime !== null}
          />
        </div>
      )}

      {/* Results View */}
      {result ? (
        <ResultsPanel
          result={result}
          onRestart={() => restartTest()}
          onNextTest={() => restartTest(Math.floor(Math.random() * 2147483647))}
          tournamentContext={tournamentResultContext}
        />
      ) : (
        /* Active Typing Area */
        <div className="relative w-full space-y-4">
          {/* Live Telemetry Display */}
          <div className="flex items-center justify-between px-2 text-xs text-gray-400 font-mono">
            <div className="flex items-center gap-3">
              {config.mode === 'time' ? (
                <span className="text-2xl font-bold text-cyber-yellow">
                  {timeRemaining}
                  <span className="text-xs text-gray-500 ml-1">s</span>
                </span>
              ) : (
                <span className="text-2xl font-bold text-cyber-yellow">
                  {config.modeValue - state.currentWordIndex}
                  <span className="text-xs text-gray-500 ml-1">left</span>
                </span>
              )}
            </div>

            {showLiveWpm && testStartTimeRef.current !== null && (
              <div className="flex items-center gap-1.5 text-cyber-cyan font-bold">
                <span className="text-xs text-gray-500">LIVE:</span>
                <span className="text-xl">{liveWpm}</span>
                <span className="text-[10px] text-gray-500">WPM</span>
              </div>
            )}
          </div>

          {/* Hidden Input field */}
          <input
            ref={inputRef}
            type="text"
            className="absolute -top-96 left-0 opacity-0 pointer-events-none"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck="false"
            onKeyDown={handleKeyDown}
            onPaste={handlePasteDrop}
            onDrop={handlePasteDrop}
            onContextMenu={handlePasteDrop}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />

          {/* Words Area */}
          <div
            onClick={() => inputRef.current?.focus()}
            className={clsx(
              'relative p-6 rounded-lg bg-cyber-panel/40 dark:bg-cyber-panel/40 light:bg-slate-50 border border-cyber-border/70 cursor-text transition-opacity duration-150',
              !isFocused && 'blur-[2px] opacity-70'
            )}
          >
            <WordsView
              words={state.words}
              currentWordIndex={state.currentWordIndex}
              currentInput={state.currentInput}
              committedWords={state.committedWords}
              fontSize={fontSize}
            />
          </div>

          {/* Unfocused Overlay Notice */}
          {!isFocused && !result && (
            <div
              onClick={() => inputRef.current?.focus()}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px] cursor-pointer rounded-lg text-cyber-yellow font-mono z-30"
            >
              <MousePointer className="w-6 h-6 mb-2 animate-bounce text-cyber-yellow" />
              <span className="text-sm font-bold tracking-widest uppercase">
                CLICK HERE OR PRESS ANY KEY TO FOCUS
              </span>
            </div>
          )}

          {/* Caps Lock Warning */}
          {capsLockActive && (
            <div className="flex items-center justify-center gap-2 p-2 bg-cyber-magenta/20 border border-cyber-magenta text-cyber-magenta text-xs font-mono rounded">
              <AlertCircle className="w-4 h-4 animate-pulse" />
              <span>WARNING: CAPS LOCK IS ON</span>
            </div>
          )}

          {/* Bottom Hint */}
          <div className="flex items-center justify-between text-[11px] text-gray-500 px-2 font-mono">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-cyber-panel border border-cyber-border text-gray-400">
                Tab
              </kbd>
              <span>to restart test</span>
            </span>

            {isSubmitting && (
              <span className="text-cyber-yellow animate-pulse">
                [ VERIFYING SCORE ON EDGE SERVER... ]
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
