/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand orange, overrides Tailwind's default "orange" scale at every
        // shade so every existing orange-* utility across the app picks up
        // the brand color automatically — no need to touch individual class
        // names.
        orange: {
          50: "#FFF5F0",
          100: "#FEE8DC",
          200: "#FCCEB5",
          300: "#F7AB82",
          400: "#FF813D",
          500: "#FF620D", // brand orange
          600: "#D94C00",
          700: "#B03E00",
          800: "#873000",
          900: "#5F2100",
          950: "#401600",
        },
      },
    },
  },
  plugins: [],
};