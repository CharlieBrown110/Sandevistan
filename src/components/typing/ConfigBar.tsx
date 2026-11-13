'use client';

import React from 'react';
import { TestConfig, TestMode } from '@/lib/typing/types';
import { Clock, Type, Hash, Quote } from 'lucide-react';
import { clsx } from 'clsx';

interface ConfigBarProps {
  config: TestConfig;
  onChange: (newConfig: TestConfig) => void;
  disabled?: boolean;
}

export function ConfigBar({ config, onChange, disabled }: ConfigBarProps) {
  const setMode = (mode: TestMode) => {
    const defaultVal = mode === 'time' ? 30 : 25;
    onChange({ ...config, mode, modeValue: defaultVal });
  };

  const setModeValue = (val: number) => {
    onChange({ ...config, modeValue: val });
  };

  const togglePunctuation = () => {
    onChange({ ...config, punctuation: !config.punctuation });
  };

  const toggleNumbers = () => {
    onChange({ ...config, numbers: !config.numbers });
  };

  const timeValues = [15, 30, 60, 120];
  const wordsValues = [10, 25, 50, 100];

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 p-2 sm:px-4 sm:py-2 bg-cyber-panel/80 dark:bg-cyber-panel/80 light:bg-slate-200/80 rounded-md border border-cyber-border font-mono text-xs text-gray-400 select-none">
      {/* Mode selection */}
      <div className="flex items-center gap-1 border-r border-cyber-border/70 pr-3">
        <button
          onClick={() => setMode('time')}
          disabled={disabled}
          className={clsx(
            'flex items-center gap-1 px-2.5 py-1 rounded transition-colors',
            config.mode === 'time'
              ? 'text-cyber-yellow bg-cyber-yellow/15 font-bold shadow-neon-yellow/30'
              : 'hover:text-cyber-cyan'
          )}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>TIME</span>
        </button>

        <button
          onClick={() => setMode('words')}
          disabled={disabled}
          className={clsx(
            'flex items-center gap-1 px-2.5 py-1 rounded transition-colors',
            config.mode === 'words'
              ? 'text-cyber-yellow bg-cyber-yellow/15 font-bold shadow-neon-yellow/30'
              : 'hover:text-cyber-cyan'
          )}
        >
          <Type className="w-3.5 h-3.5" />
          <span>WORDS</span>
        </button>
      </div>

      {/* Values for active mode */}
      <div className="flex items-center gap-1 border-r border-cyber-border/70 pr-3">
        {(config.mode === 'time' ? timeValues : wordsValues).map((val) => (
          <button
            key={val}
            onClick={() => setModeValue(val)}
            disabled={disabled}
            className={clsx(
              'px-2 py-0.5 rounded transition-colors font-bold',
              config.modeValue === val
                ? 'text-cyber-yellow bg-cyber-yellow/15'
                : 'hover:text-cyber-cyan'
            )}
          >
            {val}
          </button>
        ))}
      </div>

      {/* Modifiers: punctuation & numbers */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={togglePunctuation}
          disabled={disabled}
          className={clsx(
            'flex items-center gap-1 px-2 py-1 rounded transition-colors',
            config.punctuation
              ? 'text-cyber-cyan bg-cyber-cyan/15 font-bold'
              : 'hover:text-cyber-cyan'
          )}
          title="Toggle Punctuation"
        >
          <Quote className="w-3 h-3" />
          <span>PUNCTUATION</span>
        </button>

        <button
          onClick={toggleNumbers}
          disabled={disabled}
          className={clsx(
            'flex items-center gap-1 px-2 py-1 rounded transition-colors',
            config.numbers
              ? 'text-cyber-cyan bg-cyber-cyan/15 font-bold'
              : 'hover:text-cyber-cyan'
          )}
          title="Toggle Numbers"
        >
          <Hash className="w-3 h-3" />
          <span>NUMBERS</span>
        </button>
      </div>
    </div>
  );
}
