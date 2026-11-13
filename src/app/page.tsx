'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { CyberCard } from '@/components/ui/CyberCard';
import { CyberButton } from '@/components/ui/CyberButton';
import { formatLocalDateTime } from '@/lib/time';
import Link from 'next/link';
import { Trophy, History, Zap, Shield, Sparkles } from 'lucide-react';

const TypingTest = dynamic(
  () => import('@/components/typing/TypingTest').then((mod) => mod.TypingTest),
  {
    ssr: false,
    loading: () => (
      <div className="w-full max-w-4xl mx-auto h-[200px] rounded-lg bg-cyber-panel/40 border border-cyber-border/70 flex flex-col items-center justify-center font-mono text-xs text-cyber-yellow animate-pulse">
        <span>INITIALIZING SANDEVISTAN NEURAL INTERFACE...</span>
      </div>
    ),
  }
);

interface PracticeEntry {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  mode: string;
  modeValue: number;
  date: string;
}

export default function HomePage() {
  const [practiceHistory, setPracticeHistory] = useState<PracticeEntry[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('cyber_practice_history');
      if (stored) {
        setPracticeHistory(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="flex-1 w-full max-w-6xl mx-auto px-4 py-8 flex flex-col justify-between items-center gap-8 font-mono">
      {/* Top Banner / Edgerunners Telemetry */}
      <div className="w-full text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-cyber-yellow/10 border border-cyber-yellow/40 text-cyber-yellow text-xs font-bold tracking-widest uppercase shadow-neon-yellow/20">
          <Zap className="w-3.5 h-3.5 animate-pulse" />
          <span>CYBERWARE OPTIC INTERFACE // READY TO TYPE</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight uppercase text-cyber-text">
          TYPE FAST. <span className="text-cyber-yellow underline decoration-cyber-cyan">FLATLINE THE CLOCK.</span>
        </h1>
        <p className="text-xs text-gray-400 max-w-lg mx-auto">
          Deterministic keystroke engine. Zero-trust server replay verification. Create asynchronous tournaments for your crew.
        </p>
      </div>

      {/* Main Standalone Typing Test */}
      <div className="w-full my-auto">
        <TypingTest />
      </div>

      {/* Touch Screen Warning Notice */}
      <div className="md:hidden w-full max-w-md p-3 rounded bg-cyber-yellow/10 border border-cyber-yellow/40 text-cyber-yellow text-xs text-center font-bold">
        ⚡ Notice: Desktop physical keyboard recommended for optimal Sandevistan precision.
      </div>

      {/* Quick Launch & Practice History Section */}
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-cyber-border/60">
        {/* Tournament Invitation Card */}
        <CyberCard glow="yellow" headerAccent="HOST A TOURNAMENT">
          <p className="text-xs text-gray-300 mb-4">
            Pick a time window, share your link, and compete with friends. Best eligible score wins.
          </p>
          <Link href="/tournaments/new">
            <CyberButton variant="yellow" size="sm" icon={<Trophy className="w-3.5 h-3.5" />}>
              CREATE TOURNAMENT
            </CyberButton>
          </Link>
        </CyberCard>

        {/* Local Practice History */}
        <div className="md:col-span-2">
          <CyberCard glow="cyan" headerAccent="RECENT PRACTICE TELEMETRY (LOCAL)">
            {practiceHistory.length === 0 ? (
              <p className="text-xs text-gray-500 py-3 italic">
                No recent practice sessions recorded yet. Finish a test to view your scores here.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {practiceHistory.slice(0, 5).map((entry, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded bg-cyber-panel/80 border border-cyber-border text-center text-xs"
                  >
                    <span className="text-lg font-black text-cyber-yellow block">
                      {entry.wpm}
                    </span>
                    <span className="text-[10px] text-gray-400 uppercase block">
                      {entry.accuracy}% ACC
                    </span>
                    <span className="text-[9px] text-cyber-cyan block mt-1">
                      {entry.mode} {entry.modeValue}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CyberCard>
        </div>
      </div>
    </div>
  );
}
