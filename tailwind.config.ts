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
        surface: {
          DEFAULT: "#0d0d14",
          elevated: "#13131f",
          card: "#1a1a2e",
          hover: "#1f1f35",
        },
        accent: {
          purple: "#233dff",
          "purple-light": "#4f65ff",
          blue: "#5b8ded",
          cyan: "#06b6d4",
          emerald: "#34d399",
          amber: "#fbbf24",
        },
        item: {
          event: "#5b8ded",
          task: "#34d399",
          reminder: "#fbbf24",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-in": "scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "noise": "url('/noise.svg')",
      },
      boxShadow: {
        "glow-purple": "0 0 30px rgba(139, 92, 246, 0.15)",
        "glow-blue": "0 0 30px rgba(91, 141, 237, 0.15)",
        "card": "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
        "elevated": "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
        "float": "0 20px 60px rgba(0,0,0,0.6)",
      },
    },
  },
  plugins: [],
};

export default config;
