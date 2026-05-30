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
        primary: "#0F172A",     // Deep slate base
        secondary: "#1E293B",   // Mid slate overlay
        accent: "#00E5FF",      // Vivid cyber cyan
        danger: "#EF4444",      // High alert red
        success: "#22C55E",     // Verification green
        warning: "#F97316",     // Amber orange
        cardBg: "rgba(30, 41, 59, 0.7)", // Glassmorphic card fill
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      boxShadow: {
        cyber: "0 0 15px rgba(0, 229, 255, 0.15)",
        cyberGlow: "0 0 25px rgba(0, 229, 255, 0.35)",
        dangerGlow: "0 0 20px rgba(239, 68, 68, 0.3)",
      },
    },
  },
  plugins: [],
};
export default config;
