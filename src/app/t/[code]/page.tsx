'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CyberCard } from '@/components/ui/CyberCard';
import { CyberButton } from '@/components/ui/CyberButton';
import { CyberBadge } from '@/components/ui/CyberBadge';
import { Countdown } from '@/components/tournament/Countdown';
import { Leaderboard } from '@/components/tournament/Leaderboard';
import { AttemptList } from '@/components/tournament/AttemptList';
import { Podium } from '@/components/tournament/Podium';
import { formatLocalDateTime } from '@/lib/time';
import { TournamentRecord, AttemptRecord } from '@/lib/tournaments/store';
import { TournamentStatus } from '@/lib/tournaments/status';
import { RankedParticipant } from '@/lib/tournaments/rules';
import { Trophy, Copy, Check, Play, UserPlus, LogIn, Repeat, Clock, ShieldAlert, Edit3, XCircle } from 'lucide-react';

interface TournamentData {
  tournament: TournamentRecord & {
    creator: { id: string; username: string; image?: string | null };
    status: TournamentStatus;
  };
  serverNow: string;
  isCreator: boolean;
  myParticipation: {
    joinedAt: string;
    attemptsCount: number;
    bestWpm?: number | null;
    bestAccuracy?: number | null;
    bestAt?: string | null;
  } | null;
  myAttempts: AttemptRecord[];
}

