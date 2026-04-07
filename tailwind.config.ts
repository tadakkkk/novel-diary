import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 디자인 토큰 (mockup-spec.md 기준)
        black:       '#050301',
        white:       '#f8f0e3',
        'fire-tip':  '#ffe680',
        'fire-amb':  '#ffaa00',
        'fire-org':  '#ff5a00',
        'fire-red':  '#cc1100',
        'gray-2':    '#1e1e1e',
        'gray-3':    '#333333',
        'gray-4':    '#666666',
        'gray-5':    '#cccccc',
        'text-off':  '#444444',
      },
      fontFamily: {
        pixel:   ['"Press Start 2P"', 'monospace'],
        korean:  ['system-ui', 'sans-serif'],
      },
      boxShadow: {
        // Pixel border (double border 패턴)
        pixel:     'inset 0 0 0 2px #f8f0e3, inset 0 0 0 5px #050301',
        'pixel-sm': 'inset 0 0 0 1px #f8f0e3, inset 0 0 0 3px #050301',
      },
    },
  },
  plugins: [],
}

export default config
