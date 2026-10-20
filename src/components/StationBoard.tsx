import React, { useMemo } from 'react';
import { DepartureTrain, DirectionType } from '../types';
import {
  getDestinationLedColor,
  getStationThemeColors,
  LedColor,
} from '../config/trainLineRules';

export interface StationBoardProps {
  trains: DepartureTrain[];
  selectedTrain: DepartureTrain | null;
  onSelectTrain: (train: DepartureTrain) => void;
  stationId?: string;
  direction?: DirectionType;
  track?: string;
  noticeText?: string;
}

export const LED_COLOR_CLASSES: Record<LedColor, string> = {
  amber: 'text-[#f59e0b] drop-shadow-[0_0_3px_rgba(245,158,11,0.4)]',
  green: 'text-[#22c55e] drop-shadow-[0_0_3px_rgba(34,197,94,0.4)]',
  red: 'text-[#ef4444] drop-shadow-[0_0_3px_rgba(239,68,68,0.4)]',
  white: 'text-[#f0f4f8] drop-shadow-[0_0_3px_rgba(240,244,248,0.4)]',
};

export type BoardLayoutType =
  | 'jr-sendai'
  | 'jr-nagamachi-taishido'
  | 'jr-minami-sendai-1'
  | 'jr-minami-sendai-2'
  | 'jr-natori'
  | 'sat-common';

export interface TrackLedTheme {
  layout: BoardLayoutType;
  typeColor: LedColor;
  carsColor: LedColor;
  timeColor: LedColor;
  trackColor?: LedColor;
}

export const STATION_TRACK_THEMES: Record<string, Record<string, TrackLedTheme>> = {
  sendai: {
    default: { layout: 'jr-sendai', typeColor: 'amber', carsColor: 'amber', timeColor: 'green' },
  },
  nagamachi: {
    '1': { layout: 'jr-nagamachi-taishido', typeColor: 'green', carsColor: 'green', timeColor: 'green' },
    '2': { layout: 'jr-nagamachi-taishido', typeColor: 'green', carsColor: 'green', timeColor: 'green' },
    default: { layout: 'jr-nagamachi-taishido', typeColor: 'green', carsColor: 'green', timeColor: 'green' },
  },
  taishido: {
    '1': { layout: 'jr-nagamachi-taishido', typeColor: 'green', carsColor: 'green', timeColor: 'green' },
    '2': { layout: 'jr-nagamachi-taishido', typeColor: 'green', carsColor: 'green', timeColor: 'green' },
    default: { layout: 'jr-nagamachi-taishido', typeColor: 'green', carsColor: 'green', timeColor: 'green' },
  },
  'minami-sendai': {
    '1': { layout: 'jr-minami-sendai-1', typeColor: 'red', carsColor: 'red', timeColor: 'green', trackColor: 'green' },
    '2': { layout: 'jr-minami-sendai-2', typeColor: 'red', carsColor: 'red', timeColor: 'green' },
    default: { layout: 'jr-minami-sendai-1', typeColor: 'red', carsColor: 'red', timeColor: 'green', trackColor: 'green' },
  },
  natori: {
    '1': { layout: 'jr-natori', typeColor: 'green', carsColor: 'green', timeColor: 'green' },
    '2': { layout: 'jr-natori', typeColor: 'amber', carsColor: 'amber', timeColor: 'green' },
    '3': { layout: 'jr-natori', typeColor: 'amber', carsColor: 'amber', timeColor: 'green' },
    default: { layout: 'jr-natori', typeColor: 'green', carsColor: 'green', timeColor: 'green' },
  },
  morisekinoshita: {
    default: { layout: 'sat-common', typeColor: 'white', carsColor: 'white', timeColor: 'white' },
  },
  mitazono: {
    default: { layout: 'sat-common', typeColor: 'white', carsColor: 'white', timeColor: 'white' },
  },
  'sendai-airport': {
    default: { layout: 'sat-common', typeColor: 'white', carsColor: 'white', timeColor: 'white' },
  },
};

/* ── ユーティリティ ── */

function toFW(n: number): string {
  const d = ['０','１','２','３','４','５','６','７','８','９'];
  return String(n).split('').map(c => d[parseInt(c,10)] ?? c).join('');
}

/* ── サブコンポーネント（全て font-led 継承、font-mono 不使用） ── */

