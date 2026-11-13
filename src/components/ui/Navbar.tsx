'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '../theme/ThemeProvider';
import { CyberButton } from './CyberButton';
import { Sun, Moon, Keyboard, Trophy, Settings, User, LogOut, Zap } from 'lucide-react';
import { clsx } from 'clsx';

interface UserData {
  id: string;
  name: string;
  username: string;
  image?: string | null;
}

export function Navbar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/sign-out', { method: 'POST' });
    setUser(null);
    window.location.href = '/';
  };

  const navLinks = [
    { href: '/', label: 'Test', icon: <Keyboard className="w-4 h-4" /> },
    { href: '/tournaments', label: 'Tournaments', icon: <Trophy className="w-4 h-4" /> },
    { href: '/settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-cyber-border/80 bg-cyber-black/90 dark:bg-cyber-black/90 light:bg-slate-100/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo / Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-sm bg-cyber-yellow flex items-center justify-center font-black text-black text-lg shadow-neon-yellow group-hover:scale-105 transition-transform">
            ⚡
          </div>
          <div className="flex flex-col">
            <span className="font-mono font-black text-base tracking-wider text-cyber-yellow group-hover:text-cyber-cyan transition-colors">
              SANDEVISTAN
            </span>
            <span className="font-mono text-[9px] tracking-widest text-cyber-cyan dark:text-cyber-cyan light:text-cyan-700">
              EDGERUNNER // V.26
            </span>
          </div>
        </Link>

        {/* Navigation items */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-sm font-mono text-xs font-semibold tracking-wider transition-all',
                  isActive
                    ? 'text-cyber-yellow bg-cyber-yellow/10 border-b-2 border-cyber-yellow shadow-neon-yellow/20'
                    : 'text-gray-400 hover:text-cyber-cyan hover:bg-cyber-panel/50 light:text-slate-600 light:hover:text-slate-900'
                )}
              >
                {link.icon}
                <span className="hidden sm:inline uppercase">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right side controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Light / Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded border border-cyber-border text-cyber-cyan hover:bg-cyber-panel light:text-slate-700 light:border-slate-300 light:hover:bg-slate-200 transition-colors"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-cyber-yellow" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>

          {/* User Status / Action */}
          {!loading && (
            <>
              {user ? (
                <div className="flex items-center gap-2">
                  <Link
                    href="/settings"
                    className="flex items-center gap-2 px-2.5 py-1 rounded bg-cyber-panel border border-cyber-border hover:border-cyber-cyan transition-colors"
                  >
                    {user.image ? (
                      <img src={user.image} alt={user.username} className="w-5 h-5 rounded-full" />
                    ) : (
                      <User className="w-4 h-4 text-cyber-yellow" />
                    )}
                    <span className="font-mono text-xs text-cyber-text hidden md:inline">
                      @{user.username}
                    </span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="p-1.5 text-gray-400 hover:text-cyber-magenta transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <Link href="/login">
                  <CyberButton variant="yellow" size="sm" icon={<Zap className="w-3.5 h-3.5" />}>
                    JACK IN
                  </CyberButton>
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
