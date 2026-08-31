/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm near-black "workshop" ground with soft matte panels.
        chart: {
          bg: "#0B0906",
          surface: "#17120D",
          raised: "#1F1810",
          line: "#2C2318",
          "line-strong": "#3C3122",
        },
        ink: {
          hi: "#F4EEE2",
          mid: "#A99B84",
          lo: "#6E6252",
        },
        // Single accent: warm gold.
        brass: {
          DEFAULT: "#F0C24C",
          soft: "#F7D373",
          deep: "#B98F32",
        },
        // Secondary data / positive-neutral: sky.
        depth: {
          DEFAULT: "#6BA8C4",
          deep: "#3E6B7E",
        },
        // Negative / rejected.
        caution: "#DB7C68",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        DEFAULT: "12px",
      },
      boxShadow: {
        panel: "0 1px 0 0 rgba(255,235,190,0.03) inset, 0 20px 44px -30px rgba(0,0,0,0.85)",
        inset: "inset 0 1px 0 rgba(255,235,190,0.04)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
