import React, { useMemo } from 'react';
import { DepartureTrain, DirectionType } from '../types';
import { getDestinationLedColor, LedColor } from '../config/trainLineRules';
import { DotLedBitmap, getDestinationDots } from './DotLedBitmap';
import { DotLedText, formatDepartureTime, hasDotFont } from './DotLedText';
import stationLedData from '../data/stationLedData.json';

export interface LedSlotDefinition {
  name: string;
  role?: 'type' | 'cars' | 'time' | 'dest' | 'track' | 'space';
  part?: string;
  width: number;
  color?: string;
}

export interface LedSlotRowProps {
  train: DepartureTrain;
  stationId: string;
  direction?: DirectionType;
  track?: string;
  typeColor?: LedColor;
  carsColor?: LedColor;
  timeColor?: LedColor;
  trackColor?: LedColor;
  isSelected?: boolean;
  onClick?: () => void;
  aspectRatio?: string; // 例: '10/1', '16/1'
  className?: string;
}

const LED_COLOR_MAP: Record<LedColor, string> = {
  amber: 'text-[#f59e0b]',
  green: 'text-[#00e676]',
  red: 'text-[#ef4444]',
  white: 'text-[#ffffff]',
};

function toFW(n: number | string): string {
  const s = String(n);
  const fw = ['０', '１', '２', '３', '４', '５', '６', '７', '８', '９'];
  return s.split('').map((c) => (c >= '0' && c <= '9' ? fw[parseInt(c, 10)] : c)).join('');
}

/**
 * stationLedData.json の slots 定義に基づき、1行を完全データ駆動で描画するコンポーネント
 */
export const LedSlotRow: React.FC<LedSlotRowProps> = ({
  train,
  stationId,
  direction = 'up',
  track,
  typeColor = 'amber',
  carsColor = 'red',
  timeColor = 'green',
  trackColor = 'green',
  aspectRatio,
  className = '',
}) => {
  const cleanDest = train.destination.trim();
  const destColor = getDestinationLedColor(stationId, train.direction || direction, train.line, train.destination);

  // stationLedData からスロット定義を取得
  const slots: LedSlotDefinition[] = useMemo(() => {
    const sysKey = stationId === 'minami-sendai' ? 'minami-sendai' : stationId;
    const sysData = (stationLedData as any)[sysKey];
    if (!sysData) return [];

    // 南仙台で「仙台空港」行き（4文字）の時のみ、96dot特例スロットを採用
    if (stationId === 'minami-sendai' && cleanDest === '仙台空港' && sysData.slots_saal) {
      return sysData.slots_saal;
    }

    return sysData.slots || [];
  }, [stationId, cleanDest, train.line]);

  // CSS Grid Template Columns (各スロットの幅を fr として結合)
  const gridTemplate = useMemo(() => {
    if (!slots || slots.length === 0) return undefined;
    return slots.map((s) => `${s.width}fr`).join(' ');
  }, [slots]);

  if (!slots || slots.length === 0 || !gridTemplate) {
    return null; // スロット未定義時は親側でフォールバック
  }

  const effectiveTrack = track || train.track || (direction === 'up' ? '1' : '2');

  return (
    <div
      style={{ gridTemplateColumns: gridTemplate }}
      className={`w-full font-bold leading-none grid items-center whitespace-nowrap rounded-none cursor-default ${
        aspectRatio ? `aspect-[${aspectRatio}]` : ''
      } ${className}`}
    >
      {slots.map((slot, idx) => {
        const key = `slot-${idx}-${slot.name}`;

        // 1. 種別 (type)
        if (slot.role === 'type') {
          const typeDots = getDestinationDots(stationId, train.trainType);
          return (
            <div key={key} className={`h-full w-full flex items-center justify-center p-0 overflow-hidden ${LED_COLOR_MAP[typeColor]}`}>
              {typeDots ? (
                <DotLedBitmap dots={typeDots} className="h-full w-full block" preserveAspectRatio="xMidYMid meet" ariaLabel={train.trainType} />
              ) : (
                <div className="w-full h-full flex items-center justify-around px-0.5 font-led text-[20px]">
                  <span>{train.trainType[0] ?? '普'}</span>
                  <span>{train.trainType[1] ?? '通'}</span>
                </div>
              )}
            </div>
          );
        }

        // 2. 両数 (cars)
        if (slot.role === 'cars') {
          const carsText = `${train.cars}両`;
          const carsDots = getDestinationDots(stationId, carsText);
          return (
            <div key={key} className={`h-full w-full flex items-center justify-center p-0 overflow-hidden ${LED_COLOR_MAP[carsColor]}`}>
              {carsDots ? (
                <DotLedBitmap dots={carsDots} className="h-full w-full block" preserveAspectRatio="xMidYMid meet" ariaLabel={carsText} />
              ) : (
                <div className="w-full grid grid-cols-2 text-center text-[20px] font-led">
                  <span>{toFW(train.cars)}</span>
                  <span>両</span>
                </div>
              )}
            </div>
          );
        }

        // 3. 発車時刻 (time)
        if (slot.role === 'time') {
          return (
            <div key={key} className={`h-full w-full flex items-center justify-center p-0 overflow-hidden ${LED_COLOR_MAP[timeColor]}`}>
              {hasDotFont(stationId, train.departureTime) ? (
                <DotLedText text={train.departureTime} stationId={stationId} className="h-full w-full block" preserveAspectRatio="xMidYMid meet" />
              ) : (
                <span className="text-right pr-0.5 tracking-normal whitespace-pre text-[20px] font-led font-bold leading-none">
                  {formatDepartureTime(train.departureTime)}
                </span>
              )}
            </div>
          );
        }

        // 4. 行先 (dest)
        if (slot.role === 'dest') {
          const customDots = getDestinationDots(stationId, cleanDest);
          return (
            <div key={key} className={`h-full w-full flex items-center justify-center p-0 overflow-hidden ${LED_COLOR_MAP[destColor]}`}>
              {customDots ? (
                <DotLedBitmap dots={customDots} className="h-full w-full block" preserveAspectRatio="xMidYMid meet" ariaLabel={cleanDest} />
              ) : cleanDest.length === 2 ? (
                <div className="w-full text-center text-[21px] font-led font-bold leading-none tracking-normal">
                  <span>{cleanDest[0]}　{cleanDest[1]}</span>
                </div>
              ) : (
                <div className="w-full text-center text-[21px] font-led font-bold leading-none">
                  <span>{cleanDest}</span>
                </div>
              )}
            </div>
          );
        }

        // 5. 番線 (track)
        if (slot.role === 'track') {
          return (
            <div key={key} className={`h-full w-full flex items-center justify-center p-0 overflow-hidden ${LED_COLOR_MAP[trackColor]}`}>
              {hasDotFont(stationId, effectiveTrack) ? (
                <DotLedText text={effectiveTrack} stationId={stationId} className="h-full w-full block" preserveAspectRatio="xMidYMid meet" />
              ) : (
                <span className="text-center text-[20px] font-led font-bold leading-none">{effectiveTrack}</span>
              )}
            </div>
          );
        }

        // 6. 余白 / 空白 (space)
        return <div key={key} className="h-full w-full" />;
      })}
    </div>
  );
};
