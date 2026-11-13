'use client';

import React from 'react';
import { CaretStyle } from '../theme/ThemeProvider';
import { clsx } from 'clsx';

interface CaretProps {
  style?: CaretStyle;
  left: number;
  top: number;
  height: number;
}

export function Caret({ style = 'line', left, top, height }: CaretProps) {
  const isBlock = style === 'block';
  const isUnderline = style === 'underline';
  const isGlow = style === 'glow';

  return (
    <span
      className={clsx(
        'absolute pointer-events-none transition-all duration-75 ease-out z-20 animate-pulse',
        isBlock && 'w-3 bg-cyber-yellow/40 border border-cyber-yellow',
        isUnderline && 'w-3.5 h-1 bg-cyber-cyan shadow-neon-cyan',
        isGlow && 'w-1 bg-cyber-magenta shadow-neon-magenta',
        !isBlock && !isUnderline && !isGlow && 'w-[2px] bg-cyber-yellow shadow-neon-yellow'
      )}
      style={{
        left: `${left}px`,
        top: isUnderline ? `${top + height - 2}px` : `${top}px`,
        height: isUnderline ? '3px' : isBlock ? `${height}px` : `${height}px`,
      }}
    />
  );
}
