import React, { useState } from 'react';
import { Station } from './types';
import { Header } from './components/Header';
import { RouteMap } from './components/RouteMap';
import { StationDetailSheet } from './components/StationDetailSheet';

export const App: React.FC = () => {
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);

  return (
    <div
      className="fixed inset-0 w-full h-full flex flex-col font-sans overflow-hidden select-none overscroll-none"
      style={{ backgroundColor: 'var(--mantine-color-body)', color: 'var(--mantine-color-text)' }}
    >
      {/* 上部固定ヘッダー */}
      <Header />

      {/* メイン路線図エリア（画面下端までスクロールなしで1画面完全均等フィット） */}
      <main className="flex-1 min-h-0 w-full flex flex-col overflow-hidden">
        <RouteMap
          selectedStationId={selectedStation?.id || null}
          onSelectStation={setSelectedStation}
        />
      </main>

      {/* 駅詳細パネル（タップで下から開くボトムシート） */}
      <StationDetailSheet
        station={selectedStation}
        onClose={() => setSelectedStation(null)}
      />
    </div>
  );
};

export default App;
