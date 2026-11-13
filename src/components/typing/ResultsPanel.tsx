'use client';

import React from 'react';
import { EngineResult } from '@/lib/typing/types';
import { WpmChart } from './WpmChart';
import { CyberButton } from '../ui/CyberButton';
import { CyberBadge } from '../ui/CyberBadge';
import { RotateCcw, ArrowRight, Zap, Award, Target, Flame, CheckCircle2, AlertTriangle } from 'lucide-react';

interface ResultsPanelProps {
  result: EngineResult;
  onRestart: () => void;
  onNextTest?: () => void;
  tournamentContext?: {
    isNewBest: boolean;
    rank: number | null;
    totalParticipants: number;
    eligible: boolean;
    reason?: string;
  };
}

export function ResultsPanel({ result, onRestart, onNextTest, tournamentContext }: ResultsPanelProps) {
  const { wpm, rawWpm, accuracy, consistency, chars, perSecond, durationMs } = result;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 font-mono animate-in fade-in-50 duration-300">
      {/* Tournament result banner if present */}
      {tournamentContext && (
        <div className="p-4 rounded-md border border-cyber-yellow/60 bg-cyber-yellow/10 flex flex-wrap items-center justify-between gap-3 shadow-neon-yellow/30">
          <div className="flex items-center gap-3">
            {tournamentContext.isNewBest ? (
              <div className="w-10 h-10 rounded-sm bg-cyber-yellow flex items-center justify-center text-black font-black text-xl shadow-neon-yellow">
                ★
              </div>
            ) : (
              <Award className="w-8 h-8 text-cyber-cyan" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-cyber-yellow uppercase">
                  {tournamentContext.isNewBest ? 'NEW PERSONAL BEST SCORE!' : 'ATTEMPT VERIFIED & SUBMITTED'}
                </span>
                {tournamentContext.eligible ? (
                  <CyberBadge variant="green">ELIGIBLE</CyberBadge>
                ) : (
                  <CyberBadge variant="magenta">NOT ELIGIBLE</CyberBadge>
                )}
              </div>
              <p className="text-xs text-gray-300">
                {tournamentContext.reason
                  ? `Notice: ${tournamentContext.reason}`
                  : `Rank #${tournamentContext.rank ?? '—'} of ${tournamentContext.totalParticipants} participants`}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-gray-400">LEADERBOARD RANK</span>
            <div className="text-2xl font-black text-cyber-cyan">
              {tournamentContext.rank ? `#${tournamentContext.rank}` : 'UNRANKED'}
            </div>
          </div>
        </div>
      )}

      {/* Main Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* WPM */}
        <div className="p-5 rounded bg-cyber-panel/90 dark:bg-cyber-panel/90 light:bg-white border border-cyber-yellow/50 shadow-neon-yellow/20 relative overflow-hidden group">
          <span className="text-xs text-gray-400 font-semibold tracking-wider uppercase flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-cyber-yellow" />
            NET WPM
          </span>
          <div className="text-5xl font-black text-cyber-yellow mt-2 group-hover:scale-105 transition-transform">
            {wpm}
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">RANKING METRIC</span>
        </div>

        {/* ACCURACY */}
        <div className="p-5 rounded bg-cyber-panel/90 dark:bg-cyber-panel/90 light:bg-white border border-cyber-cyan/50 shadow-neon-cyan/20 relative overflow-hidden group">
          <span className="text-xs text-gray-400 font-semibold tracking-wider uppercase flex items-center gap-1.5">
            <Target className="w-4 h-4 text-cyber-cyan" />
            ACCURACY
          </span>
          <div className="text-5xl font-black text-cyber-cyan mt-2 group-hover:scale-105 transition-transform">
            {accuracy}%
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">NET PRECISION</span>
        </div>

        {/* RAW WPM */}
        <div className="p-5 rounded bg-cyber-panel/90 dark:bg-cyber-panel/90 light:bg-white border border-cyber-border relative overflow-hidden">
          <span className="text-xs text-gray-400 font-semibold tracking-wider uppercase flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-cyber-magenta" />
            RAW WPM
          </span>
          <div className="text-4xl font-black text-cyber-text mt-3">
            {rawWpm}
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">ALL KEYPRESSES</span>
        </div>

        {/* CONSISTENCY */}
        <div className="p-5 rounded bg-cyber-panel/90 dark:bg-cyber-panel/90 light:bg-white border border-cyber-border relative overflow-hidden">
          <span className="text-xs text-gray-400 font-semibold tracking-wider uppercase">
            CONSISTENCY
          </span>
          <div className="text-4xl font-black text-cyber-text mt-3">
            {consistency}%
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">TIMING STDEV</span>
        </div>
      </div>

      {/* Character Breakdown Telemetry Bar */}
      <div className="p-4 rounded bg-cyber-panel/60 border border-cyber-border flex flex-wrap items-center justify-between text-xs text-gray-400 gap-3">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyber-cyan" />
            <span>CORRECT: <strong className="text-cyber-cyan">{chars.correct}</strong></span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyber-magenta" />
            <span>INCORRECT: <strong className="text-cyber-magenta">{chars.incorrect}</strong></span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyber-yellow" />
            <span>EXTRA: <strong className="text-cyber-yellow">{chars.extra}</strong></span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-500" />
            <span>MISSED: <strong className="text-gray-300">{chars.missed}</strong></span>
          </span>
        </div>

        <div>
          <span>TIME: <strong>{(durationMs / 1000).toFixed(1)}s</strong></span>
        </div>
      </div>

      {/* Per-Second Chart */}
      {perSecond && perSecond.length > 0 && <WpmChart data={perSecond} />}

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-4 pt-4">
        <CyberButton
          onClick={onRestart}
          variant="yellow"
          size="md"
          icon={<RotateCcw className="w-4 h-4" />}
        >
          RETRY TEST (TAB)
        </CyberButton>

        {onNextTest && (
          <CyberButton
            onClick={onNextTest}
            variant="cyan"
            size="md"
            icon={<ArrowRight className="w-4 h-4" />}
          >
            NEXT TEXT
          </CyberButton>
        )}
      </div>
    </div>
  );
}
