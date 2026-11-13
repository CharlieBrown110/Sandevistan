import React from 'react';

export function Footer() {
  return (
    <footer className="w-full border-t border-cyber-border/60 py-6 px-4 bg-cyber-black/95 dark:bg-cyber-black/95 light:bg-slate-100 text-xs font-mono text-gray-500 light:text-slate-500">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyber-green animate-ping" />
          <span className="text-gray-400 light:text-slate-600 font-semibold">
            STATUS: NETRUNNER FEED SYNCHRONIZED
          </span>
          <span className="text-gray-600 dark:text-gray-600 light:text-slate-400">|</span>
          <span>LATENCY: 0.8ms (EDGE)</span>
        </div>

        <div className="flex items-center gap-6 text-[11px] text-gray-400 light:text-slate-600">
          <span>ZERO-TRUST SCORE REPLAY</span>
          <span>DETERMINISTIC PRNG</span>
          <span className="text-cyber-yellow dark:text-cyber-yellow light:text-amber-600 font-bold">
            NO WEBSOCKETS // PURE ASYNC
          </span>
        </div>
      </div>
    </footer>
  );
}
