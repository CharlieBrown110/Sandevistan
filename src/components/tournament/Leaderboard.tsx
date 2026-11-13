'use client';

import React, { useEffect } from 'react';
import useSWR from 'swr';
import { RankedParticipant } from '@/lib/tournaments/rules';
import { TournamentStatus } from '@/lib/tournaments/status';
import { formatLocalDateTime } from '@/lib/time';
import { Trophy, RefreshCw, User } from 'lucide-react';
import { clsx } from 'clsx';

interface LeaderboardProps {
  tournamentCode: string;
  currentUserId?: string | null;
  status: TournamentStatus;
  initialData?: RankedParticipant[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function Leaderboard({ tournamentCode, currentUserId, status, initialData }: LeaderboardProps) {
  // Poll every 10s while active; stop polling when ended or canceled
  const shouldPoll = status === 'active';

  const { data, error, mutate, isValidating } = useSWR(
    `/api/tournaments/${tournamentCode}/leaderboard`,
    fetcher,
    {
      refreshInterval: shouldPoll ? 10_000 : 0,
      revalidateOnFocus: true,
      fallbackData: initialData ? { leaderboard: initialData } : undefined,
    }
  );

  const leaderboard: RankedParticipant[] = data?.leaderboard || initialData || [];

  return (
    <div className="w-full font-mono space-y-3">
      {/* Header controls */}
      <div className="flex items-center justify-between text-xs text-gray-400 pb-2 border-b border-cyber-border">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-cyber-yellow" />
          <span className="font-bold text-cyber-text uppercase tracking-wider">
            LEADERBOARD // {leaderboard.length} RUNNERS
          </span>
        </div>

        <div className="flex items-center gap-2">
          {shouldPoll && (
            <span className="text-[10px] text-gray-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyber-green animate-ping" />
              POLLING (10s)
            </span>
          )}
          <button
            onClick={() => mutate()}
            className="p-1 hover:text-cyber-cyan transition-colors"
            title="Refresh Leaderboard"
          >
            <RefreshCw className={clsx('w-3.5 h-3.5', isValidating && 'animate-spin text-cyber-cyan')} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-gray-500 uppercase border-b border-cyber-border/60">
              <th className="py-2.5 px-3 w-12 text-center">#</th>
              <th className="py-2.5 px-3">RUNNER</th>
              <th className="py-2.5 px-3 text-right">BEST WPM</th>
              <th className="py-2.5 px-3 text-right">ACCURACY</th>
              <th className="py-2.5 px-3 text-right">ATTEMPTS</th>
              <th className="py-2.5 px-3 text-right hidden sm:table-cell">RECORDED</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cyber-border/30">
            {leaderboard.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-500">
                  No participants have joined yet.
                </td>
              </tr>
            ) : (
              leaderboard.map((row) => {
                const isMe = currentUserId === row.userId;
                const isFirst = row.rank === 1;
                const isSecond = row.rank === 2;
                const isThird = row.rank === 3;

                return (
                  <tr
                    key={row.userId}
                    className={clsx(
                      'transition-colors hover:bg-cyber-panel/80',
                      isMe && 'bg-cyber-yellow/10 font-bold border-l-2 border-cyber-yellow',
                      isFirst && 'text-cyber-yellow',
                      isSecond && 'text-cyber-cyan',
                      isThird && 'text-cyber-magenta'
                    )}
                  >
                    {/* Rank */}
                    <td className="py-3 px-3 text-center font-bold">
                      {row.rank ? (
                        <span
                          className={clsx(
                            'inline-flex items-center justify-center w-6 h-6 rounded-sm text-xs',
                            isFirst && 'bg-cyber-yellow text-black font-black shadow-neon-yellow',
                            isSecond && 'bg-cyber-cyan text-black font-black shadow-neon-cyan',
                            isThird && 'bg-cyber-magenta text-white font-black shadow-neon-magenta',
                            !isFirst && !isSecond && !isThird && 'text-gray-400'
                          )}
                        >
                          {row.rank}
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>

                    {/* Username & Avatar */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        {row.image ? (
                          <img
                            src={row.image}
                            alt={row.username}
                            className="w-6 h-6 rounded-full border border-cyber-border"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-cyber-panel flex items-center justify-center text-gray-400">
                            <User className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <span className="tracking-wide">
                          @{row.username}
                          {isMe && (
                            <span className="ml-1.5 text-[10px] text-cyber-yellow uppercase">
                              (YOU)
                            </span>
                          )}
                        </span>
                      </div>
                    </td>

                    {/* Best WPM */}
                    <td className="py-3 px-3 text-right">
                      {row.bestWpm !== null ? (
                        <span className="text-sm font-black">{row.bestWpm.toFixed(2)}</span>
                      ) : (
                        <span className="text-gray-600 italic">no score yet</span>
                      )}
                    </td>

                    {/* Best Accuracy */}
                    <td className="py-3 px-3 text-right">
                      {row.bestAccuracy !== null ? (
                        <span>{row.bestAccuracy.toFixed(2)}%</span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>

                    {/* Attempts count */}
                    <td className="py-3 px-3 text-right text-gray-400">
                      {row.attemptsCount}
                    </td>

                    {/* Best At Timestamp */}
                    <td className="py-3 px-3 text-right text-gray-500 text-[11px] hidden sm:table-cell" suppressHydrationWarning>
                      {row.bestAt ? formatLocalDateTime(row.bestAt) : '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
