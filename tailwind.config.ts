import type { Config } from "tailwindcss";

// Design tokens for the peer-support app.
// Palette is deliberately calm and grounded rather than clinical-white
// or a high-energy SaaS gradient: a muted sage for trust/availability,
// warm sand for the background, and a single clay-red reserved
// strictly for crisis/safety alerts so it never gets diluted by
// ordinary UI use.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        sand: {
          50: "#FAF8F4",
          100: "#F3EFE7",
          200: "#E7E0D3",
        },
        ink: {
          900: "#22241F",
          700: "#43463D",
          500: "#6B6E62",
        },
        sage: {
          600: "#2F5D52",
          500: "#3D7A6B",
          400: "#5E9A8A",
          100: "#DDEAE5",
        },
        gold: {
          500: "#B8965A",
          100: "#F1E6D2",
        },
        clay: {
          600: "#A8462F",
          500: "#C0533F",
          100: "#F6E1DC",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      borderRadius: {
        card: "14px",
      },
    },
  },
  plugins: [],
};
export default config;
