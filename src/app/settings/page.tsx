'use client';

import React, { useEffect, useState } from 'react';
import { useTheme, CaretStyle } from '@/components/theme/ThemeProvider';
import { CyberCard } from '@/components/ui/CyberCard';
import { CyberButton } from '@/components/ui/CyberButton';
import { Settings, User, Eye, Type, Sliders, Check } from 'lucide-react';
import { clsx } from 'clsx';

export default function SettingsPage() {
  const { theme, setTheme, fontSize, setFontSize, caretStyle, setCaretStyle, showLiveWpm, setShowLiveWpm } = useTheme();

  const [username, setUsername] = useState('');
  const [initialUsername, setInitialUsername] = useState('');
  const [userLoaded, setUserLoaded] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [usernameSuccess, setUsernameSuccess] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/me')
      .then((res) => {
        if (!res.ok) throw new Error('Not signed in');
        return res.json();
      })
      .then((data) => {
        if (data.user) {
          setUsername(data.user.username);
          setInitialUsername(data.user.username);
        }
      })
      .catch(() => {})
      .finally(() => setUserLoaded(true));
  }, []);

  const handleSaveUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameError(null);
    setUsernameSuccess(false);
    setSavingUsername(true);

    try {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to update username');
      }

      setInitialUsername(username);
      setUsernameSuccess(true);
      setTimeout(() => setUsernameSuccess(false), 3000);
    } catch (err: any) {
      setUsernameError(err.message);
    } finally {
      setSavingUsername(false);
    }
  };

  const caretStyles: { id: CaretStyle; label: string }[] = [
    { id: 'line', label: 'LINE' },
    { id: 'block', label: 'BLOCK' },
    { id: 'underline', label: 'UNDERLINE' },
    { id: 'glow', label: 'MAGENTA GLOW' },
  ];

  return (
    <div className="flex-1 w-full max-w-3xl mx-auto px-4 py-8 font-mono space-y-6">
      <div className="flex items-center gap-2 pb-2 border-b border-cyber-border">
        <Settings className="w-5 h-5 text-cyber-yellow" />
        <h1 className="text-xl font-bold uppercase tracking-wider text-cyber-text">
          CYBERWARE PROTOCOL CONFIGURATION
        </h1>
      </div>

      {/* Profile & Username Editor */}
      <CyberCard glow="yellow" headerAccent="IDENTITY & HANDLE">
        <form onSubmit={handleSaveUsername} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase mb-1">
              RUNNER HANDLE (USERNAME)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-2.5 text-gray-500 text-xs">@</span>
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={20}
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="runner_handle"
                  className="w-full pl-7 pr-3 py-2 bg-cyber-black/70 border border-cyber-border rounded text-cyber-text text-xs focus:border-cyber-yellow focus:outline-none"
                />
              </div>

              <CyberButton
                type="submit"
                variant="yellow"
                size="sm"
                disabled={savingUsername || username === initialUsername || username.length < 3}
              >
                {savingUsername ? 'UPDATING...' : 'SAVE'}
              </CyberButton>
            </div>
            <span className="text-[11px] text-gray-500 mt-1 block">
              3 to 20 characters: lowercase letters, numbers, and underscores.
            </span>
          </div>

          {usernameSuccess && (
            <div className="p-2 bg-cyber-green/20 border border-cyber-green text-cyber-green text-xs rounded flex items-center gap-1.5 font-bold">
              <Check className="w-4 h-4" />
              <span>Handle updated across all leaderboards!</span>
            </div>
          )}

          {usernameError && (
            <div className="p-2 bg-cyber-magenta/20 border border-cyber-magenta text-cyber-magenta text-xs rounded font-bold">
              {usernameError}
            </div>
          )}
        </form>
      </CyberCard>

      {/* Visual & Typing HUD Configuration */}
      <CyberCard glow="cyan" headerAccent="OPTIC HUD & TYPING CUSTOMIZATION">
        <div className="space-y-6">
          {/* Theme Mode */}
          <div>
            <label className="block text-xs font-bold text-cyber-cyan uppercase mb-2">
              COLOR THEME
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={clsx(
                  'p-3 rounded border text-xs font-bold text-left transition-all',
                  theme === 'dark'
                    ? 'border-cyber-yellow bg-cyber-yellow/10 text-cyber-yellow shadow-neon-yellow/30'
                    : 'border-cyber-border text-gray-400 hover:text-white'
                )}
              >
                <span className="block text-sm font-black">SANDEVISTAN DARK</span>
                <span className="text-[10px] text-gray-500">Night City carbon black, neon yellow & optic cyan</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('light')}
                className={clsx(
                  'p-3 rounded border text-xs font-bold text-left transition-all',
                  theme === 'light'
                    ? 'border-cyber-cyan bg-cyber-cyan/10 text-cyber-cyan shadow-neon-cyan/30'
                    : 'border-cyber-border text-gray-400 hover:text-white'
                )}
              >
                <span className="block text-sm font-black">ARASAKA LAB LIGHT</span>
                <span className="text-[10px] text-gray-500">High-contrast clean tech slate with crimson accents</span>
              </button>
            </div>
          </div>

          {/* Caret Style */}
          <div>
            <label className="block text-xs font-bold text-cyber-cyan uppercase mb-2">
              CARET HARDWARE STYLE
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {caretStyles.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCaretStyle(item.id)}
                  className={clsx(
                    'py-2 px-3 rounded border text-xs font-bold transition-all',
                    caretStyle === item.id
                      ? 'bg-cyber-yellow text-black border-cyber-yellow shadow-neon-yellow/20'
                      : 'border-cyber-border text-gray-400 hover:text-white'
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Font Size Slider */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-cyber-cyan uppercase">
                TYPING FONT SIZE
              </label>
              <span className="text-xs font-bold text-cyber-yellow">{fontSize}px</span>
            </div>
            <input
              type="range"
              min={18}
              max={32}
              step={2}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full accent-cyber-yellow cursor-pointer"
            />
          </div>

          {/* Live WPM Toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-cyber-border/60">
            <div>
              <span className="text-xs font-bold text-gray-300 uppercase block">
                LIVE WPM DISPLAY
              </span>
              <span className="text-[11px] text-gray-500">
                Show real-time speed calculation while typing
              </span>
            </div>
            <input
              type="checkbox"
              checked={showLiveWpm}
              onChange={(e) => setShowLiveWpm(e.target.checked)}
              className="w-4 h-4 rounded border-cyber-border text-cyber-yellow focus:ring-cyber-yellow accent-cyber-yellow cursor-pointer"
            />
          </div>
        </div>
      </CyberCard>
    </div>
  );
}
