import React, { useState } from 'react';
import { DepartureTrain, DirectionType } from '../types';
import { MOCK_DEPARTURES } from '../data/mockData';
import { Icon } from './Icon';
import { StationBoard } from './StationBoard';

interface LedDepartureBoardProps {
  stationId: string;
  selectedTrain: DepartureTrain | null;
  onSelectTrain: (train: DepartureTrain) => void;
}

export const LedDepartureBoard: React.FC<LedDepartureBoardProps> = ({
  stationId,
  selectedTrain,
  onSelectTrain,
}) => {
  const isNagamachiTaishido = stationId === 'nagamachi' || stationId === 'taishido';
  // 長町・太子堂では左側の1番線（下り）を初期選択
  const [direction, setDirection] = useState<DirectionType>(
    isNagamachiTaishido ? 'down' : 'up'
  );
  const [isFullTimetableOpen, setIsFullTimetableOpen] = useState(false);

  const departures = MOCK_DEPARTURES[stationId] || { up: [], down: [] };
  const trains = departures[direction] || [];

  return (
    <div className="rounded-xl overflow-hidden shadow-lg border border-slate-800">
      {/* のりば・方面切り替えタブ（長町・太子堂は左:1番線仙台方面、右:2番線空港白石方面） */}
      <div className="bg-slate-950 px-2 py-1.5">
        <div className="grid grid-cols-2 bg-slate-900/80 rounded-lg p-0.5">
          {/* 左側タブ: 1番線（下り） */}
          <button
            type="button"
            onClick={() => setDirection('down')}
            className={`py-1 rounded-md text-[11px] font-bold text-center transition-all ${
              direction === 'down'
                ? 'bg-[#0085ca] text-white shadow'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {isNagamachiTaishido ? '1番線' : '下り 仙台方面'}
          </button>

          {/* 右側タブ: 2番線（上り） */}
          <button
            type="button"
            onClick={() => setDirection('up')}
            className={`py-1 rounded-md text-[11px] font-bold text-center transition-all ${
              direction === 'up'
                ? 'bg-[#0085ca] text-white shadow'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {isNagamachiTaishido ? '2番線' : '上り 空港・白石方面'}
          </button>
        </div>
      </div>

      {/* LED盤面 — 黒背景に直置き、余白最小 */}
      <div className="bg-black px-1.5 py-1">
        {trains.length === 0 ? (
          <div className="text-center py-8 text-slate-600 font-led text-xs">
            本日の発車予定はありません
          </div>
        ) : (
          <StationBoard
            stationId={stationId}
            direction={direction}
            trains={trains}
            selectedTrain={selectedTrain}
            onSelectTrain={onSelectTrain}
          />
        )}
      </div>

      {/* 全時刻表 — 折りたたみ */}
      <button
        type="button"
        onClick={() => setIsFullTimetableOpen(!isFullTimetableOpen)}
        className="w-full py-1.5 bg-slate-950 hover:bg-slate-900 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-center gap-0.5 transition"
      >
        <span>全時刻表 {trains.length}本</span>
        <Icon
          name={isFullTimetableOpen ? 'expand_less' : 'expand_more'}
          size={16}
          className="text-slate-500"
        />
      </button>

      {isFullTimetableOpen && (
        <div className="bg-slate-950 px-1 pb-1 max-h-44 overflow-y-auto">
          {trains.map((train) => (
            <button
              key={train.id}
              type="button"
              onClick={() => onSelectTrain(train)}
              className={`w-full py-1 px-2 flex items-center justify-between rounded text-[11px] transition ${
                selectedTrain?.id === train.id
                  ? 'bg-slate-800 text-amber-400'
                  : 'text-slate-400 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-slate-200 w-[3.2em] text-right">
                  {train.departureTime}
                </span>
                <span className="text-slate-600">|</span>
                <span className="font-medium text-slate-300">
                  {train.destination}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-500 font-mono">
                <span>{train.track}番線</span>
                <span>{train.cars}両</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
