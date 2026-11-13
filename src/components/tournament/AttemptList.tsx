'use client';

import React from 'react';
import { AttemptRecord } from '@/lib/tournaments/store';
import { formatLocalDateTime } from '@/lib/time';
import { CyberBadge } from '../ui/CyberBadge';
import { Star, CheckCircle, XCircle, Clock } from 'lucide-react';
import { clsx } from 'clsx';

interface AttemptListProps {
  attempts: AttemptRecord[];
  bestAttemptId?: string | null;
}

export function AttemptList({ attempts, bestAttemptId }: AttemptListProps) {
  if (attempts.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-gray-500 font-mono">
        You haven&apos;t completed any attempts in this tournament yet.
      </div>
    );
  }

  return (
    <div className="w-full font-mono space-y-2">
      <div className="text-xs text-gray-400 font-bold uppercase pb-1 flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-cyber-cyan" />
        YOUR ATTEMPT LOG ({attempts.length})
      </div>

      <div className="space-y-2">
        {attempts.map((att) => {
          const isBest = att.id === bestAttemptId;
          const isEligible = att.eligible;

          return (
            <div
              key={att.id}
              className={clsx(
                'flex flex-wrap items-center justify-between p-3 rounded bg-cyber-panel/60 border text-xs transition-all',
                isBest
                  ? 'border-cyber-yellow bg-cyber-yellow/5 shadow-neon-yellow/20'
                  : 'border-cyber-border'
              )}
            >
              <div className="flex items-center gap-2.5">
                {isBest ? (
                  <span className="p-1 rounded bg-cyber-yellow text-black font-black" title="Your best eligible attempt">
                    <Star className="w-3.5 h-3.5 fill-black" />
                  </span>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-gray-500" />
                )}

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-cyber-text">
                      {att.wpm !== null ? `${att.wpm} WPM` : 'No score'}
                    </span>
                    <span className="text-gray-400">
                      {att.accuracy !== null ? `${att.accuracy}% acc` : ''}
                    </span>

                    {isEligible ? (
                      <CyberBadge variant="green" size="sm">ELIGIBLE</CyberBadge>
                    ) : (
                      <CyberBadge variant="magenta" size="sm">
                        {att.rejectReason ? att.rejectReason.replace(/_/g, ' ') : 'NOT ELIGIBLE'}
                      </CyberBadge>
                    )}
                  </div>

                  <span className="text-[10px] text-gray-500" suppressHydrationWarning>
                    {formatLocalDateTime(att.startedAt)}
                  </span>
                </div>
              </div>

              <div className="text-right text-[11px] text-gray-400">
                {att.durationMs ? `${(att.durationMs / 1000).toFixed(1)}s` : ''}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
