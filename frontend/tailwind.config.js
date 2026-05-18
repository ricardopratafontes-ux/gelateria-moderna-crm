/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#f31c40',
        secondary: '#c9e7bd',
        tertiary: '#98472d',
        background: '#fffaf2',
      }
    },
  },
  plugins: [],
}
