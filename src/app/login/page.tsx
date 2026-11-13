'use client';

import React, { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CyberCard } from '@/components/ui/CyberCard';
import { CyberButton } from '@/components/ui/CyberButton';
import { Zap, Github, Chrome, ShieldAlert, Sparkles } from 'lucide-react';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center"><span className="text-gray-400 font-mono">Loading...</span></div>}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackUrl = searchParams.get('callbackURL') || searchParams.get('redirect') || '/tournaments';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDemoLogin = async (presetUser: { name: string; username: string }) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/sign-in/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(presetUser),
      });

      if (!res.ok) {
        throw new Error('Failed to authenticate');
      }

      window.location.href = callbackUrl;
    } catch (err: any) {
      setError(err.message || 'Login failed');
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 w-full max-w-md mx-auto px-4 py-16 flex flex-col justify-center font-mono">
      <CyberCard glow="yellow" headerAccent="NETRUNNER AUTHENTICATION">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-sm bg-cyber-yellow text-black font-black text-2xl flex items-center justify-center mx-auto mb-3 shadow-neon-yellow">
            ⚡
          </div>
          <h1 className="text-xl font-bold uppercase tracking-wider text-cyber-text">
            JACK INTO SANDEVISTAN
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Authenticate to create tournaments, record official scores and climb leaderboards.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded bg-cyber-magenta/20 border border-cyber-magenta text-cyber-magenta text-xs font-bold text-center">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {/* OAuth options */}
          <CyberButton
            onClick={() => handleDemoLogin({ name: 'Google Netrunner', username: `netrunner_${Math.floor(1000 + Math.random() * 9000)}` })}
            variant="outline"
            size="md"
            className="w-full flex justify-center"
            icon={<Chrome className="w-4 h-4 text-cyber-cyan" />}
            disabled={loading}
          >
            CONTINUE WITH GOOGLE
          </CyberButton>

          <CyberButton
            onClick={() => handleDemoLogin({ name: 'GitHub Solo', username: `solo_${Math.floor(1000 + Math.random() * 9000)}` })}
            variant="outline"
            size="md"
            className="w-full flex justify-center"
            icon={<Github className="w-4 h-4 text-cyber-cyan" />}
            disabled={loading}
          >
            CONTINUE WITH GITHUB
          </CyberButton>

          <div className="relative my-4 flex items-center justify-center">
            <span className="w-full border-t border-cyber-border" />
            <span className="absolute bg-cyber-panel px-2 text-[10px] text-gray-500 uppercase tracking-widest">
              OR QUICK DEMO RUNNER
            </span>
          </div>

          {/* Quick 1-Click Edgerunner Profiles */}
          <div className="space-y-2">
            <CyberButton
              onClick={() => handleDemoLogin({ name: 'David Martinez', username: 'sandevistan_01' })}
              variant="yellow"
              size="sm"
              className="w-full"
              icon={<Zap className="w-3.5 h-3.5" />}
              disabled={loading}
            >
              JACK IN AS: DAVID MARTINEZ
            </CyberButton>

            <CyberButton
              onClick={() => handleDemoLogin({ name: 'Lucyna Kushinada', username: 'deep_diver_lucy' })}
              variant="cyan"
              size="sm"
              className="w-full"
              icon={<Sparkles className="w-3.5 h-3.5" />}
              disabled={loading}
            >
              JACK IN AS: LUCY (NETRUNNER)
            </CyberButton>
          </div>
        </div>
      </CyberCard>
    </div>
  );
}
