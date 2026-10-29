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

const theme = createTheme({
  primaryColor: 'saal',
  primaryShade: { light: 6, dark: 4 },
  colors: { saal },
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
