'use client';

import React from 'react';
import { RankedParticipant } from '@/lib/tournaments/rules';
import { Trophy, Crown, Medal, User } from 'lucide-react';
import { clsx } from 'clsx';

interface PodiumProps {
  topParticipants: RankedParticipant[];
}

export function Podium({ topParticipants }: PodiumProps) {
  const first = topParticipants.find((p) => p.rank === 1);
  const second = topParticipants.find((p) => p.rank === 2);
  const third = topParticipants.find((p) => p.rank === 3);

  if (!first && !second && !third) {
    return null;
  }

  return (
    <div className="w-full max-w-2xl mx-auto py-6 font-mono">
      <div className="text-center mb-6">
        <span className="text-xs font-bold text-cyber-yellow tracking-widest uppercase flex items-center justify-center gap-1.5">
          <Crown className="w-4 h-4 text-cyber-yellow animate-bounce" />
          CHAMPIONSHIP PODIUM
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 items-end text-center">
        {/* 2nd Place */}
        <div className="flex flex-col items-center">
          {second ? (
            <div className="w-full flex flex-col items-center mb-2">
              <div className="w-12 h-12 rounded-full border-2 border-cyber-cyan overflow-hidden bg-cyber-panel shadow-neon-cyan/40 mb-1.5">
                {second.image ? (
                  <img src={second.image} alt={second.username} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-6 h-6 m-auto text-cyber-cyan mt-2.5" />
                )}
              </div>
              <span className="text-xs font-bold text-cyber-text truncate max-w-[100px]">
                @{second.username}
              </span>
              <span className="text-sm font-black text-cyber-cyan">
                {second.bestWpm?.toFixed(1)} WPM
              </span>
            </div>
          ) : (
            <div className="h-20" />
          )}

          <div className="w-full h-28 bg-cyber-panel border-t-2 border-cyber-cyan/80 flex flex-col items-center justify-center rounded-t-sm shadow-neon-cyan/20">
            <span className="text-2xl font-black text-cyber-cyan">2</span>
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">SILVER</span>
          </div>
        </div>

        {/* 1st Place (Center, Tallest) */}
        <div className="flex flex-col items-center">
          {first ? (
            <div className="w-full flex flex-col items-center mb-2">
              <Crown className="w-6 h-6 text-cyber-yellow animate-pulse mb-1" />
              <div className="w-16 h-16 rounded-full border-2 border-cyber-yellow overflow-hidden bg-cyber-panel shadow-neon-yellow mb-1.5">
                {first.image ? (
                  <img src={first.image} alt={first.username} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 m-auto text-cyber-yellow mt-3.5" />
                )}
              </div>
              <span className="text-xs font-bold text-cyber-yellow truncate max-w-[110px]">
                @{first.username}
              </span>
              <span className="text-base font-black text-cyber-yellow">
                {first.bestWpm?.toFixed(1)} WPM
              </span>
            </div>
          ) : (
            <div className="h-28" />
          )}

          <div className="w-full h-36 bg-cyber-yellow/15 border-t-4 border-cyber-yellow flex flex-col items-center justify-center rounded-t-sm shadow-neon-yellow/30">
            <span className="text-3xl font-black text-cyber-yellow">1</span>
            <span className="text-[10px] text-cyber-yellow font-bold uppercase tracking-wider">CHAMPION</span>
          </div>
        </div>

        {/* 3rd Place */}
        <div className="flex flex-col items-center">
          {third ? (
            <div className="w-full flex flex-col items-center mb-2">
              <div className="w-12 h-12 rounded-full border-2 border-cyber-magenta overflow-hidden bg-cyber-panel shadow-neon-magenta/40 mb-1.5">
                {third.image ? (
                  <img src={third.image} alt={third.username} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-6 h-6 m-auto text-cyber-magenta mt-2.5" />
                )}
              </div>
              <span className="text-xs font-bold text-cyber-text truncate max-w-[100px]">
                @{third.username}
              </span>
              <span className="text-sm font-black text-cyber-magenta">
                {third.bestWpm?.toFixed(1)} WPM
              </span>
            </div>
          ) : (
            <div className="h-16" />
          )}

          <div className="w-full h-20 bg-cyber-panel border-t-2 border-cyber-magenta/80 flex flex-col items-center justify-center rounded-t-sm shadow-neon-magenta/20">
            <span className="text-2xl font-black text-cyber-magenta">3</span>
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">BRONZE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
