import React, { useState, useEffect } from 'react';
import { Station, DepartureTrain } from '../types';
import { MOCK_DEPARTURES } from '../data/mockData';
import { LedDepartureBoard } from './LedDepartureBoard';
import { TrainVision } from './TrainVision';
import { TransferGuide } from './TransferGuide';
import { FareTable } from './FareTable';
import { Icon } from './Icon';

interface StationDetailSheetProps {
  station: Station | null;
  onClose: () => void;
}

export const StationDetailSheet: React.FC<StationDetailSheetProps> = ({
  station,
  onClose,
}) => {
  const [activeStation, setActiveStation] = useState<Station | null>(station);
  const [isClosing, setIsClosing] = useState(false);
  const [selectedTrain, setSelectedTrain] = useState<DepartureTrain | null>(null);

  // 駅が切り替わったときの処理
  useEffect(() => {
    if (station) {
      setActiveStation(station);
      setIsClosing(false);
      const departures = MOCK_DEPARTURES[station.id];
      if (departures?.up?.length) {
        setSelectedTrain(departures.up[0]);
      } else if (departures?.down?.length) {
        setSelectedTrain(departures.down[0]);
      } else {
        setSelectedTrain(null);
      }
    } else {
      setActiveStation(null);
      setIsClosing(false);
    }
  }, [station]);

  // Material 3 準拠のアニメーション付き閉じる処理
  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    // M3 Emphasized Accelerate の終了（260ms）に合わせてアンマウント
    setTimeout(() => {
      onClose();
      setActiveStation(null);
      setIsClosing(false);
    }, 250);
  };

  if (!activeStation) return null;

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end pt-[calc(env(safe-area-inset-top,0px)+3.5rem)]">
      {/* 背景オーバーレイ（M3 Scrim フェードイン・アウト） */}
      <div
        className={`fixed inset-0 bg-black/45 backdrop-blur-[2px] ${
          isClosing ? 'm3-scrim-exit' : 'm3-scrim-enter'
        }`}
        onClick={handleClose}
      />

      {/* ボトムシート（URLバー被りを防ぐ安全マージン確保・M3 Emphasized スライドアップ・ダウン） */}
      <div
        className={`relative z-50 w-full max-w-md mx-auto bg-slate-100 rounded-t-3xl shadow-2xl flex flex-col max-h-[78vh] max-h-[calc(100dvh-5.5rem)] border-t border-slate-300 ${
          isClosing ? 'm3-sheet-exit' : 'm3-sheet-enter'
        }`}
      >
        {/* シートヘッダー */}
        <div className="pt-2 pb-3 px-4 bg-white rounded-t-3xl border-b border-slate-200/90 shrink-0">
          {/* ドラッグハンドルバー */}
          <div
            onClick={handleClose}
            className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-2.5 cursor-pointer hover:bg-slate-400 transition-colors"
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {/* 駅アイコン（全駅統一） */}
              <div className="w-8 h-8 rounded-full bg-sky-50 border border-sky-200 text-[#0085ca] flex items-center justify-center shrink-0 shadow-2xs">
                <div className="w-4 h-4 rounded-full border-2 border-[#0085ca] bg-white" />
              </div>

              <div>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    {activeStation.name}駅
                  </h2>
                  <span className="text-xs text-slate-400 font-normal">
                    {activeStation.nameKana}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono">
                  {activeStation.nameEn} Station
                </p>
              </div>
            </div>

            {/* 閉じるボタン */}
            <button
              type="button"
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-500 flex items-center justify-center transition-colors"
              aria-label="閉じる"
            >
              <Icon name="close" size={18} />
            </button>
          </div>
        </div>

        {/* コンテンツ領域 */}
        <div className="p-3.5 overflow-y-auto space-y-4">
          {/* ① 発車案内（LED電光掲示板） */}
          <section>
            <div className="text-xs font-bold text-slate-700 mb-1.5 px-0.5">
              発車案内（LED標）
            </div>
            <LedDepartureBoard
              stationId={activeStation.id}
              selectedTrain={selectedTrain}
              onSelectTrain={setSelectedTrain}
            />
          </section>

          {/* ② トレインビジョン（階段・改札・EV案内） */}
          <section>
            <div className="text-xs font-bold text-slate-700 mb-1.5 px-0.5">
              車内モニター風 階段・改札口案内
            </div>
            <TrainVision
              station={activeStation}
              selectedTrain={selectedTrain}
            />
          </section>

          {/* ③ 乗り換え案内 */}
          <section>
            <div className="text-xs font-bold text-slate-700 mb-1.5 px-0.5">
              接続路線・バス
            </div>
            <TransferGuide station={activeStation} />
          </section>

          {/* ④ 運賃一覧 */}
          <section className="pb-4">
            <div className="text-xs font-bold text-slate-700 mb-1.5 px-0.5">
              きっぷ・IC運賃表
            </div>
            <FareTable currentStation={activeStation} />
          </section>
        </div>
      </div>
    </div>
  );
};
