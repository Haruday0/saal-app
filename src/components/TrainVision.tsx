import React from 'react';
import { Station, DepartureTrain } from '../types';
import {
  JisStairs,
  JisEscalator,
  JisElevator,
  JisTicketGate,
  JisRestroom,
  JisBaggage,
  JisTrain,
  JisAirplane,
  JisBus,
} from './icons';

interface TrainVisionProps {
  station: Station;
  selectedTrain: DepartureTrain | null;
}

export const TrainVision: React.FC<TrainVisionProps> = ({
  station,
  selectedTrain,
}) => {
  const totalCars = selectedTrain?.cars || 4;
  const direction = selectedTrain?.direction || 'up';
  const platform = station.platforms[direction];

  const destinationText = selectedTrain
    ? `${selectedTrain.destination} ゆき`
    : direction === 'up'
    ? '仙台空港 ゆき'
    : '仙台 ゆき';

  // 進行方向が左（←）の場合、左から奥の号車（4, 3, 2, 1）の順に並ぶ
  const carNumbers = Array.from({ length: totalCars }, (_, i) => totalCars - i);

  // 乗換先一覧
  const transfers = station.transfers || [];
  const hasTransfers = transfers.length > 0;

  // -------- SVGレイアウト定数 (640 × 190) --------
  const svgW = 640;
  const svgH = 190;

  // 列車ブロック領域
  const trainAreaLeft = 95;
  const trainAreaRight = svgW - 25;
  const trainAreaWidth = trainAreaRight - trainAreaLeft;
  const carGap = 5;
  const blockW = (trainAreaWidth - carGap * (totalCars - 1)) / totalCars;
  const blockH = 32;
  const trainY = 126;

  // ホーム上面（遠近台形）
  const platformTopY = 46;
  const platformBottomY = 120;

  // 設備アイコンのX座標計算
  const getIconX = (carNumber: number, doorNumber: number): number => {
    const carIdx = carNumbers.indexOf(carNumber);
    if (carIdx < 0) return svgW / 2;
    const carLeft = trainAreaLeft + carIdx * (blockW + carGap);
    // ドア位置: 1=左寄り, 2=中央, 3=右寄り
    const doorRatio = (doorNumber - 1) / 2;
    return carLeft + blockW * 0.18 + blockW * 0.64 * doorRatio;
  };

  return (
    <div className="w-full font-sans select-none">
      {/* 車内モニター（トレインビジョン）本体 */}
      <div className="w-full aspect-[16/9] bg-white rounded-xl border border-white/80 dark:border-slate-700/80 shadow-xs overflow-hidden flex flex-col justify-between relative">
        {/* ================= 上段：ヘッダー表示 ================= */}
        <div className="relative pt-2.5 px-3.5 shrink-0">
          <div className="flex items-center justify-between">
            {/* 左上: 行先 */}
            <div className="shrink-0 w-1/3 text-left">
              <span className="text-[11px] sm:text-xs font-bold text-slate-800 tracking-wide inline-block pb-0.5 border-b-[1.5px] border-slate-800">
                {destinationText}
              </span>
            </div>

            {/* 中央: 駅名（大きく・字間広め） */}
            <div className="flex-1 flex justify-center -mt-0.5">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-[0.2em] leading-tight pl-2">
                {station.name}
              </h2>
            </div>

            {/* 右上: 両数表示（号車番号ではなく編成両数） */}
            <div className="shrink-0 w-1/3 flex justify-end items-center">
              <span className="text-[11px] sm:text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-english tabular-nums">
                {totalCars}両編成
              </span>
            </div>
          </div>

          {/* 水色アクセントライン（画面横幅いっぱいにすっと引かれたライン） */}
          <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-[#0085ca] to-transparent mt-1.5" />
        </div>

        {/* ================= 中段：立体ホーム＆列車アイソメトリックSVG ================= */}
        <div className="flex-1 relative w-full flex items-center justify-center px-2 min-h-0 overflow-hidden">
          <svg
            viewBox={`0 0 ${svgW} ${svgH}`}
            className="w-full h-full"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {/* ホーム上面グラデーション */}
              <linearGradient id="tvPlatformTop" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#d5dbe4" />
                <stop offset="100%" stopColor="#c0c9d4" />
              </linearGradient>
              {/* ホーム側面 */}
              <linearGradient id="tvPlatformSide" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#98a4b3" />
                <stop offset="100%" stopColor="#818e9d" />
              </linearGradient>
              {/* 車両グラデーション */}
              <linearGradient id="tvCarDefault" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#f8fafc" />
                <stop offset="100%" stopColor="#e2e8f0" />
              </linearGradient>
              {/* ピクト看板のシャドウ */}
              <filter id="tvShadow" x="-10%" y="-10%" width="120%" height="125%">
                <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodOpacity="0.15" />
              </filter>
            </defs>

            {/* 1. ホーム上面（遠近台形） */}
            <polygon
              points={`
                ${trainAreaLeft - 50},${platformTopY}
                ${trainAreaRight + 20},${platformTopY}
                ${trainAreaRight + 32},${platformBottomY}
                ${trainAreaLeft - 62},${platformBottomY}
              `}
              fill="url(#tvPlatformTop)"
              stroke="#a9b4c2"
              strokeWidth="0.8"
            />

            {/* ホーム手前側面（厚み） */}
            <rect
              x={trainAreaLeft - 62}
              y={platformBottomY}
              width={trainAreaRight - trainAreaLeft + 94}
              height={6}
              fill="url(#tvPlatformSide)"
            />

            {/* 点字ブロック（黄色破線警告ライン） */}
            <line
              x1={trainAreaLeft - 56}
              y1={platformBottomY - 4}
              x2={trainAreaRight + 27}
              y2={platformBottomY - 4}
              stroke="#d9a31a"
              strokeWidth="2.5"
              strokeDasharray="7 3"
            />

            {/* 2. ホーム上の設備アイコン（JIS Z 8210 案内用図記号・すべて黒色 #000000） */}
            {platform.facilities.map((fac) => {
              const cx = getIconX(fac.carNumber, fac.doorNumber);
              const iconSize = 28;
              const iconX = cx - iconSize / 2;
              const iconY = platformTopY + 15;

              const renderJisIcon = () => {
                switch (fac.type) {
                  case 'stairs':
                    return <JisStairs size={19} direction="up" color="#000000" />;
                  case 'escalator':
                    return (
                      <JisEscalator
                        size={19}
                        direction={fac.direction === 'down' ? 'down' : 'up'}
                        color="#000000"
                      />
                    );
                  case 'elevator':
                    return <JisElevator size={19} color="#000000" />;
                  case 'gate':
                    return <JisTicketGate size={19} color="#000000" />;
                  case 'restroom':
                    return <JisRestroom size={19} color="#000000" />;
                  default:
                    return <JisElevator size={19} color="#000000" />;
                }
              };

              return (
                <foreignObject
                  key={fac.id}
                  x={iconX}
                  y={iconY}
                  width={iconSize}
                  height={iconSize}
                >
                  <div className="w-full h-full bg-white rounded-md shadow-xs border border-slate-300 flex items-center justify-center">
                    {renderJisIcon()}
                  </div>
                </foreignObject>
              );
            })}

            {/* 3. 線路（手前のレールと枕木） */}
            <g>
              {Array.from({ length: 48 }, (_, i) => (
                <line
                  key={`rail-sleeper-${i}`}
                  x1={trainAreaLeft - 55 + i * 12.5}
                  y1={trainY + blockH + 5}
                  x2={trainAreaLeft - 50 + i * 12.5}
                  y2={trainY + blockH + 20}
                  stroke="#c5ced8"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
              ))}
              <line x1={trainAreaLeft - 60} y1={trainY + blockH + 10} x2={trainAreaRight + 30} y2={trainY + blockH + 10} stroke="#94a3b8" strokeWidth="1.8" />
              <line x1={trainAreaLeft - 60} y1={trainY + blockH + 16} x2={trainAreaRight + 30} y2={trainY + blockH + 16} stroke="#94a3b8" strokeWidth="1.8" />
            </g>

            {/* 4. 手前の列車（3Dブロック直方体・号車番号なし） */}
            {carNumbers.map((carNum, idx) => {
              const x = trainAreaLeft + idx * (blockW + carGap);
              const y = trainY;
              const topDepth = 7;
              const isFront = idx === 0;

              return (
                <g
                  key={`train-car-${idx}`}
                  filter="url(#tvShadow)"
                >
                  {/* 上面 */}
                  <polygon
                    points={`${x},${y} ${x + topDepth},${y - topDepth} ${x + blockW + topDepth},${y - topDepth} ${x + blockW},${y}`}
                    fill="#edf2f7"
                    stroke="#b2bcc8"
                    strokeWidth="0.6"
                  />
                  {/* 右側面 */}
                  <polygon
                    points={`${x + blockW},${y} ${x + blockW + topDepth},${y - topDepth} ${x + blockW + topDepth},${y + blockH - topDepth} ${x + blockW},${y + blockH}`}
                    fill="#8894a2"
                    stroke="#8894a2"
                    strokeWidth="0.6"
                  />
                  {/* 正面 */}
                  <rect
                    x={x}
                    y={y}
                    width={blockW}
                    height={blockH}
                    rx="1.5"
                    fill="url(#tvCarDefault)"
                    stroke="#8894a2"
                    strokeWidth="1"
                  />

                  {/* 車体アクセント帯（アクセス線ブルー ＆ グリーンライン） */}
                  <rect
                    x={x}
                    y={y + blockH * 0.7}
                    width={blockW}
                    height={2.2}
                    fill="#0085ca"
                  />
                  <rect
                    x={x}
                    y={y + blockH * 0.78}
                    width={blockW}
                    height={1.6}
                    fill="#00a651"
                  />

                  {/* 窓・ドア表現（号車番号数字の代わりに窓を配置） */}
                  <rect
                    x={x + blockW * 0.22}
                    y={y + 5}
                    width={blockW * 0.22}
                    height={blockH * 0.4}
                    rx="1"
                    fill="#334155"
                    opacity="0.8"
                  />
                  <rect
                    x={x + blockW * 0.56}
                    y={y + 5}
                    width={blockW * 0.22}
                    height={blockH * 0.4}
                    rx="1"
                    fill="#334155"
                    opacity="0.8"
                  />

                  {/* 先頭車のフロント乗務員室ガラス */}
                  {isFront && (
                    <rect
                      x={x + 3}
                      y={y + 4}
                      width={5}
                      height={blockH * 0.48}
                      rx="0.5"
                      fill="#0f172a"
                    />
                  )}

                  {/* 1号車（空港寄り）のJISピクトグラム設備マーク（多機能トイレ ＆ 大型荷物置場、黒色） */}
                  {carNum === 1 && (
                    <foreignObject x={x + (isFront ? 11 : 3)} y={y + 3} width={28} height={12}>
                      <div className="flex items-center gap-0.5 opacity-85 pointer-events-none">
                        <JisRestroom size={10} color="#000000" variant="accessible" />
                        <JisBaggage size={10} color="#000000" />
                      </div>
                    </foreignObject>
                  )}
                </g>
              );
            })}

            {/* 5. 進行方向の赤い立体矢印 (◀) */}
            <g transform={`translate(${trainAreaLeft - 36}, ${trainY + 5})`} filter="url(#tvShadow)">
              <polygon
                points="0,11 15,2 15,6 23,6 23,16 15,16 15,20"
                fill="#dc2626"
              />
              <polygon
                points="0,11 15,2 15,5 2,11"
                fill="#ef4444"
              />
            </g>
          </svg>
        </div>

        {/* ================= 下段：のりかえ Transfers（乗換がある駅のみ） ================= */}
        {hasTransfers && (
          <div className="border-t border-slate-200 px-3 py-1.5 flex items-center text-xs bg-white shrink-0">
            <div className="shrink-0 pr-2.5 mr-2.5 border-r border-slate-300">
              <span className="font-extrabold text-slate-800 text-xs leading-none block">のりかえ</span>
              <span className="text-[8px] text-slate-500 font-english leading-none block mt-0.5">Transfers</span>
            </div>

            <div className="flex-1 flex flex-wrap items-center gap-x-3.5 gap-y-0.5 overflow-x-auto">
              {transfers.map((item) => (
                <div key={item.id} className="flex items-center gap-1 shrink-0">
                  {item.type === 'subway_n' && (
                    <span className="w-4 h-4 rounded-full bg-[#00a651] text-white font-bold font-english text-[9px] flex items-center justify-center">N</span>
                  )}
                  {item.type === 'subway_t' && (
                    <span className="w-4 h-4 rounded-full bg-[#0085ca] text-white font-bold font-english text-[9px] flex items-center justify-center">T</span>
                  )}
                  {item.type === 'shinkansen' && (
                    <JisTrain size={14} color="#000000" />
                  )}
                  {item.type === 'jr' && (
                    <JisTrain size={14} color="#000000" />
                  )}
                  {item.type === 'plane' && (
                    <JisAirplane size={14} color="#000000" />
                  )}
                  {item.type === 'bus' && (
                    <JisBus size={14} color="#000000" />
                  )}
                  <div className="leading-tight">
                    <span className="font-bold text-slate-800 text-[10px]">{item.name}</span>
                    <span className="text-[7.5px] text-slate-500 font-english ml-1">{item.nameEn}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 画面下の方向表示 */}
      <div className="mt-1.5 px-2 flex justify-end text-[10px] text-slate-500">
        <span>
          {direction === 'up' ? '進行方向: 仙台空港方面 ◀' : '進行方向: 仙台方面 ◀'}
        </span>
      </div>
    </div>
  );
};
