'use client';

import React, { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CyberCard } from '@/components/ui/CyberCard';
import { CyberButton } from '@/components/ui/CyberButton';
import { TestConfig, KeyEvent, EngineResult } from '@/lib/typing/types';
import { ArrowLeft, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';

const TypingTest = dynamic(
  () => import('@/components/typing/TypingTest').then((mod) => mod.TypingTest),
  {
    ssr: false,
    loading: () => (
      <div className="w-full max-w-4xl mx-auto h-[200px] rounded-lg bg-cyber-panel/40 border border-cyber-border/70 flex flex-col items-center justify-center font-mono text-xs text-cyber-yellow animate-pulse">
        <span>PREPARING SANDEVISTAN ATTEMPT MATRIX...</span>
      </div>
    ),
  }
);

interface StartAttemptResponse {
  attemptId: string;
  seed: number;
  config: TestConfig;
  serverNow: string;
  maxDurationMs: number;
}

export default function TournamentPlayPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [attemptData, setAttemptData] = useState<StartAttemptResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Server response after submit
  const [serverVerifiedResult, setServerVerifiedResult] = useState<EngineResult | null>(null);
  const [tournamentResultContext, setTournamentResultContext] = useState<any>(null);

  // Function to request a new attempt from server
  const requestNewAttempt = useCallback(async () => {
    setLoading(true);
    setError(null);
    setServerVerifiedResult(null);
    setTournamentResultContext(null);

    try {
      const res = await fetch(`/api/tournaments/${code}/attempts`, {
        method: 'POST',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Could not start attempt');
      }

      setAttemptData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    requestNewAttempt();
  }, [requestNewAttempt]);

  // Submit attempt keystrokes to server
  const handleSubmitAttempt = async (events: KeyEvent[], claimed: { wpm: number; accuracy: number }) => {
    if (!attemptData) return;

    try {
      const res = await fetch(`/api/tournaments/${code}/attempts/${attemptData.attemptId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          events,
          claimed,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to verify attempt on server');
      }

      // Convert server numbers to EngineResult shape
      const verifiedEngineResult: EngineResult = {
        wpm: data.attempt.wpm,
        rawWpm: data.attempt.rawWpm,
        accuracy: data.attempt.accuracy,
        consistency: data.attempt.consistency,
        correctChars: 0,
        totalChars: 0,
        chars: data.attempt.chars,
        perSecond: data.attempt.perSecond || [],
        durationMs: 0,
      };

      setServerVerifiedResult(verifiedEngineResult);
      setTournamentResultContext({
        isNewBest: data.isNewBest,
        rank: data.rank,
        totalParticipants: data.totalParticipants,
        eligible: data.attempt.eligible,
        reason: data.attempt.reason,
      });
    } catch (err: any) {
      alert(`Submission error: ${err.message}. Retrying submit...`);
      // Retry once (it is idempotent)
      try {
        const retryRes = await fetch(`/api/tournaments/${code}/attempts/${attemptData.attemptId}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ events, claimed }),
        });
        const retryData = await retryRes.json();
        if (retryRes.ok) {
          setServerVerifiedResult({
            wpm: retryData.attempt.wpm,
            rawWpm: retryData.attempt.rawWpm,
            accuracy: retryData.attempt.accuracy,
            consistency: retryData.attempt.consistency,
            correctChars: 0,
            totalChars: 0,
            chars: retryData.attempt.chars,
            perSecond: retryData.attempt.perSecond || [],
            durationMs: 0,
          });
          setTournamentResultContext({
            isNewBest: retryData.isNewBest,
            rank: retryData.rank,
            totalParticipants: retryData.totalParticipants,
            eligible: retryData.attempt.eligible,
            reason: retryData.attempt.reason,
          });
        }
      } catch (retryErr: any) {
        alert(`Submit failed: ${retryErr.message}`);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center font-mono space-y-3">
        <span className="text-xs text-cyber-yellow animate-pulse">
          ACQUIRING CRYPTOGRAPHIC SEED FROM EDGE SERVER...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 w-full max-w-md mx-auto px-4 py-16 flex flex-col justify-center font-mono">
        <CyberCard glow="magenta" headerAccent="ATTEMPT INITIALIZATION FAILED">
          <p className="text-xs text-gray-300 mb-4">{error}</p>
          <div className="flex gap-3">
            <CyberButton onClick={requestNewAttempt} variant="yellow" size="sm">
              RETRY
            </CyberButton>
            <Link href={`/t/${code}`}>
              <CyberButton variant="outline" size="sm">
                BACK TO TOURNAMENT
              </CyberButton>
            </Link>
          </div>
        </CyberCard>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 font-mono flex flex-col justify-between">
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-cyber-border">
        <Link
          href={`/t/${code}`}
          className="flex items-center gap-2 text-xs text-gray-400 hover:text-cyber-yellow transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>EXIT TOURNAMENT HUB</span>
        </Link>

        <div className="flex items-center gap-2 text-xs text-cyber-cyan font-bold">
          <ShieldCheck className="w-4 h-4 text-cyber-cyan" />
          <span>ZERO-TRUST REPLAY AUDIT ENABLED</span>
        </div>
      </div>

      {/* Typing Test Area */}
      {attemptData && (
        <div className="my-auto">
          <TypingTest
            initialConfig={attemptData.config}
            initialSeed={attemptData.seed}
            isTournamentLocked={true}
            onSubmitAttempt={handleSubmitAttempt}
            serverVerifiedResult={serverVerifiedResult}
            tournamentResultContext={tournamentResultContext}
          />
        </div>
      )}

      {/* Footer controls when test completes */}
      {serverVerifiedResult && (
        <div className="flex justify-center pt-8">
          <CyberButton
            onClick={requestNewAttempt}
            variant="yellow"
            size="md"
            icon={<RefreshCw className="w-4 h-4" />}
          >
            START ANOTHER ATTEMPT
          </CyberButton>
        </div>
      )}
    </div>
  );
}
