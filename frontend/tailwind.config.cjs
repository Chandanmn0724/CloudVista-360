/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          500: "#38bdf8",
          600: "#0284c7",
        },
      },
    },
  },
  plugins: [],
};
