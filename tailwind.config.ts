import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          yellow: "#FCEE09",
          "yellow-dim": "#D8CA00",
          cyan: "#00F0FF",
          "cyan-dim": "#00BDC9",
          magenta: "#FF0055",
          "magenta-dim": "#D40046",
          green: "#05FFA1",
          black: "#07080C",
          dark: "#0E1017",
          panel: "#141724",
          "panel-light": "#1D2133",
          border: "#2A2F45",
          muted: "#6B7280",
          text: "#F3F4F6",
        },
        arasaka: {
          red: "#E60026",
          dark: "#1A0006",
          white: "#F8FAFC",
          panel: "#FFFFFF",
          border: "#CBD5E1",
          text: "#0F172A",
          muted: "#475569",
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      boxShadow: {
        "neon-yellow": "0 0 15px rgba(252, 238, 9, 0.4)",
        "neon-cyan": "0 0 15px rgba(0, 240, 255, 0.4)",
        "neon-magenta": "0 0 15px rgba(255, 0, 85, 0.4)",
      },
      keyframes: {
        glitch: {
          "0%, 100%": { transform: "translate(0)" },
          "20%": { transform: "translate(-2px, 2px)" },
          "40%": { transform: "translate(-1px, -1px)" },
          "60%": { transform: "translate(2px, 1px)" },
          "80%": { transform: "translate(1px, -2px)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(1000%)" },
        }
      },
      animation: {
        glitch: "glitch 0.4s ease-in-out infinite",
        pulseGlow: "pulseGlow 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        scanline: "scanline 8s linear infinite",
      }
    },
  },
  plugins: [],
};
export default config;
