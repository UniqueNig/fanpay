/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#181229",        // deep violet-black (FanFi brand)
        secondary: "#8b5cf6",      // vivid violet (FanFi brand)
        accent: "#7c3aed",         // darker violet accent
        naira: "#15803d",
        gold: "#f0a500",
        card: "#1f1830",           // dark violet card
        muted: "rgba(255,255,255,0.55)",
        // Light/dark theme tokens — used by the customer-facing app shell
        // (Dashboard and everything inside it). Marketing pages and Admin
        // still use the dark tokens above (fixed, no toggle) until the rest
        // of the app is converted too. CSS-variable-backed so ThemeContext
        // can flip them at runtime via the `data-theme` attribute — see the
        // --fp-* custom properties in index.css. The `rgb(var(...) / <alpha-value>)`
        // form is what keeps Tailwind's opacity modifiers (e.g. `text-ink/40`)
        // working on top of a runtime-variable color.
        surface: "rgb(var(--fp-surface) / <alpha-value>)",
        ink: "rgb(var(--fp-ink) / <alpha-value>)",
        line: "rgb(var(--fp-line) / <alpha-value>)",
        panel: "rgb(var(--fp-panel) / <alpha-value>)",
        "accent-ink": "rgb(var(--fp-accent-ink) / <alpha-value>)",
        iris: {
          DEFAULT: "rgb(var(--fp-iris) / <alpha-value>)",
          soft: "rgb(var(--fp-iris-soft) / <alpha-value>)",
        },
        coral: { DEFAULT: "#FB7185", soft: "#FFE9EC" },
      },
      fontFamily: {
        syne: ["'Syne'", "sans-serif"],
        dm: ["'DM Sans'", "sans-serif"],
      },
      backgroundImage: {
        "hero-gradient": "linear-gradient(135deg, #181229 0%, #241c3d 60%, #181229 100%)",
        "card-gradient": "linear-gradient(135deg, #1f1830 0%, #2f2454 100%)",
        "accent-glow": "radial-gradient(circle at 50% 50%, rgba(139,92,246,0.15) 0%, transparent 70%)",
      },
      screens: {
        xs: "480px",
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
      },
    },
  },
  plugins: [],
};
