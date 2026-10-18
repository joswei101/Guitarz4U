import type { Config } from "tailwindcss";

// Guitarz4U design tokens: black stage, white type, electric orange-gold accent.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: { DEFAULT: "1rem", sm: "1.5rem", lg: "2rem" }, screens: { "2xl": "1280px" } },
    extend: {
      colors: {
        ink: { DEFAULT: "#0A0A0A", 900: "#0A0A0A", 800: "#111111", 700: "#171717", 600: "#1F1F1F", 500: "#2A2A2A", 400: "#3A3A3A" },
        bone: { DEFAULT: "#FFFFFF", muted: "#B5B5B5", dim: "#8A8A8A" },
        amp: { DEFAULT: "#FF9F1C", light: "#FFB84D", dark: "#E07F00", glow: "rgba(255,159,28,0.35)" },
        ok: "#4ADE80",
        warn: "#FACC15",
        danger: "#F87171",
      },
      fontFamily: {
        display: ["var(--font-display)", "Impact", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: { amp: "0 0 0 1px rgba(255,159,28,0.4), 0 8px 30px -10px rgba(255,159,28,0.45)" },
      keyframes: {
        "fade-up": { "0%": { opacity: "0", transform: "translateY(12px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
      },
      animation: { "fade-up": "fade-up .6s ease-out both" },
    },
  },
  plugins: [],
};
export default config;
