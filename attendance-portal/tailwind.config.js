/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'media',
  corePlugins: {
    preflight: true,
    utilities: true,       // 👈 this turns on `bg-*`, `from-*`, etc
  },
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
