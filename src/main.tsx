import React from 'react';
import ReactDOM from 'react-dom/client';
import '@mantine/core/styles.css';
import { createTheme, MantineProvider, MantineColorsTuple } from '@mantine/core';
import App from './App';
import './index.css';
import { MANTINE_LINE_PALETTES } from './config/trainLineRules';
import { DebugProvider } from './context/DebugContext';

// 各路線の公式カラーに基づく Mantine 10階調パレット
const saal = MANTINE_LINE_PALETTES.saal as unknown as MantineColorsTuple;
const tohoku = MANTINE_LINE_PALETTES.tohoku as unknown as MantineColorsTuple;
const joban = MANTINE_LINE_PALETTES.joban as unknown as MantineColorsTuple;

const theme = createTheme({
  primaryColor: 'saal',
  primaryShade: { light: 6, dark: 4 },
  colors: {
    saal,
    tohoku,
    joban,
  },
  fontFamily: '"BIZ UDPGothic", "M PLUS 1", system-ui, sans-serif',
  defaultRadius: 'md',
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <DebugProvider>
        <App />
      </DebugProvider>
    </MantineProvider>
  </React.StrictMode>
);