/** 行先セル — px幅で統一し改行を防止 */
const Dest: React.FC<{ text: string; box: 3 | 4; color: LedColor }> = ({ text, box, color }) => {
  const cls = `${LED_COLOR_CLASSES[color]} whitespace-nowrap`;
  const ch = Array.from(text.trim());

  if (box === 3) {
    if (ch.length === 2) return (
      <span className={`inline-grid grid-cols-3 w-[60px] text-center ${cls}`}>
        <span>{ch[0]}</span><span>　</span><span>{ch[1]}</span>
      </span>
    );
    if (ch.length === 3) return (
      <span className={`inline-grid grid-cols-3 w-[60px] text-center ${cls}`}>
        <span>{ch[0]}</span><span>{ch[1]}</span><span>{ch[2]}</span>
      </span>
    );
    return (
      <span className={`inline-flex justify-center w-[60px] overflow-hidden ${cls}`}>
        <span className="scale-x-[0.76] origin-center">{text}</span>
      </span>
    );
  }
  // 4文字枠（SAT）
  if (ch.length === 2) return (
    <span className={`inline-grid grid-cols-3 w-[80px] text-center ${cls}`}>
      <span>{ch[0]}</span><span>　</span><span>{ch[1]}</span>
    </span>
  );
  return (
    <span className={`inline-flex justify-center w-[80px] text-center ${cls}`}>
      {text}
    </span>
  );
};

/** 時刻セル — font-led統一、px幅固定 */
const Time: React.FC<{ t?: string; color: LedColor }> = ({ t, color }) => {
  if (!t) return <span className="w-[56px]" />;
  const padded = t.length === 4 ? `\u2007${t}` : t;
  return (
    <span className={`inline-block w-[56px] text-right tracking-wider whitespace-pre ${LED_COLOR_CLASSES[color]}`}>
      {padded}
    </span>
  );
};

/* ── メインコンポーネント ── */

