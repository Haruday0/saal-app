import React from 'react';
import ReactDOM from 'react-dom/client';
import '@mantine/core/styles.css';
import { createTheme, MantineProvider, MantineColorsTuple } from '@mantine/core';
import App from './App';
import './index.css';

// 仙台空港アクセス線 公式ラインカラー #2A5CAA を基準とした10階調パレット
const saal: MantineColorsTuple = [
  '#eaf0fa',
  '#d3def2',
  '#a6bde5',
  '#759ad8',
  '#4d7dcd',
  '#3569c3',
  '#2A5CAA',
  '#224c8f',
  '#1a3c73',
  '#122b55',
];

// ダークテーマ用パレット（グレー寄りのMantine標準ではなく、紺系スレートで統一）
// [0]本文 [2]補助文字 [4]境界線 [5]ホバー [6]defaultボタン/入力 [7]背景(body) [8]最背面
const dark: MantineColorsTuple = [
  '#e2e8f0',
  '#cbd5e1',
  '#94a3b8',
  '#64748b',
  '#3b4a61',
  '#2a3649',
  '#1e293b',
  '#111827',
  '#0b1120',
  '#060a14',
];

const theme = createTheme({
  primaryColor: 'saal',
  primaryShade: { light: 6, dark: 4 },
  colors: { saal, dark },
  fontFamily: '"BIZ UDPGothic", "M PLUS 1", system-ui, sans-serif',
  defaultRadius: 'md',
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <App />
    </MantineProvider>
  </React.StrictMode>
);
