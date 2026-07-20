import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          950: "#020617",
          900: "#0a0f1d",
          800: "#131b2e",
          700: "#1e293b",
        },
        gold: {
          50: "#fefdf6",
          100: "#fdfbe7",
          200: "#faf5c3",
          300: "#f6ee92",
          400: "#efe055",
          500: "#dcc522",
          600: "#c4ab1b",
          700: "#a38917",
          800: "#856d18",
          900: "#6e5919",
          950: "#40320a",
        },
      },
    },
  },
  plugins: [],
};
export default config;
