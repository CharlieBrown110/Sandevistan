'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Caret } from './Caret';
import { useTheme } from '../theme/ThemeProvider';
import { clsx } from 'clsx';
import { CommittedWord } from '@/lib/typing/types';

interface WordsViewProps {
  words: string[];
  currentWordIndex: number;
  currentInput: string;
  committedWords: CommittedWord[];
  fontSize?: number;
}

export function WordsView({
  words,
  currentWordIndex,
  currentInput,
  committedWords,
  fontSize = 24,
}: WordsViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wordsWrapperRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<(HTMLDivElement | null)[]>([]);
  const { caretStyle } = useTheme();

  const [caretPos, setCaretPos] = useState<{ left: number; top: number; height: number }>({
    left: 0,
    top: 0,
    height: Math.round(fontSize * 1.3),
  });

  const [scrollOffset, setScrollOffset] = useState<number>(0);

  // Exact line height calculation for 3 visible lines
  const lineHeight = Math.round(fontSize * 1.7);
  const visibleLinesHeight = lineHeight * 3;

  const updateCaretAndScroll = useCallback(() => {
    const currentWordEl = wordRefs.current[currentWordIndex];
    const wrapperEl = wordsWrapperRef.current;
    if (!currentWordEl || !wrapperEl) return;

    // 1. Calculate Caret Position inside active word
    const letterEls = currentWordEl.querySelectorAll<HTMLElement>('.typing-char');
    let targetLeft = currentWordEl.offsetLeft;
    let targetTop = currentWordEl.offsetTop;
    let targetHeight = Math.round(fontSize * 1.3);

    if (letterEls.length > 0) {
      if (currentInput.length < letterEls.length) {
        // Position at upcoming character
        const currentCharEl = letterEls[currentInput.length];
        if (currentCharEl) {
          targetLeft = currentWordEl.offsetLeft + currentCharEl.offsetLeft;
          targetTop = currentWordEl.offsetTop + currentCharEl.offsetTop;
          targetHeight = currentCharEl.offsetHeight || targetHeight;
        }
      } else {
        // Position immediately after the last typed character
        const lastCharEl = letterEls[letterEls.length - 1];
        if (lastCharEl) {
          targetLeft = currentWordEl.offsetLeft + lastCharEl.offsetLeft + lastCharEl.offsetWidth;
          targetTop = currentWordEl.offsetTop + lastCharEl.offsetTop;
          targetHeight = lastCharEl.offsetHeight || targetHeight;
        }
      }
    }

    setCaretPos({
      left: targetLeft,
      top: targetTop,
      height: targetHeight,
    });

    // 2. Line Scrolling: Compute line 1 and line 2 offsets to keep active line centered
    const firstWordEl = wordRefs.current[0];
    const line1Top = firstWordEl ? firstWordEl.offsetTop : 0;

    // Find the first word that wraps to line 2
    let line2Top: number | null = null;
    for (let i = 0; i < wordRefs.current.length; i++) {
      const el = wordRefs.current[i];
      if (el && el.offsetTop > line1Top + 5) {
        line2Top = el.offsetTop;
        break;
      }
    }

    if (line2Top !== null && currentWordEl.offsetTop > line2Top + 5) {
      // Line 3 or beyond: scroll so the active line stays centered in line 2 position
      const newOffset = currentWordEl.offsetTop - line2Top;
      setScrollOffset(newOffset);
    } else {
      // Line 1 or Line 2: keep at top
      setScrollOffset(0);
    }
  }, [currentWordIndex, currentInput, fontSize]);

  useEffect(() => {
    updateCaretAndScroll();
  }, [updateCaretAndScroll]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => updateCaretAndScroll();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateCaretAndScroll]);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden select-none font-mono py-1"
      style={{
        height: `${visibleLinesHeight}px`,
        fontSize: `${fontSize}px`,
        lineHeight: `${lineHeight}px`,
      }}
    >
      {/* Smooth translated inner wrapper */}
      <div
        ref={wordsWrapperRef}
        className="relative w-full flex flex-wrap gap-x-3 gap-y-1 transition-transform duration-150 ease-out"
        style={{
          transform: `translateY(-${scrollOffset}px)`,
        }}
      >
        {/* Caret is placed inside wrapper so it stays in exact lockstep */}
        <Caret
          style={caretStyle}
          left={caretPos.left}
          top={caretPos.top}
          height={caretPos.height}
        />

        {words.map((targetWord, wordIdx) => {
          const isCommitted = wordIdx < currentWordIndex;
          const isCurrent = wordIdx === currentWordIndex;
          const committed = isCommitted ? committedWords[wordIdx] : null;

          return (
            <div
              key={wordIdx}
              ref={(el) => {
                wordRefs.current[wordIdx] = el;
              }}
              className={clsx(
                'relative inline-flex whitespace-nowrap tracking-wide select-none',
                isCommitted && !committed?.isCorrect && 'border-b border-cyber-magenta/80'
              )}
            >
              {isCommitted && committed && (
                // Render committed word
                <>
                  {Array.from(committed.typed).map((char, charIdx) => {
                    const isTargetCharCorrect = char === targetWord[charIdx];
                    const isExtra = charIdx >= targetWord.length;
                    return (
                      <span
                        key={charIdx}
                        className={clsx(
                          'inline-block',
                          isExtra
                            ? 'text-cyber-magenta/80 line-through'
                            : isTargetCharCorrect
                            ? 'text-cyber-cyan dark:text-cyber-cyan light:text-cyan-700 font-medium'
                            : 'text-cyber-magenta dark:text-cyber-magenta light:text-rose-600 font-bold'
                        )}
                      >
                        {char}
                      </span>
                    );
                  })}
                  {/* If typed was shorter than target, show missed chars */}
                  {committed.typed.length < targetWord.length && (
                    <span className="text-gray-600 dark:text-gray-600 light:text-slate-400 inline-block">
                      {targetWord.slice(committed.typed.length)}
                    </span>
                  )}
                </>
              )}

              {isCurrent && (
                // Render current active word with .typing-char markers
                <>
                  {Array.from(targetWord).map((targetChar, charIdx) => {
                    const typedChar = currentInput[charIdx];
                    const isTyped = charIdx < currentInput.length;
                    const isCorrect = typedChar === targetChar;

                    return (
                      <span
                        key={charIdx}
                        className={clsx(
                          'typing-char inline-block',
                          isTyped
                            ? isCorrect
                              ? 'text-cyber-yellow dark:text-cyber-yellow light:text-amber-600 font-semibold'
                              : 'text-cyber-magenta dark:text-cyber-magenta light:text-rose-600 font-bold bg-cyber-magenta/20'
                            : 'text-gray-500 dark:text-gray-500 light:text-slate-400'
                        )}
                      >
                        {targetChar}
                      </span>
                    );
                  })}

                  {/* Render extra typed characters with .typing-char markers */}
                  {currentInput.length > targetWord.length &&
                    Array.from(currentInput.slice(targetWord.length)).map((extraChar, extraIdx) => (
                      <span
                        key={`extra-${extraIdx}`}
                        className="typing-char inline-block text-cyber-magenta/90 dark:text-cyber-magenta/90 light:text-rose-600 font-bold bg-cyber-magenta/20"
                      >
                        {extraChar}
                      </span>
                    ))}
                </>
              )}

              {!isCommitted && !isCurrent && (
                // Unvisited upcoming word
                <span className="text-gray-600 dark:text-gray-600 light:text-slate-400 inline-block">
                  {targetWord}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
