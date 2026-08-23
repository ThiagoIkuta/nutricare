/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand palette derived from the NutriCare logo (blueberry + mint leaf
        // in an orange bowl). These override Tailwind's default "orange" and
        // "green" scales at every shade, so every existing orange-*/green-*
        // utility across the app picks up the brand colors automatically —
        // no need to touch individual class names. "blue" is intentionally
        // NOT overridden (stays default Tailwind blue) — the brand's blue
        // didn't read well in solid UI elements, so mint (green) covers both
        // the secondary-accent and blue-replacement role instead.
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
        green: {
          50: "#F2FCFA",
          100: "#E1F9F3",
          200: "#C1F1E4",
          300: "#95E4CF",
          400: "#5DDFBD",
          500: "#6FE3C4", // brand mint
          600: "#44DBB3",
          700: "#28CEA2",
          800: "#21AC87",
          900: "#1B8A6C",
          950: "#167058",
        },
      },
    },
  },
  plugins: [],
};