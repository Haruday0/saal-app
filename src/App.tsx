import React, { useState } from 'react';
import { Station } from './types';
import { Header } from './components/Header';
import { RouteMap } from './components/RouteMap';
import { StationDetailSheet } from './components/StationDetailSheet';
import { TrainDetailSheet } from './components/TrainDetailSheet';
import { DebugControlPanel } from './components/DebugControlPanel';
import { useDebug } from './context/DebugContext';

export const App: React.FC = () => {
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [selectedTrainId, setSelectedTrainId] = useState<string | null>(null);
  const { now } = useDebug();

  return (
    <div
      className="fixed inset-0 w-full h-full flex flex-col font-sans overflow-hidden select-none overscroll-none"
      style={{ backgroundColor: 'var(--mantine-color-body)', color: 'var(--mantine-color-text)' }}
    >
      {/* 上部固定ヘッダー */}
      <Header />

      {/* デバッグモード（?debug=1）時のみ表示されるヘッダー直下デバッグパネル */}
      <DebugControlPanel variant="header" />

      {/* メイン路線図エリア（画面下端までスクロールなしで1画面完全均等フィット） */}
      <main className="flex-1 min-h-0 w-full flex flex-col overflow-hidden">
        <RouteMap
          selectedStationId={selectedStation?.id || null}
          onSelectStation={setSelectedStation}
          onSelectTrain={(train) => setSelectedTrainId(train.id)}
          now={now}
        />
      </main>

      {/* 駅詳細パネル（駅タップで下から開くボトムシート） */}
      <StationDetailSheet
        station={selectedStation}
        onClose={() => setSelectedStation(null)}
      />

      {/* 列車詳細パネル（電車タップで下から開くボトムシート） */}
      <TrainDetailSheet
        trainId={selectedTrainId}
        onClose={() => setSelectedTrainId(null)}
        onSelectStation={(station) => {
          setSelectedTrainId(null);
          setSelectedStation(station);
        }}
      />
    </div>
  );
};

export default App;