export const StationBoard: React.FC<StationBoardProps> = ({
  trains,
  selectedTrain,
  onSelectTrain,
  stationId = 'nagamachi',
  direction = 'up',
  track,
  noticeText = 'お願いいたします。',
}) => {
  const activeTrack = useMemo(() => {
    if (track) return track;
    if (selectedTrain?.track) return selectedTrain.track;
    if (trains[0]?.track) return trains[0].track;
    if (stationId === 'minami-sendai') return direction === 'up' ? '1' : '2';
    if (stationId === 'nagamachi' || stationId === 'taishido') return direction === 'up' ? '2' : '1';
    if (stationId === 'natori') return direction === 'up' ? '1' : '2';
    return 'default';
  }, [track, selectedTrain, trains, stationId, direction]);

  const theme = useMemo(() => {
    const st = STATION_TRACK_THEMES[stationId] ?? STATION_TRACK_THEMES.nagamachi;
    const base = st[activeTrack] ?? st.default ?? Object.values(st)[0];
    return { ...base, ...getStationThemeColors(stationId, direction, base) };
  }, [stationId, activeTrack, direction]);

  const rows: (DepartureTrain | null)[] = useMemo(() => [trains[0] ?? null, trains[1] ?? null], [trains]);

  const bgStyle: React.CSSProperties = {
    backgroundColor: '#080a08',
    backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 0)',
    backgroundSize: '3px 3px',
  };

  // 全レイアウト共通の行スタイル
  const rowBase = 'w-full h-[34px] text-[20px] font-bold leading-none flex items-center whitespace-nowrap rounded transition';

  /* ── SAT共通 白色LED ── */
  if (theme.layout === 'sat-common') {
    return (
      <div className="rounded border border-neutral-800/60 px-3 py-2 font-led select-none" style={bgStyle}>
        <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-neutral-800/40 text-[9px] text-neutral-500 font-sans whitespace-nowrap">
          <span className="w-[48px] text-center">種別</span>
          <span className="w-[56px] text-center">時刻</span>
          <span className="flex-1 text-center">行先</span>
          <span className="w-[68px] text-right">両数</span>
        </div>

        {rows.map((train, i) => {
          if (!train) {
            if (i === 1 && rows[0]) {
              return <div key="notice" className={`h-[34px] flex items-center text-[20px] font-bold tracking-wide ${LED_COLOR_CLASSES.amber}`}>{rows[0].remarks || noticeText}</div>;
            }
            return <div key={`e-${i}`} className="h-[34px]" />;
          }
          const sel = selectedTrain?.id === train.id;
          return (
            <button
              key={train.id}
              type="button"
              onClick={() => onSelectTrain(train)}
              className={`${rowBase} justify-between ${sel ? 'bg-white/10 ring-1 ring-white/30' : 'hover:bg-white/5'}`}
            >
              <span className={`w-[48px] text-center tracking-widest ${LED_COLOR_CLASSES[theme.typeColor]}`}>{train.trainType}</span>
              <Time t={train.departureTime} color={theme.timeColor} />
              <span className="flex-1 flex justify-center">
                <Dest text={train.destination} box={4} color={getDestinationLedColor(stationId, train.direction || direction, train.line, train.destination)} />
              </span>
              <span className={`w-[68px] text-right tracking-tight ${LED_COLOR_CLASSES[theme.carsColor]}`}>{train.cars}両編成</span>
            </button>
          );
        })}
      </div>
    );
  }

  /* ── JR各駅 3色LED ── */
  return (
    <div className="rounded border border-neutral-800/60 px-3 py-2 font-led select-none" style={bgStyle}>
      <div className="flex flex-col gap-0.5">
        {rows.map((train, i) => {
          if (!train) return <div key={`e-${i}`} className="h-[34px]" />;

          const sel = selectedTrain?.id === train.id;
          const dc = getDestinationLedColor(stationId, train.direction || direction, train.line, train.destination);
          const fwCars = `${toFW(train.cars)}両`;

          return (
            <button
              key={train.id}
              type="button"
              onClick={() => onSelectTrain(train)}
              className={`${rowBase} justify-between ${sel ? 'bg-amber-500/10 ring-1 ring-amber-400/40' : 'hover:bg-white/5'}`}
            >
              {/* 仙台: [普通] ──── [16:58] [小牛田] */}
              {theme.layout === 'jr-sendai' && (<>
                <span className={`w-[44px] tracking-wider ${LED_COLOR_CLASSES[theme.typeColor]}`}>{train.trainType}</span>
                <span className="flex-1" />
                <Time t={train.departureTime} color={theme.timeColor} />
                <span className="w-2" />
                <Dest text={train.destination} box={3} color={dc} />
              </>)}

              {/* 長町・太子堂: [普　通 ４両] [9:30] [原ノ町] */}
              {theme.layout === 'jr-nagamachi-taishido' && (<>
                <span className={`inline-grid grid-cols-3 w-[56px] text-center ${LED_COLOR_CLASSES[theme.typeColor]}`}>
                  <span>{train.trainType[0] ?? '普'}</span><span>　</span><span>{train.trainType[1] ?? '通'}</span>
                </span>
                <span className={`w-[44px] text-center tracking-wider ${LED_COLOR_CLASSES[theme.carsColor]}`}>{fwCars}</span>
                <span className="flex-1" />
                <Time t={train.departureTime} color={theme.timeColor} />
                <span className="w-2" />
                <Dest text={train.destination} box={3} color={dc} />
              </>)}

              {/* 南仙台1番線: [６両] ──── [8:23] [原ノ町] [1] */}
              {theme.layout === 'jr-minami-sendai-1' && (<>
                <span className={`w-[44px] tracking-wider ${LED_COLOR_CLASSES[theme.carsColor]}`}>{fwCars}</span>
                <span className="flex-1" />
                <Time t={train.departureTime} color={theme.timeColor} />
                <span className="w-2" />
                <Dest text={train.destination} box={3} color={dc} />
                <span className={`w-[20px] text-right ml-1 ${LED_COLOR_CLASSES[theme.trackColor ?? 'green']}`}>{train.track}</span>
              </>)}

              {/* 南仙台2番線: [６両] ──── [8:29] [仙　台] */}
              {theme.layout === 'jr-minami-sendai-2' && (<>
                <span className={`w-[44px] tracking-wider ${LED_COLOR_CLASSES[theme.carsColor]}`}>{fwCars}</span>
                <span className="flex-1" />
                <Time t={train.departureTime} color={theme.timeColor} />
                <span className="w-2" />
                <Dest text={train.destination} box={3} color={dc} />
              </>)}

              {/* 名取: [普通６両] [22:43] [白　石] */}
              {theme.layout === 'jr-natori' && (<>
                <span className="inline-grid grid-cols-4 w-[80px] text-center leading-none">
                  <span className={LED_COLOR_CLASSES[theme.typeColor]}>{train.trainType[0] ?? '普'}</span>
                  <span className={LED_COLOR_CLASSES[theme.typeColor]}>{train.trainType[1] ?? '通'}</span>
                  <span className={LED_COLOR_CLASSES[theme.carsColor]}>{toFW(train.cars)}</span>
                  <span className={LED_COLOR_CLASSES[theme.carsColor]}>両</span>
                </span>
                <Time t={train.departureTime} color={theme.timeColor} />
                <span className="flex-1" />
                <Dest text={train.destination} box={3} color={dc} />
              </>)}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default StationBoard;
