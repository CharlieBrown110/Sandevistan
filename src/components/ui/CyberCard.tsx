import React from 'react';
import { clsx } from 'clsx';

interface CyberCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: 'yellow' | 'cyan' | 'magenta' | 'none';
  headerAccent?: string;
}

export function CyberCard({ children, className, glow = 'cyan', headerAccent }: CyberCardProps) {
  const glowStyles = {
    yellow: 'border-cyber-yellow/40 hover:border-cyber-yellow shadow-neon-yellow/20',
    cyan: 'border-cyber-cyan/30 hover:border-cyber-cyan shadow-neon-cyan/20',
    magenta: 'border-cyber-magenta/30 hover:border-cyber-magenta shadow-neon-magenta/20',
    none: 'border-cyber-border',
  };

  return (
    <div
      className={clsx(
        'relative bg-cyber-panel/90 dark:bg-cyber-panel/90 light:bg-white text-cyber-text dark:text-cyber-text light:text-slate-800 border backdrop-blur-md p-5 transition-all duration-300',
        glowStyles[glow],
        className
      )}
      style={{
        clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))',
      }}
    >
      {/* HUD corner ticks */}
      <span className="absolute top-0 left-0 w-3 h-[2px] bg-cyber-cyan" />
      <span className="absolute top-0 left-0 w-[2px] h-3 bg-cyber-cyan" />
      <span className="absolute bottom-0 right-0 w-3 h-[2px] bg-cyber-cyan" />
      <span className="absolute bottom-0 right-0 w-[2px] h-3 bg-cyber-cyan" />

      {headerAccent && (
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-cyber-border/60 text-xs font-mono text-cyber-cyan">
          <span className="flex items-center gap-1.5 font-bold tracking-widest uppercase">
            <span className="w-2 h-2 bg-cyber-yellow inline-block" />
            {headerAccent}
          </span>
          <span className="text-[10px] text-gray-400 font-mono tracking-tighter">// SYS.RUNNER</span>
        </div>
      )}

      {children}
    </div>
  );
}
