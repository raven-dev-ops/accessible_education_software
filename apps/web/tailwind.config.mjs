/** @type {import('tailwindcss').Config} */
const config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          light: "#e0f2fe", // pastel blue
          DEFAULT: "#38bdf8",
          dark: "#0f172a"
        },
        surface: {
          light: "#f9fafb",
          dark: "#020617"
        }
      }
    }
  },
  plugins: []
};

export default config;

