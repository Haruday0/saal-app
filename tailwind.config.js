/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        saal: {
          blue: '#0085ca', // アクセス線ブルー
          accent: '#00a3e0',
          dark: '#0f172a',
        },
        jr: {
          green: '#008000', // 東北本線グリーン
          joban: '#006699', // 常磐線ブルー
        },
        led: {
          bg: '#0c0f12',
          orange: '#ff9900',
          green: '#22c55e',
          red: '#ef4444',
          dim: '#262626',
        }
      },
      fontFamily: {
        led: [
          '"DotGothic16"',
          '"Share Tech Mono"',
          'monospace',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          '"Liberation Mono"',
          'monospace',
        ],
        english: [
          '"Inter"',
          '"Helvetica Neue"',
          'Arial',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          '"BIZ UDPGothic"',
          '"M PLUS 1"',
          'sans-serif',
        ],
        track: [
          '"Hind"',
          'sans-serif',
        ],
        condensed: [
          '"Barlow Condensed"',
          '"DIN Alternate"',
          '"Franklin Gothic Medium"',
          'sans-serif',
        ],
        signboard: [
          '"BIZ UDPGothic"',
          '"M PLUS 1"',
          '"Hiragino Kaku Gothic ProN"',
          '"Hiragino Sans"',
          'sans-serif',
        ],
        sans: [
          '"BIZ UDPGothic"',
          '"M PLUS 1"',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          '"Hiragino Kaku Gothic ProN"',
          '"Hiragino Sans"',
          'Meiryo',
          'sans-serif',
        ],
      },
      boxShadow: {
        'glass': '0 10px 30px rgba(22, 49, 67, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.64)',
        'glass-lg': '0 20px 54px rgba(22, 49, 67, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.72)',
        'glass-card': '0 8px 24px rgba(22, 49, 67, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.65)',
        'glass-sm': '0 4px 14px rgba(22, 49, 67, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.7)',
      },
      borderRadius: {
        'sheet': '28px',
      },
    },
  },
  plugins: [],
}
