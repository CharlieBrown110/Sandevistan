'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CyberCard } from '@/components/ui/CyberCard';
import { CyberButton } from '@/components/ui/CyberButton';
import { CyberBadge } from '@/components/ui/CyberBadge';
import { Countdown } from '@/components/tournament/Countdown';
import { Trophy, Plus, Clock, Users, Award, Play } from 'lucide-react';
import { clsx } from 'clsx';
import { TournamentRecord } from '@/lib/tournaments/store';
import { TournamentStatus } from '@/lib/tournaments/status';

interface UserTournamentItem {
  tournament: TournamentRecord;
  status: TournamentStatus;
  myBestWpm: number | null;
  myBestAccuracy: number | null;
  myRank: number | null;
  totalParticipants: number;
}

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<UserTournamentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'upcoming' | 'ended'>('active');

  useEffect(() => {
    fetch('/api/me/tournaments')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load tournaments');
        return res.json();
      })
      .then((data) => {
        if (data.tournaments) {
          setTournaments(data.tournaments);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = tournaments.filter((item) => {
    if (activeTab === 'active') return item.status === 'active';
    if (activeTab === 'upcoming') return item.status === 'upcoming';
    if (activeTab === 'ended') return item.status === 'ended' || item.status === 'canceled';
    return true;
  });

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 font-mono space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-cyber-border">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-cyber-yellow" />
            <h1 className="text-2xl font-black uppercase tracking-wider text-cyber-text">
              TOURNAMENT MATRIX
            </h1>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Asynchronous competitive typing tests you have created or joined.
          </p>
        </div>

        <Link href="/tournaments/new">
          <CyberButton variant="yellow" size="md" icon={<Plus className="w-4 h-4" />}>
            CREATE TOURNAMENT
          </CyberButton>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-cyber-border/80 pb-2">
        {(['active', 'upcoming', 'ended'] as const).map((tab) => {
          const count = tournaments.filter((t) => {
            if (tab === 'active') return t.status === 'active';
            if (tab === 'upcoming') return t.status === 'upcoming';
            return t.status === 'ended' || t.status === 'canceled';
          }).length;

          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                'px-4 py-2 rounded text-xs font-bold uppercase transition-all flex items-center gap-2',
                activeTab === tab
                  ? 'bg-cyber-yellow text-black font-black shadow-neon-yellow/30'
                  : 'text-gray-400 hover:text-white hover:bg-cyber-panel/50'
              )}
            >
              <span>{tab}</span>
              <span className={clsx('px-1.5 py-0.2 rounded-full text-[10px]', activeTab === tab ? 'bg-black text-cyber-yellow' : 'bg-cyber-panel text-gray-400')}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tournaments List */}
      {loading ? (
        <div className="py-16 text-center text-xs text-gray-500 animate-pulse">
          SCANNING SUBNET FOR TOURNAMENTS...
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center space-y-4">
          <p className="text-xs text-gray-500">
            No {activeTab} tournaments found in your network feed.
          </p>
          <Link href="/tournaments/new">
            <CyberButton variant="outline" size="sm" icon={<Plus className="w-3.5 h-3.5" />}>
              HOST YOUR FIRST TOURNAMENT
            </CyberButton>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(({ tournament: t, status, myBestWpm, myBestAccuracy, myRank, totalParticipants }) => {
            const isFinished = status === 'ended' || status === 'canceled';

            return (
              <CyberCard key={t.id} glow={status === 'active' ? 'yellow' : 'cyan'}>
                <div className="space-y-4">
                  {/* Status & Timing */}
                  <div className="flex items-center justify-between">
                    <CyberBadge
                      variant={
                        status === 'active'
                          ? 'yellow'
                          : status === 'upcoming'
                          ? 'cyan'
                          : status === 'canceled'
                          ? 'magenta'
                          : 'muted'
                      }
                    >
                      {status}
                    </CyberBadge>

                    {status === 'active' && (
                      <Countdown targetDate={t.endsAt} label="ENDS IN" />
                    )}
                    {status === 'upcoming' && (
                      <Countdown targetDate={t.startsAt} label="STARTS IN" />
                    )}
                  </div>

                  {/* Title & Info */}
                  <div>
                    <Link
                      href={`/t/${t.code}`}
                      className="text-base font-bold text-cyber-text hover:text-cyber-yellow transition-colors line-clamp-1"
                    >
                      {t.title}
                    </Link>
                    {t.description && (
                      <p className="text-xs text-gray-400 line-clamp-2 mt-1">
                        {t.description}
                      </p>
                    )}
                  </div>

                  {/* Test Configuration Tag */}
                  <div className="text-[11px] text-gray-400 flex flex-wrap gap-2 pt-2 border-t border-cyber-border/40">
                    <span className="px-2 py-0.5 rounded bg-cyber-panel border border-cyber-border/60">
                      {t.modeValue}{t.mode === 'time' ? 's' : ' words'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-cyber-panel border border-cyber-border/60">
                      MIN ACC: {t.minAccuracy}%
                    </span>
                    <span className="px-2 py-0.5 rounded bg-cyber-panel border border-cyber-border/60">
                      {totalParticipants} / {t.maxParticipants} PARTICIPANTS
                    </span>
                  </div>

                  {/* My Score & Rank telemetry */}
                  <div className="flex items-center justify-between pt-2 border-t border-cyber-border/40 text-xs">
                    <div>
                      <span className="text-[10px] text-gray-500 block uppercase">YOUR BEST</span>
                      {myBestWpm !== null ? (
                        <span className="font-bold text-cyber-yellow">
                          {myBestWpm} WPM ({myBestAccuracy}%)
                        </span>
                      ) : (
                        <span className="text-gray-500 italic">No attempt yet</span>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-gray-500 block uppercase">RANK</span>
                      <span className="font-bold text-cyber-cyan">
                        {myRank ? `#${myRank} of ${totalParticipants}` : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 flex gap-2">
                    <Link href={`/t/${t.code}`} className="flex-1">
                      <CyberButton variant="outline" size="sm" className="w-full">
                        VIEW TOURNAMENT
                      </CyberButton>
                    </Link>

                    {status === 'active' && (
                      <Link href={`/t/${t.code}/play`} className="flex-1">
                        <CyberButton variant="yellow" size="sm" className="w-full" icon={<Play className="w-3.5 h-3.5" />}>
                          PLAY NOW
                        </CyberButton>
                      </Link>
                    )}
                  </div>
                </div>
              </CyberCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