export default function TournamentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [data, setData] = useState<TournamentData | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Edit modal / state for creator
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const loadData = async () => {
    try {
      const [tRes, userRes] = await Promise.all([
        fetch(`/api/tournaments/${code}`),
        fetch('/api/auth/session'),
      ]);

      if (tRes.ok) {
        const tData = await tRes.json();
        setData(tData);
        setEditTitle(tData.tournament.title);
        setEditDesc(tData.tournament.description);
      }
      if (userRes.ok) {
        const uData = await userRes.json();
        setCurrentUser(uData.user);
      }
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [code]);

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoin = async () => {
    setJoinLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/tournaments/${code}/join`, { method: 'POST' });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error?.message || 'Failed to join');
      await loadData();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setJoinLoading(false);
    }
  };

  const handleCancelTournament = async () => {
    if (!confirm('Are you sure you want to cancel this tournament? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/tournaments/${code}/cancel`, { method: 'POST' });
      if (res.ok) await loadData();
    } catch {
      //
    }
  };

  const handleSaveEdit = async () => {
    try {
      const res = await fetch(`/api/tournaments/${code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, description: editDesc }),
      });
      if (res.ok) {
        setIsEditing(false);
        await loadData();
      }
    } catch {
      //
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center font-mono text-xs text-cyber-yellow animate-pulse">
        CONNECTING TO TOURNAMENT SUBNET...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center font-mono space-y-4">
        <span className="text-xl font-bold text-cyber-magenta">TOURNAMENT NOT FOUND</span>
        <p className="text-xs text-gray-400">The share code is invalid or has expired.</p>
        <Link href="/tournaments">
          <CyberButton variant="yellow" size="sm">RETURN TO MATRIX</CyberButton>
        </Link>
      </div>
    );
  }

  const { tournament: t, isCreator, myParticipation, myAttempts } = data;
  const status = t.status;
  const isJoined = !!myParticipation;
  const isEnded = status === 'ended';

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 font-mono space-y-6">
      {/* Header Banner */}
      <CyberCard glow={status === 'active' ? 'yellow' : 'cyan'}>
        <div className="space-y-4">
          {/* Top row: Status & Countdowns & Link Copy */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
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
                size="md"
              >
                {status}
              </CyberBadge>

              {status === 'active' && (
                <Countdown targetDate={t.endsAt} serverNow={data.serverNow} label="ENDS IN" />
              )}
              {status === 'upcoming' && (
                <Countdown targetDate={t.startsAt} serverNow={data.serverNow} label="STARTS IN" />
              )}
            </div>

            {/* Copy Invite Link */}
            <CyberButton
              onClick={handleCopyLink}
              variant="outline"
              size="sm"
              icon={copied ? <Check className="w-4 h-4 text-cyber-green" /> : <Copy className="w-4 h-4" />}
            >
              {copied ? 'INVITE LINK COPIED' : 'COPY INVITE LINK'}
            </CyberButton>
          </div>

          {/* Title and details */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-cyber-text uppercase tracking-tight">
              {t.title}
            </h1>
            {t.description && (
              <p className="text-xs text-gray-400 mt-1 max-w-2xl">{t.description}</p>
            )}
            <div className="text-[11px] text-gray-500 mt-2 flex items-center gap-2">
              <span>HOSTED BY @{t.creator.username}</span>
              <span>•</span>
              <span>CODE: <strong className="text-cyber-yellow tracking-widest">{t.code}</strong></span>
            </div>
          </div>

          {/* Config Summary Bar */}
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-cyber-border/60 text-xs text-gray-300">
            <span className="px-2.5 py-1 rounded bg-cyber-panel border border-cyber-border">
              {t.modeValue} {t.mode === 'time' ? 'SECONDS' : 'WORDS'}
            </span>
            <span className="px-2.5 py-1 rounded bg-cyber-panel border border-cyber-border">
              PUNCTUATION: {t.punctuation ? 'ON' : 'OFF'}
            </span>
            <span className="px-2.5 py-1 rounded bg-cyber-panel border border-cyber-border">
              NUMBERS: {t.numbers ? 'ON' : 'OFF'}
            </span>
            <span className="px-2.5 py-1 rounded bg-cyber-panel border border-cyber-border">
              MIN ACCURACY: <strong className="text-cyber-yellow">{t.minAccuracy}%</strong>
            </span>
            <span className="px-2.5 py-1 rounded bg-cyber-panel border border-cyber-border">
              CAP: {t.maxParticipants} RUNNERS
            </span>
          </div>

          {/* Primary Action Button */}
          {actionError && (
            <div className="p-2 bg-cyber-magenta/20 border border-cyber-magenta text-cyber-magenta text-xs rounded">
              {actionError}
            </div>
          )}

          <div className="pt-2 flex flex-wrap items-center gap-3">
            {!currentUser ? (
              <Link href={`/login?callbackURL=/t/${t.code}`}>
                <CyberButton variant="yellow" size="lg" icon={<LogIn className="w-4 h-4" />}>
                  SIGN IN TO JOIN TOURNAMENT
                </CyberButton>
              </Link>
            ) : !isJoined ? (
              <CyberButton
                onClick={handleJoin}
                variant="yellow"
                size="lg"
                disabled={joinLoading || status === 'ended' || status === 'canceled'}
                icon={<UserPlus className="w-4 h-4" />}
              >
                {joinLoading ? 'JOINING...' : 'JOIN TOURNAMENT'}
              </CyberButton>
            ) : status === 'active' ? (
              <Link href={`/t/${t.code}/play`}>
                <CyberButton variant="yellow" size="lg" icon={<Play className="w-4 h-4" />}>
                  START TYPING ATTEMPT
                </CyberButton>
              </Link>
            ) : status === 'upcoming' ? (
              <div className="text-xs text-cyber-cyan flex items-center gap-1.5 font-bold">
                <Clock className="w-4 h-4" />
                <span suppressHydrationWarning>TOURNAMENT WILL UNLOCK AT {formatLocalDateTime(t.startsAt)}</span>
              </div>
            ) : (
              <div className="text-xs text-gray-400">
                Tournament has ended. Scoreboard is frozen.
              </div>
            )}

            {/* Run It Again Button (Section 4 Rule 9) */}
            {isEnded && (
              <Link
                href={`/tournaments/new?mode=${t.mode}&modeValue=${t.modeValue}&minAccuracy=${t.minAccuracy}`}
              >
                <CyberButton variant="cyan" size="md" icon={<Repeat className="w-4 h-4" />}>
                  RUN IT AGAIN
                </CyberButton>
              </Link>
            )}

            {/* Creator controls */}
            {isCreator && status !== 'canceled' && (
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-2.5 py-1 text-xs border border-cyber-border rounded text-gray-300 hover:text-white hover:border-cyber-cyan flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>EDIT</span>
                </button>

                <button
                  onClick={handleCancelTournament}
                  className="px-2.5 py-1 text-xs border border-cyber-magenta/60 rounded text-cyber-magenta hover:bg-cyber-magenta/10 flex items-center gap-1"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>CANCEL</span>
                </button>
              </div>
            )}
          </div>

          {/* Inline Edit Form */}
          {isEditing && (
            <div className="p-4 bg-cyber-panel rounded border border-cyber-cyan/50 space-y-3 mt-3">
              <div>
                <label className="text-xs text-gray-300 uppercase block mb-1">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-1.5 bg-black border border-cyber-border rounded text-xs text-cyber-text"
                />
              </div>
              <div>
                <label className="text-xs text-gray-300 uppercase block mb-1">Description</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-1.5 bg-black border border-cyber-border rounded text-xs text-cyber-text"
                />
              </div>
              <div className="flex gap-2">
                <CyberButton onClick={handleSaveEdit} variant="cyan" size="sm">
                  SAVE CHANGES
                </CyberButton>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1 text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </CyberCard>

      {/* Podium when ended */}
      {isEnded && <Podium topParticipants={[]} />}

      {/* Main Content Grid: Leaderboard & Attempts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leaderboard Table (Col 2) */}
        <div className="lg:col-span-2">
          <CyberCard glow="cyan">
            <Leaderboard
              tournamentCode={t.code}
              currentUserId={currentUser?.id}
              status={status}
            />
          </CyberCard>
        </div>

        {/* User Attempts Sidebar (Col 1) */}
        <div>
          <CyberCard glow="none">
            {currentUser && isJoined ? (
              <AttemptList
                attempts={myAttempts}
                bestAttemptId={myParticipation?.bestWpm ? 'best' : null}
              />
            ) : (
              <div className="py-8 text-center text-xs text-gray-500 font-mono space-y-2">
                <p>Sign in and join to track your attempts and score history.</p>
              </div>
            )}
          </CyberCard>
        </div>
      </div>
    </div>
  );
}
