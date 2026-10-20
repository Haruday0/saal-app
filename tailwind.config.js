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
        mono: ['"Courier New"', 'Courier', 'monospace'],
        sans: [
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
    },
  },
  plugins: [],
}
