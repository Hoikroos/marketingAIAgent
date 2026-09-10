import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: "#070c14",
        panel: "#0d1626",
        panel2: "#101d31",
        purple: "#7c5cff",
        gold: "#e8b563",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(124,92,255,.15), 0 8px 24px -8px rgba(124,92,255,.35)",
      },
      borderRadius: {
        xl2: "14px",
      },
    }
  },
  plugins: []
};
export default config;
