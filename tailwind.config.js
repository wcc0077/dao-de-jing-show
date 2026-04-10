/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'ink': '#1a1a1a',
        'ink-light': '#4a4a4a',
        'paper': '#f7f5f0',
        'paper-dark': '#e8e4dc',
        'cinnabar': '#c93756',
        'cinnabar-light': '#e85d75',
        'gold': '#c9a227',
        'jade': '#6b8e6b',
        'mist': 'rgba(0,0,0,0.05)'
      },
      fontFamily: {
        'serif': ['"Noto Serif SC"', 'serif'],
        'calligraphy': ['"ZCOOL XiaoWei"', 'serif'],
      }
    },
  },
  plugins: [],
}
