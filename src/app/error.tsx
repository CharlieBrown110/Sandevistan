'use client';

import React from 'react';
import { CyberButton } from '@/components/ui/CyberButton';
import { CyberCard } from '@/components/ui/CyberCard';
import { AlertOctagon, RotateCcw } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex-1 w-full max-w-md mx-auto px-4 py-24 flex flex-col justify-center font-mono text-center">
      <CyberCard glow="magenta" headerAccent="SYS.EXCEPTION // RECOVERY PROTOCOL">
        <div className="space-y-4">
          <div className="w-12 h-12 rounded bg-cyber-magenta/20 border border-cyber-magenta text-cyber-magenta flex items-center justify-center mx-auto">
            <AlertOctagon className="w-6 h-6 animate-pulse" />
          </div>

          <h2 className="text-xl font-bold uppercase text-cyber-text">
            NEURAL ENGINE ANOMALY
          </h2>

          <p className="text-xs text-cyber-magenta font-semibold">
            {error.message || 'An unexpected runtime error occurred.'}
          </p>

          <div className="pt-2">
            <CyberButton
              onClick={() => reset()}
              variant="yellow"
              size="sm"
              icon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              REBOOT SYSTEM
            </CyberButton>
          </div>
        </div>
      </CyberCard>
    </div>
  );
}
