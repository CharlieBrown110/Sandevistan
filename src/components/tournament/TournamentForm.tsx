'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CyberButton } from '../ui/CyberButton';
import { CyberCard } from '../ui/CyberCard';
import { Trophy, Clock, Type, Shield, Users, Calendar, ArrowRight } from 'lucide-react';
import { clsx } from 'clsx';

interface TournamentFormProps {
  initialValues?: {
    title?: string;
    description?: string;
    mode?: 'time' | 'words';
    modeValue?: number;
    punctuation?: boolean;
    numbers?: boolean;
    minAccuracy?: number;
    maxParticipants?: number;
  };
}

export function TournamentForm({ initialValues }: TournamentFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState(initialValues?.title || '');
  const [description, setDescription] = useState(initialValues?.description || '');
  const [mode, setMode] = useState<'time' | 'words'>(initialValues?.mode || 'time');
  const [modeValue, setModeValue] = useState<number>(initialValues?.modeValue || 60);
  const [punctuation, setPunctuation] = useState<boolean>(initialValues?.punctuation || false);
  const [numbers, setNumbers] = useState<boolean>(initialValues?.numbers || false);
  const [minAccuracy, setMinAccuracy] = useState<number>(initialValues?.minAccuracy ?? 90);
  const [maxParticipants, setMaxParticipants] = useState<number>(initialValues?.maxParticipants ?? 50);

  const [startType, setStartType] = useState<'now' | 'custom'>('now');
  const [customStart, setCustomStart] = useState<string>('');
  const [durationPreset, setDurationPreset] = useState<string>('24h');
  const [customEnd, setCustomEnd] = useState<string>('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (title.length < 3 || title.length > 60) {
      setError('Title must be between 3 and 60 characters');
      return;
    }

    const now = new Date();
    const startsAt = startType === 'now' ? now : new Date(customStart);
    if (isNaN(startsAt.getTime())) {
      setError('Invalid start date/time');
      return;
    }

    let endsAt: Date;
    if (durationPreset === '1h') {
      endsAt = new Date(startsAt.getTime() + 1 * 3600_000);
    } else if (durationPreset === '24h') {
      endsAt = new Date(startsAt.getTime() + 24 * 3600_000);
    } else if (durationPreset === '3d') {
      endsAt = new Date(startsAt.getTime() + 3 * 24 * 3600_000);
    } else if (durationPreset === '7d') {
      endsAt = new Date(startsAt.getTime() + 7 * 24 * 3600_000);
    } else if (durationPreset === '30d') {
      endsAt = new Date(startsAt.getTime() + 30 * 24 * 3600_000);
    } else {
      endsAt = new Date(customEnd);
      if (isNaN(endsAt.getTime())) {
        setError('Invalid custom end date/time');
        return;
      }
    }

    const diffMinutes = (endsAt.getTime() - startsAt.getTime()) / (1000 * 60);
    if (diffMinutes < 10) {
      setError('Tournament duration must be at least 10 minutes');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          mode,
          modeValue,
          language: 'english',
          punctuation,
          numbers,
          minAccuracy,
          maxParticipants,
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to create tournament');
      }

      router.push(`/t/${data.code}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto space-y-6 font-mono text-sm">
      <CyberCard glow="yellow" headerAccent="NEW TOURNAMENT MATRIX">
        {error && (
          <div className="mb-4 p-3 rounded bg-cyber-magenta/20 border border-cyber-magenta text-cyber-magenta text-xs font-bold">
            {error}
          </div>
        )}

        {/* Title & Description */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
              Tournament Title *
            </label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={60}
              placeholder="e.g. Night City Solos 60s Speedrun"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-cyber-black/70 border border-cyber-border rounded text-cyber-text focus:border-cyber-yellow focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
              Description (Optional)
            </label>
            <textarea
              maxLength={280}
              rows={2}
              placeholder="Rules, prizes, or banter for your crew..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-cyber-black/70 border border-cyber-border rounded text-cyber-text focus:border-cyber-yellow focus:outline-none"
            />
          </div>

          {/* Test Configuration */}
          <div className="pt-2 border-t border-cyber-border/60">
            <label className="block text-xs font-bold text-cyber-yellow uppercase mb-3">
              Test Configuration
            </label>

            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Mode */}
              <div>
                <span className="text-xs text-gray-400 block mb-1">MODE</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('time');
                      setModeValue(60);
                    }}
                    className={clsx(
                      'flex-1 py-1.5 px-3 rounded border text-xs font-bold uppercase transition-all',
                      mode === 'time'
                        ? 'bg-cyber-yellow text-black border-cyber-yellow shadow-neon-yellow/30'
                        : 'border-cyber-border text-gray-400 hover:text-white'
                    )}
                  >
                    TIME
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('words');
                      setModeValue(50);
                    }}
                    className={clsx(
                      'flex-1 py-1.5 px-3 rounded border text-xs font-bold uppercase transition-all',
                      mode === 'words'
                        ? 'bg-cyber-yellow text-black border-cyber-yellow shadow-neon-yellow/30'
                        : 'border-cyber-border text-gray-400 hover:text-white'
                    )}
                  >
                    WORDS
                  </button>
                </div>
              </div>

              {/* Mode Value */}
              <div>
                <span className="text-xs text-gray-400 block mb-1">
                  {mode === 'time' ? 'SECONDS' : 'WORDS COUNT'}
                </span>
                <div className="flex gap-1.5">
                  {(mode === 'time' ? [15, 30, 60, 120] : [10, 25, 50, 100]).map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setModeValue(val)}
                      className={clsx(
                        'flex-1 py-1.5 rounded border text-xs font-bold transition-all',
                        modeValue === val
                          ? 'bg-cyber-cyan text-black border-cyber-cyan shadow-neon-cyan/30'
                          : 'border-cyber-border text-gray-400 hover:text-white'
                      )}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Punctuation & Numbers */}
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300">
                <input
                  type="checkbox"
                  checked={punctuation}
                  onChange={(e) => setPunctuation(e.target.checked)}
                  className="rounded border-cyber-border text-cyber-yellow focus:ring-cyber-yellow"
                />
                <span>PUNCTUATION</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300">
                <input
                  type="checkbox"
                  checked={numbers}
                  onChange={(e) => setNumbers(e.target.checked)}
                  className="rounded border-cyber-border text-cyber-yellow focus:ring-cyber-yellow"
                />
                <span>NUMBERS</span>
              </label>
            </div>
          </div>

          {/* Rules & Limits */}
          <div className="pt-2 border-t border-cyber-border/60 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
                Min Accuracy (%): {minAccuracy}%
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={minAccuracy}
                onChange={(e) => setMinAccuracy(Number(e.target.value))}
                className="w-full accent-cyber-yellow cursor-pointer"
              />
              <span className="text-[10px] text-gray-500">Scores below this are saved but not eligible</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
                Max Participants (2-200)
              </label>
              <input
                type="number"
                min={2}
                max={200}
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-cyber-black/70 border border-cyber-border rounded text-cyber-text"
              />
            </div>
          </div>

          {/* Start & Duration */}
          <div className="pt-2 border-t border-cyber-border/60 space-y-3">
            <div>
              <span className="text-xs font-bold text-cyber-cyan uppercase block mb-1">
                TOURNAMENT DURATION
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: '1h', label: '1 HOUR' },
                  { id: '24h', label: '24 HOURS' },
                  { id: '3d', label: '3 DAYS' },
                  { id: '7d', label: '7 DAYS' },
                  { id: '30d', label: '30 DAYS' },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setDurationPreset(preset.id)}
                    className={clsx(
                      'px-3 py-1.5 rounded border text-xs font-bold transition-all',
                      durationPreset === preset.id
                        ? 'bg-cyber-yellow text-black border-cyber-yellow shadow-neon-yellow/30'
                        : 'border-cyber-border text-gray-400 hover:text-white'
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Submit button */}
          <div className="pt-4">
            <CyberButton
              type="submit"
              variant="yellow"
              size="lg"
              disabled={loading}
              className="w-full"
              icon={<ArrowRight className="w-4 h-4" />}
            >
              {loading ? 'INITIALIZING PROTOCOL...' : 'CREATE TOURNAMENT & GENERATE LINK'}
            </CyberButton>
          </div>
        </div>
      </CyberCard>
    </form>
  );
}
