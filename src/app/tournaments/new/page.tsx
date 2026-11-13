'use client';

import React from 'react';
import { TournamentForm } from '@/components/tournament/TournamentForm';
import { Trophy, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewTournamentPage() {
  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 font-mono space-y-6">
      <div className="flex items-center gap-3 pb-3 border-b border-cyber-border">
        <Link href="/tournaments" className="text-gray-400 hover:text-cyber-yellow transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wider text-cyber-text">
            INITIALIZE TOURNAMENT
          </h1>
          <p className="text-xs text-gray-400">
            Define custom test parameters, participant capacity, and time windows.
          </p>
        </div>
      </div>

      <TournamentForm />
    </div>
  );
}
