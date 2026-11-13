'use client';

import React from 'react';
import { clsx } from 'clsx';

interface CyberButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'yellow' | 'cyan' | 'magenta' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export function CyberButton({
  children,
  variant = 'yellow',
  size = 'md',
  icon,
  className,
  disabled,
  ...props
}: CyberButtonProps) {
  const baseStyles =
    'relative inline-flex items-center justify-center font-mono font-bold tracking-wider uppercase transition-all duration-200 select-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed group';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-5 py-2.5 gap-2',
    lg: 'text-base px-7 py-3.5 gap-2.5',
  };

  const variantStyles = {
    yellow:
      'bg-cyber-yellow hover:bg-[#ffe600] text-black shadow-neon-yellow hover:scale-[1.02] active:scale-[0.98] border border-cyber-yellow',
    cyan:
      'bg-cyber-cyan hover:bg-[#33f3ff] text-black shadow-neon-cyan hover:scale-[1.02] active:scale-[0.98] border border-cyber-cyan',
    magenta:
      'bg-cyber-magenta hover:bg-[#ff1a66] text-white shadow-neon-magenta hover:scale-[1.02] active:scale-[0.98] border border-cyber-magenta',
    outline:
      'bg-transparent border border-cyber-cyan/50 text-cyber-cyan hover:bg-cyber-cyan/10 hover:border-cyber-cyan hover:shadow-neon-cyan dark:text-cyber-cyan light:text-sky-700 light:border-sky-600',
    ghost:
      'bg-transparent hover:bg-white/5 text-gray-300 hover:text-white dark:hover:bg-cyber-panel light:text-slate-700 light:hover:bg-slate-200',
  };

  return (
    <button
      className={clsx(
        baseStyles,
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
      style={{
        clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
      }}
      disabled={disabled}
      {...props}
    >
      {/* Corner accent glow */}
      <span className="absolute top-0 right-0 w-2 h-2 bg-white/40 pointer-events-none" />
      <span className="absolute bottom-0 left-0 w-2 h-2 bg-white/40 pointer-events-none" />

      {icon && <span className="transition-transform group-hover:scale-110">{icon}</span>}
      <span>{children}</span>
    </button>
  );
}
