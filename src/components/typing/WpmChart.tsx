'use client';

import React from 'react';

interface WpmChartProps {
  data: number[]; // raw WPM per second
  height?: number;
}

export function WpmChart({ data, height = 180 }: WpmChartProps) {
  if (!data || data.length === 0) {
    return null;
  }

  const maxWpm = Math.max(80, Math.ceil((Math.max(...data) + 15) / 10) * 10);
  const minWpm = 0;
  const padding = { top: 20, right: 30, bottom: 30, left: 40 };

  const svgWidth = 700;
  const svgHeight = height;

  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  // Generate points
  const points = data.map((val, idx) => {
    const x = padding.left + (idx / Math.max(1, data.length - 1)) * chartWidth;
    const y = padding.top + chartHeight - (val / maxWpm) * chartHeight;
    return { x, y, val, second: idx + 1 };
  });

  const pathD = points.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  // Area under line
  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`
    : '';

  // Grid lines (3 horizontal)
  const gridSteps = [0, maxWpm * 0.5, maxWpm];

  return (
    <div className="w-full bg-cyber-black/70 dark:bg-cyber-black/70 light:bg-slate-100 p-4 rounded border border-cyber-border/80 font-mono">
      <div className="flex items-center justify-between text-[11px] text-gray-400 mb-2">
        <span className="flex items-center gap-1.5 text-cyber-yellow font-bold">
          <span className="w-2 h-2 bg-cyber-yellow rounded-sm" />
          RAW WPM TELEMETRY (PER SECOND)
        </span>
        <span className="text-[10px] text-gray-500">MAX: {maxWpm} WPM</span>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            <linearGradient id="cyberAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#00F0FF" stopOpacity="0.0" />
            </linearGradient>
            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#00F0FF" floodOpacity="0.8" />
            </filter>
          </defs>

          {/* Horizontal Grid lines */}
          {gridSteps.map((stepVal, idx) => {
            const y = padding.top + chartHeight - (stepVal / maxWpm) * chartHeight;
            return (
              <g key={idx}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={svgWidth - padding.right}
                  y2={y}
                  stroke="#2A2F45"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  fill="#6B7280"
                  fontSize="10"
                  textAnchor="end"
                >
                  {Math.round(stepVal)}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          {areaD && <path d={areaD} fill="url(#cyberAreaGrad)" />}

          {/* Main line */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#00F0FF"
              strokeWidth="2.5"
              filter="url(#neonGlow)"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data Points */}
          {points.map((pt, i) => (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r="3"
              fill="#FCEE09"
              className="hover:r-5 transition-all cursor-pointer"
            >
              <title>{`${pt.second}s: ${pt.val} wpm`}</title>
            </circle>
          ))}
        </svg>
      </div>
    </div>
  );
}
