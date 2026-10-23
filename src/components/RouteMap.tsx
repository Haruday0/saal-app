import React, { useState, useEffect } from 'react';
import { Station, MovingTrain } from '../types';
import { STATIONS, INITIAL_MOVING_TRAINS } from '../data/mockData';
import { Icon } from './Icon';
import { JisTrain, JisSubway } from './icons';

interface RouteMapProps {
  selectedStationId: string | null;
  onSelectStation: (station: Station) => void;
}

export const RouteMap: React.FC<RouteMapProps> = ({
  selectedStationId,
  onSelectStation,
}) => {
  const [movingTrains, setMovingTrains] = useState<MovingTrain[]>(INITIAL_MOVING_TRAINS);

  // 列車位置のリアルタイム進行シミュレーション
  useEffect(() => {
    const timer = setInterval(() => {
      setMovingTrains((prev) =>
        prev.map((t) => {
          const next = t.progress + 0.04;
          if (next >= 1.0) {
            const stationIds = STATIONS.map((s) => s.id);
            const curIdx = stationIds.indexOf(t.currentStationId);
            const delta = t.direction === 'up' ? 1 : -1;
            const nextIdx = (curIdx + delta + stationIds.length) % stationIds.length;
            return {
              ...t,
              currentStationId: stationIds[nextIdx],
              progress: 0.0,
            };
          }
          return { ...t, progress: next };
        })
      );
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex-1 min-h-0 w-full max-w-md mx-auto px-2 sm:px-3 py-1 flex flex-col justify-between select-none overflow-hidden">
      
      {/* 運行情報ヘッダー ＆ 各列の案内（路線・上り・下り・駅名） */}
      <div className="shrink-0 mb-0.5">
        {/* 凡例 */}
        <div className="flex items-center justify-between pb-0.5 px-1 border-b border-slate-100 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0085ca]" />
              <span className="font-bold text-slate-800 text-[10px]">仙台空港アクセス線</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
              <span className="text-slate-500 text-[10px]">JR並走</span>
            </div>
          </div>
        </div>

        {/* 走行列ヘッダー */}
        <div className="flex items-center pt-0.5 px-1 text-[10px] font-bold text-slate-500">
          <div className="w-[68px] shrink-0 text-center text-slate-400">路線</div>
          <div className="w-[64px] shrink-0 flex items-center justify-center gap-0.5 text-sky-700 bg-sky-50/70 py-0.5 rounded-l border border-sky-100">
            <Icon name="arrow_upward" size={11} className="text-[#0085ca]" />
            <span>下り 仙台</span>
          </div>
          <div className="w-[64px] shrink-0 flex items-center justify-center gap-0.5 text-emerald-800 bg-emerald-50/70 py-0.5 rounded-r border-y border-r border-emerald-100">
            <Icon name="arrow_downward" size={11} className="text-[#10b981]" />
            <span>上り 空港</span>
          </div>
          <div className="flex-1 pl-3 text-slate-400 font-medium">駅名</div>
        </div>
      </div>

      {/* 路線ダイアグラム本体（スクロールなし・全8駅が画面下端まで完全均等フィット） */}
      <div className="relative flex-1 min-h-0 flex flex-col justify-between py-0.5 overflow-visible">
        {/* ================= 背景レールレイヤー（上から下まで絶対に途切れない完全連続SVG） ================= */}
        <svg
          className="absolute left-0 top-0 w-[68px] h-full pointer-events-none overflow-visible z-0"
          viewBox="0 0 68 800"
          preserveAspectRatio="none"
        >
          <defs>
            {/* 名取駅のJR線分岐フェードアウトグラデーション */}
            <linearGradient id="natoriBranchGradient" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="1" />
              <stop offset="55%" stopColor="#10b981" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* 1. 名取〜仙台間: 青と緑が極細の白い間を入れて1本の帯ストライプとして走る */}
          {/* （中心 X=50 が、駅ノードの中心 X=50 と100%完全一致） */}
          {/* 左: 緑線（JR東北本線・常磐線） */}
          <line
            x1="47.9"
            y1="50"
            x2="47.9"
            y2="440"
            stroke="#10b981"
            strokeWidth="3.0"
            vectorEffect="non-scaling-stroke"
          />

          {/* 2. 名取駅でのJR線（緑）分岐カーブ: 名取中心(X=47.9, Y=440)から左下へ滑らかに逃げてフェードアウト */}
          <path
            d="M 47.9 440 C 47.9 458, 28 476, 8 486"
            fill="none"
            stroke="url(#natoriBranchGradient)"
            strokeWidth="3.0"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />

          {/* 3. 仙台空港アクセス線（青）: 仙台〜名取〜仙台空港まで完全一本の連続レール */}
          {/* 仙台〜名取(Y=50〜438)はX=52.1で緑線と並走、名取駅ノード裏(Y=438〜452)でスムーズに中央X=50へ合流、名取〜空港はX=50で直通 */}
          <path
            d="M 52.1 50 L 52.1 438 C 52.1 445, 50 447, 50 452 L 50 750"
            fill="none"
            stroke="#0085ca"
            strokeWidth="3.2"
            vectorEffect="non-scaling-stroke"
          />

          {/* 4. 名取〜仙台空港間の単独区間（太さ強調の青レールオーバーレイ: X=50） */}
          <line
            x1="50"
            y1="452"
            x2="50"
            y2="750"
            stroke="#0085ca"
            strokeWidth="4.0"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {STATIONS.map((station) => {
          const isSelected = selectedStationId === station.id;
          const isNatori = station.id === 'natori'; // 名取（JR分岐）

          // この駅の上り列車・下り列車を抽出
          const upTrain = movingTrains.find(
            (t) => t.currentStationId === station.id && t.direction === 'up'
          );
          const downTrain = movingTrains.find(
            (t) => t.currentStationId === station.id && t.direction === 'down'
          );

          return (
            <div
              key={station.id}
              className="relative flex-1 min-h-0 flex items-stretch my-[1px] z-10"
            >
              {/* ================= 1. 駅シンボルノード（線の中心 X=50px と100%完全一致） ================= */}
              <div className="relative w-[68px] shrink-0 flex items-center">
                {/* 名取駅の分岐ラベル（本線・カーブ線・ノードと一切被らない左側クリアスペースに配置） */}
                {isNatori && (
                  <div className="absolute left-1 top-1/2 -translate-y-1/2 flex flex-col items-end pr-1 text-[#10b981] pointer-events-none z-20">
                    <span className="text-[7.5px] font-extrabold leading-none tracking-tight whitespace-nowrap">
                      東北本線
                    </span>
                    <span className="text-[7.5px] font-extrabold leading-none tracking-tight whitespace-nowrap mt-0.5">
                      常磐線 ↙
                    </span>
                  </div>
                )}

                {/* 駅シンボルノード（全8駅すべて完全に統一された白丸） */}
                <div className="absolute left-[50px] -translate-x-1/2 z-10 flex items-center justify-center">
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-[#0085ca] bg-white shadow-xs" />
                </div>
              </div>

              {/* ================= 2. 下り列車走行列（仙台方面・幅 64px） ================= */}
              <div className="relative w-[64px] shrink-0 flex items-center justify-center px-1">
                {/* 走行ガイドライン（背景薄線） */}
                <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-[1px] bg-slate-100 pointer-events-none" />

                {downTrain && (
                  <div
                    className={`relative z-10 w-full flex items-center justify-center gap-0.5 py-0.5 px-0.5 rounded-md border shadow-2xs text-[9px] font-bold animate-pulse ${
                      downTrain.line === 'saal'
                        ? 'bg-sky-50 border-sky-200 text-sky-950'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    }`}
                  >
                    <Icon
                      name="arrow_upward"
                      size={10}
                      className={downTrain.line === 'saal' ? 'text-[#0085ca] shrink-0' : 'text-[#10b981] shrink-0'}
                    />
                    <span className="truncate">{downTrain.destination}</span>
                    <span className="text-[8.5px] opacity-75 font-mono shrink-0">{downTrain.cars}両</span>
                  </div>
                )}
              </div>

              {/* ================= 3. 上り列車走行列（空港・東京方面・幅 64px） ================= */}
              <div className="relative w-[64px] shrink-0 flex items-center justify-center px-1">
                {/* 走行ガイドライン（背景薄線） */}
                <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-[1px] bg-slate-100 pointer-events-none" />

                {upTrain && (
                  <div className="relative z-10 w-full flex items-center justify-center gap-0.5 py-0.5 px-0.5 rounded-md bg-sky-50 border border-sky-200 shadow-2xs text-[9px] font-bold text-sky-950 animate-pulse">
                    <Icon name="arrow_downward" size={10} className="text-[#0085ca] shrink-0" />
                    <span className="truncate">{upTrain.destination}</span>
                    <span className="text-[8.5px] opacity-75 font-mono shrink-0">{upTrain.cars}両</span>
                  </div>
                )}
              </div>

              {/* ================= 4. 駅名 ＆ 接続情報ボタン ================= */}
              <button
                type="button"
                onClick={() => onSelectStation(station)}
                className={`flex-1 min-h-0 flex items-center justify-between px-2.5 py-0.5 rounded-lg transition-all duration-100 text-left border ml-1 ${
                  isSelected
                    ? 'bg-sky-50 border-[#0085ca] shadow-xs'
                    : 'bg-white border-slate-100 hover:border-slate-200 active:bg-slate-50'
                }`}
              >
                {/* 駅名 */}
                <div className="min-w-0 pr-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-extrabold text-[15px] sm:text-base text-slate-900 tracking-tight shrink-0">
                      {station.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono hidden xs:inline truncate">
                      {station.nameEn}
                    </span>
                  </div>

                  {/* 特徴タグ（新幹線・地下鉄の乗り換えのみ表示・JISピクトグラム付き） */}
                  {(station.id === 'sendai' || station.id === 'nagamachi') && (
                    <div className="flex items-center gap-1 mt-0.5">
                      {station.id === 'sendai' && (
                        <span className="text-[9px] text-slate-600 bg-slate-100 px-1 py-0.2 rounded font-medium flex items-center gap-0.5">
                          <JisTrain size={10} color="#475569" />
                          <span>新幹線・地下鉄</span>
                        </span>
                      )}
                      {station.id === 'nagamachi' && (
                        <span className="text-[9px] text-emerald-800 bg-emerald-50 px-1 py-0.2 rounded font-medium flex items-center gap-0.5">
                          <JisSubway size={10} color="#047857" />
                          <span>地下鉄</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* 詳細矢印 */}
                <Icon
                  name="chevron_right"
                  size={16}
                  className={`text-slate-300 shrink-0 transition-transform ${
                    isSelected ? 'rotate-90 text-[#0085ca]' : ''
                  }`}
                />
              </button>

            </div>
          );
        })}
      </div>

    </div>
  );
};
