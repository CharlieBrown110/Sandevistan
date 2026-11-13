'use client';

import React, { useState, useEffect } from 'react';
import { formatDuration } from '@/lib/time';
import { Clock } from 'lucide-react';

interface CountdownProps {
  targetDate: string; // ISO
  serverNow?: string; // ISO
  label?: string;
  onFinish?: () => void;
}

export function Countdown({ targetDate, serverNow, label, onFinish }: CountdownProps) {
  const [remainingMs, setRemainingMs] = useState<number>(0);

  useEffect(() => {
    // Calculate initial server time offset
    const clientNow = Date.now();
    const serverTime = serverNow ? new Date(serverNow).getTime() : clientNow;
    const offset = serverTime - clientNow;

    const targetTime = new Date(targetDate).getTime();

    const update = () => {
      const now = Date.now() + offset;
      const diff = Math.max(0, targetTime - now);
      setRemainingMs(diff);
      if (diff <= 0 && onFinish) {
        onFinish();
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate, serverNow, onFinish]);

  return (
    <div className="flex items-center gap-2 font-mono text-xs text-cyber-yellow bg-cyber-yellow/10 border border-cyber-yellow/40 px-3 py-1.5 rounded select-none shadow-neon-yellow/20">
      <Clock className="w-4 h-4 text-cyber-yellow animate-pulse" />
      {label && <span className="text-gray-400 uppercase">{label}:</span>}
      <span className="text-sm font-bold tracking-wider">{formatDuration(remainingMs)}</span>
    </div>
  );
}
