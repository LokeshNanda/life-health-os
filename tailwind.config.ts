import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        medical: {
          50: "#f0f9f4",
          100: "#dcf3e6",
          200: "#bce6d0",
          300: "#8dd3b0",
          400: "#58b88a",
          500: "#359c6d",
          600: "#267d57",
          700: "#216447",
          800: "#1d503a",
          900: "#1a4231",
          950: "#0d251c",
        },
        midnight: {
          DEFAULT: "#0a0e14",
          dark: "#0d1117",
          charcoal: "#161b22",
          surface: "#1c2128",
        },
        neon: {
          cyan: "#00d4ff",
          "cyan-dim": "#00a8cc",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 20px rgba(0, 212, 255, 0.3)",
        "glow-soft": "0 0 40px rgba(0, 212, 255, 0.15)",
        "glow-panel": "0 0 40px rgba(0, 212, 255, 0.1), 0 4px 24px rgba(0, 0, 0, 0.4)",
      },
      animation: {
        "fade-slide-up": "fadeSlideUp 0.5s ease-out both",
        "kpi-up": "kpiUp 0.6s ease-out both",
        "pulse-subtle": "pulseSubtle 2s ease-in-out infinite",
      },
      keyframes: {
        fadeSlideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        kpiUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSubtle: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.85" },
        },
      },
      animationDelay: {
        "100": "0.1s",
        "150": "0.15s",
        "200": "0.2s",
      },
    },
  },
  plugins: [],
};

export default config;
