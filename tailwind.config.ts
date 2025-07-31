import type { Config } from 'tailwindcss'

export default {
  content: [
    './data/**/*.{html,js}',
    './data/html/**/*.html', 
    './data/js/**/*.js'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'terminal-green': '#00ff41',
        'terminal-amber': '#ffb000',
        'paper': '#f7f5f3',
        'ink': '#2d2d2d'
      }
    },
  },
  plugins: [],
} satisfies Config
