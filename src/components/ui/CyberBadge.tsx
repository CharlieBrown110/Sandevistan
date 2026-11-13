import React from 'react';
import { clsx } from 'clsx';

interface CyberBadgeProps {
  children: React.ReactNode;
  variant?: 'yellow' | 'cyan' | 'magenta' | 'green' | 'muted';
  size?: 'sm' | 'md';
}

export function CyberBadge({ children, variant = 'cyan', size = 'sm' }: CyberBadgeProps) {
  const variantStyles = {
    yellow: 'border-cyber-yellow/60 text-cyber-yellow bg-cyber-yellow/10 dark:bg-cyber-yellow/10 light:text-amber-700 light:border-amber-500 light:bg-amber-50',
    cyan: 'border-cyber-cyan/60 text-cyber-cyan bg-cyber-cyan/10 dark:bg-cyber-cyan/10 light:text-cyan-700 light:border-cyan-600 light:bg-cyan-50',
    magenta: 'border-cyber-magenta/60 text-cyber-magenta bg-cyber-magenta/10 dark:bg-cyber-magenta/10 light:text-rose-700 light:border-rose-500 light:bg-rose-50',
    green: 'border-cyber-green/60 text-cyber-green bg-cyber-green/10 dark:bg-cyber-green/10 light:text-emerald-700 light:border-emerald-500 light:bg-emerald-50',
    muted: 'border-gray-500/40 text-gray-400 bg-gray-500/10 dark:bg-gray-800/40 light:text-slate-600 light:border-slate-300 light:bg-slate-100',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 font-mono uppercase tracking-wider font-semibold border backdrop-blur-sm select-none',
        sizeStyles[size],
        variantStyles[variant]
      )}
      style={{
        clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))',
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      {children}
    </span>
  );
}
