import React, { useMemo, useRef, useState, useEffect } from 'react';
import { DepartureTrain, DirectionType } from '../types';
import {
  getDestinationLedColor,
  getStationThemeColors,
  LedColor,
  LINE_COLORS,
} from '../config/trainLineRules';
import { JisAirplane } from './icons/JisAirplane';
import { DotLedText, hasDotFont, formatDepartureTime } from './DotLedText';
import { DotLedBitmap, getDestinationDots } from './DotLedBitmap';
import { LedSlotRow } from './LedSlotRow';

export interface StationBoardProps {
  trains: DepartureTrain[];
  selectedTrain?: DepartureTrain | null;
  onSelectTrain?: (train: DepartureTrain) => void;
  stationId?: string;
  direction?: DirectionType;
  track?: string;
  noticeText?: string;
}

export const LED_COLOR_CLASSES: Record<LedColor, string> = {
  amber: 'text-[#f59e0b]',
  green: 'text-[#00e676]',
  red: 'text-[#ef4444]',
  white: 'text-[#ffffff]',
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
    '2': { layout: 'jr-minami-sendai-2', typeColor: 'red', carsColor: 'red', timeColor: 'green', trackColor: 'green' },
    '3': { layout: 'jr-minami-sendai-2', typeColor: 'red', carsColor: 'red', timeColor: 'green', trackColor: 'green' },
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

export const STATION_BOARD_WIDTH_CLASSES: Record<string, string> = {
  'minami-sendai': 'w-[92%] max-w-[326px]',
  natori: 'w-[92%] max-w-[326px]',
  sendai: 'w-full max-w-[385px]',
  nagamachi: 'w-full max-w-[385px]',
  taishido: 'w-full max-w-[385px]',
  morisekinoshita: 'w-full max-w-[370px]',
  mitazono: 'w-full max-w-[370px]',
  'sendai-airport': 'w-full max-w-[370px]',
};

export const STATION_BOARD_BASE_WIDTHS: Record<string, number> = {
  'minami-sendai': 326,
  natori: 326,
  sendai: 385,
  nagamachi: 385,
  taishido: 385,
  morisekinoshita: 370,
  mitazono: 370,
  'sendai-airport': 370,
};

/**
 * 電光掲示板の形状を完全固定するスケーリングラッパー
 * 基準幅（baseWidth）で内部ボードを描画し、利用可能幅に応じて均等スケール（transform: scale）を適用。
 * ページズーム、ピンチズーム、端末幅変化でも縦横比（アスペクト比）が1ミリも狂わず、
 * 実機の形状プロポーションを常に100%完全に維持します。
 */
export const FixedRatioBoardWrapper: React.FC<{
  baseWidth: number;
  children: React.ReactNode;
}> = ({ baseWidth, children }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [contentHeight, setContentHeight] = useState<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const handleResize = () => {
      const containerWidth = container.clientWidth;
      if (containerWidth > 0) {
        // 利用可能幅に対するスケール係数（最大1.0で等倍、狭い場合は相似縮小）
        const newScale = Math.min(1, containerWidth / baseWidth);
        setScale(newScale);
        setContentHeight(content.offsetHeight);
      }
    };

    handleResize();

    const ro = new ResizeObserver(() => {
      handleResize();
    });
    ro.observe(container);
    ro.observe(content);

    window.addEventListener('resize', handleResize);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [baseWidth]);

  return (
    <div
      ref={containerRef}
      className="w-full flex justify-center items-start overflow-hidden select-none"
      style={{
        height: contentHeight !== null ? `${Math.round(contentHeight * scale)}px` : undefined,
      }}
    >
      <div
        ref={contentRef}
        style={{
          width: `${baseWidth}px`,
          minWidth: `${baseWidth}px`,
          maxWidth: `${baseWidth}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
          flexShrink: 0,
        }}
      >
        {children}
      </div>
    </div>
  );
};

/* ── ユーティリティ ── */

function toFW(n: number): string {
  const d = ['０','１','２','３','４','５','６','７','８','９'];
  return String(n).split('').map(c => d[parseInt(c,10)] ?? c).join('');
}

/* ── サブコンポーネント ── */

/** 行先セル — 実機写真通り、行先枠を3文字幅基準にして文字数（2字/3字/4字）による表示ズレを防止 */
const Dest: React.FC<{ text: string; color: LedColor; stationId?: string }> = ({ text, color, stationId }) => {
  const cls = `${LED_COLOR_CLASSES[color]} whitespace-nowrap`;
  const clean = text.trim();

  // 手打ちドットデータがあれば優先描画
  const dots = getDestinationDots(stationId, clean);
  if (dots) {
    return (
      <span className={`inline-flex items-center justify-center h-full ${cls}`}>
        <DotLedBitmap dots={dots} className="h-[20px] w-auto max-w-full" ariaLabel={clean} />
      </span>
    );
  }

  // 2文字（山下、白石、福島、岩沼、仙台など）は2文字の間に全角スペースを1個配置
  if (clean.length === 2) {
    return (
      <span className={`inline-block w-[72px] text-center tracking-normal ${cls}`}>
        {clean[0]}　{clean[1]}
      </span>
    );
  }
  // 3文字（原ノ町、小牛田、いわきなど）
  if (clean.length === 3) {
    return (
      <span className={`inline-block w-[72px] text-center tracking-normal ${cls}`}>
        {clean}
      </span>
    );
  }
  // 4文字（仙台空港など）
  return (
    <span className={`inline-block w-[96px] text-center tracking-tight ${cls}`}>
      {clean}
    </span>
  );
};

/** 時刻セル — 実機写真通り緑色で右寄せ、固定幅で全行の縦位置を完全一致 */
const Time: React.FC<{ t?: string; color: LedColor }> = ({ t, color }) => {
  if (!t) return <span className="inline-block w-[60px]" />;
  const padded = t.length === 4 ? `\u2007${t}` : t;
  return (
    <span className={`inline-block w-[60px] text-right tracking-wider whitespace-pre ${LED_COLOR_CLASSES[color]}`}>
      {padded}
    </span>
  );
};

/** LEDグリッド行先セル（手打ちドット96dot優先、なければ2字・3字・4字を実機準拠で割付） */
const renderDestGrid = (dest: string, dc: LedColor, stationId?: string) => {
  const clean = dest.trim();

  // 手打ちドットデータがあれば96dot枠全体にそのまま優先描画
  const dots = getDestinationDots(stationId, clean);
  if (dots) {
    return (
      <div className={`col-span-4 h-full w-full flex items-center justify-center p-0 overflow-hidden leading-[24px] ${LED_COLOR_CLASSES[dc]}`}>
        <DotLedBitmap
          dots={dots}
          targetWidth={96}
          className="h-full w-full block"
          preserveAspectRatio="xMidYMid meet"
          ariaLabel={clean}
        />
      </div>
    );
  }

  return (
    <div className={`col-span-4 h-full w-full flex items-center justify-center p-0 overflow-hidden leading-[24px] ${LED_COLOR_CLASSES[dc]}`}>
      {clean.length === 2 ? (
        /* 2文字行先: 12dot空白 + 24dot(1文字目) + 24dot空白 + 24dot(2文字目) + 12dot空白 = 96dot（上下2dot空き再現: text-[20px] py-[2px]） */
        <div className="w-full h-full grid grid-cols-[12fr_24fr_24fr_24fr_12fr] items-center text-center text-[20px] leading-none py-[2px]">
          <span className="h-full w-full" />
          <span className="h-[20px] flex items-center justify-center">{clean[0]}</span>
          <span className="h-full w-full" />
          <span className="h-[20px] flex items-center justify-center">{clean[1]}</span>
          <span className="h-full w-full" />
        </div>
      ) : clean.length === 3 ? (
        /* 3文字行先: 12dot空白 + 24dot×3文字 + 12dot空白 = 96dot（上下2dot空き再現: text-[20px] py-[2px]） */
        <div className="w-full h-full grid grid-cols-[12fr_24fr_24fr_24fr_12fr] items-center text-center text-[20px] leading-none py-[2px]">
          <span className="h-full w-full" />
          <span className="h-[20px] flex items-center justify-center">{clean[0]}</span>
          <span className="h-[20px] flex items-center justify-center">{clean[1]}</span>
          <span className="h-[20px] flex items-center justify-center">{clean[2]}</span>
          <span className="h-full w-full" />
        </div>
      ) : (
        /* 4文字行先: 24dot×4文字 = 96dot（上下2dot空き再現: text-[20px] py-[2px]） */
        <div className="w-full h-full grid grid-cols-[24fr_24fr_24fr_24fr] items-center text-center text-[20px] leading-none py-[2px]">
          <span className="h-[20px] flex items-center justify-center">{clean[0]}</span>
          <span className="h-[20px] flex items-center justify-center">{clean[1]}</span>
          <span className="h-[20px] flex items-center justify-center">{clean[2]}</span>
          <span className="h-[20px] flex items-center justify-center">{clean[3]}</span>
        </div>
      )}
    </div>
  );
};

/** のりば番号（実機Frutiger系譜 Hind Regular 400 ベクター）
 *  ハードコードされたfont-sizeを使わず、親コンテナの高さ（h-full）に完全自動追従。
 *  方面表示や路線名と全く同一の上下余白（隙間）を保ちながら、はみ出しなくピッタリ収まります。
 */
const TrackNumeral: React.FC<{ num: string | number; className?: string }> = ({
  num,
  className = 'h-full w-auto text-slate-900',
}) => {
  const n = String(num).trim();
  if (n === '1') {
    return (
      <svg viewBox="0 0 229 654" className={className} fill="currentColor" aria-label="1番線">
        <path d="M 0 179 L 0 94 L 155 0 L 229 0 L 229 654 L 151 654 L 151 86 Z" />
      </svg>
    );
  }
  if (n === '2') {
    return (
      <svg viewBox="0 0 413 661" className={className} fill="currentColor" aria-label="2番線">
        <path d="M 109 592 L 413 592 L 413 661 L 0 661 L 0 594 Q 310 360 310 204 Q 310 142 274 108.5 Q 238 75 177 75 Q 98 75 21 134 L 21 55 Q 92 0 184 0 Q 272 0 332 51 Q 392 102 392 196 Q 392 373 109 592 Z" />
      </svg>
    );
  }
  if (n === '3') {
    return (
      <svg viewBox="0 0 377 667" className={className} fill="currentColor" aria-label="3番線">
        <path d="M 20 114 L 20 37 Q 78 0 154 0 Q 251 0 304.5 49.5 Q 358 99 358 172 Q 358 225 331.5 267.0 Q 305 309 253 330 Q 310 343 343.5 382.5 Q 377 422 377 481 Q 377 561 321.0 614.0 Q 265 667 163 667 Q 69 667 0 634 L 0 555 Q 74 594 161 594 Q 225 594 260.5 561.0 Q 296 528 296.0 475.0 Q 296 422 256.5 393.5 Q 217 365 143 365 L 101 365 L 101 296 L 143 296 Q 199 296 237.5 264.5 Q 276 233 276.0 180.0 Q 276 127 243.0 100.0 Q 210 73 152 73 Q 83 73 20 114 Z" />
      </svg>
    );
  }
  return <span className="font-track font-normal leading-none">{n}</span>;
};

/* ── メインコンポーネント ── */

export const StationBoard: React.FC<StationBoardProps> = ({
  trains,
  selectedTrain,
  stationId = 'nagamachi',
  direction = 'up',
  track,
  noticeText = 'お願いいたします。',
}) => {
  const isNagamachiTaishido = stationId === 'nagamachi' || stationId === 'taishido';
  const isNarrowBoard = stationId === 'minami-sendai' || stationId === 'natori';
  const hasIntegratedSignboard =
    stationId === 'nagamachi' ||
    stationId === 'taishido' ||
    stationId === 'natori' ||
    stationId === 'minami-sendai';

  const isSatStation =
    stationId === 'morisekinoshita' ||
    stationId === 'mitazono' ||
    stationId === 'sendai-airport';

  const activeTrack = useMemo(() => {
    if (isNagamachiTaishido) return direction === 'up' ? '2' : '1';
    if (track) return track;
    if (selectedTrain?.track) return selectedTrain.track;
    if (trains[0]?.track) return trains[0].track;
    if (stationId === 'minami-sendai') return direction === 'up' ? '1' : '2';
    if (stationId === 'natori') return direction === 'up' ? '1' : '2';
    if (isSatStation) {
      return direction === 'up' ? '1' : '2';
    }
    return 'default';
  }, [track, selectedTrain, trains, stationId, direction, isNagamachiTaishido, isSatStation]);

  const theme = useMemo(() => {
    const st = STATION_TRACK_THEMES[stationId] ?? STATION_TRACK_THEMES.nagamachi;
    const base = st[activeTrack] ?? st.default ?? Object.values(st)[0];
    return { ...base, ...getStationThemeColors(stationId, direction, base) };
  }, [stationId, activeTrack, direction]);

  const rows: (DepartureTrain | null)[] = useMemo(() => [trains[0] ?? null, trains[1] ?? null], [trains]);
  const sendaiRows: (DepartureTrain | null)[] = useMemo(
    () => [trains[0] ?? null, trains[1] ?? null, trains[2] ?? null],
    [trains]
  );

  const bgStyle: React.CSSProperties = {
    backgroundColor: '#16191d',
  };

  const rowBase = 'w-full h-[26px] text-[23px] font-bold leading-none flex items-center whitespace-nowrap rounded-none px-1 transition';

  const baseWidth = STATION_BOARD_BASE_WIDTHS[stationId] ?? 385;

  /* ─────────────────────────────────────────────────────────────
     1. 仙台駅（上部路線看板＋下部3段LED発車標）
     ───────────────────────────────────────────────────────────── */
  if (stationId === 'sendai') {
    const activeSendaiLine =
      track === 'tohoku' || track === 'joban' || track === 'saal'
        ? track
        : selectedTrain?.line || trains[0]?.line || 'tohoku';

    return (
      <FixedRatioBoardWrapper baseWidth={baseWidth}>
        <div className="w-full font-sans">
        {/* 実機の一体型アルミ筐体フレーム */}
        <div className="rounded-none border-[3px] border-[#5a6370] bg-[#474f5c] overflow-hidden">
          
          {/* ================= 上部白看板（長町太子堂型共通・番線数字なし） ================= */}
          <div className="bg-[#f7f8fa] text-slate-900 px-3 h-[44px] border-b-[3px] border-[#2c323c] flex items-center justify-between select-none relative font-signboard overflow-hidden">
            {activeSendaiLine === 'joban' ? (
              /* 常磐線: 文字は黒（slate-900）、カラーバーのみ青 */
              <>
                <div className="w-[28%] flex items-end justify-between self-end pb-[4.5px] shrink-0">
                  <div className="flex-1 flex flex-col justify-end items-center text-center leading-none">
                    <span className="text-[12px] font-bold text-slate-900 leading-none">
                      常磐線
                    </span>
                    <span className="text-[7.5px] font-semibold text-slate-900 leading-none mt-[2px] font-english tracking-wide">
                      Jōban Line
                    </span>
                  </div>
                  <div className="w-2.5 self-stretch -mb-[4.5px] shrink-0 shadow-2xs" style={{ backgroundColor: LINE_COLORS.joban }} />
                </div>

                <div className="flex-1 flex flex-col justify-center items-center text-center pl-2 h-full pt-[1px]">
                  <div className="leading-none flex items-baseline justify-center whitespace-nowrap">
                    <span className="text-[15.5px] font-bold text-slate-900 tracking-tight">
                      亘理・相馬・原ノ町
                    </span>
                    <span className="text-[10.5px] font-semibold text-slate-900 ml-1">
                      方面
                    </span>
                  </div>
                  <span className="text-[8px] text-slate-900 font-medium leading-none mt-[2px] font-english whitespace-nowrap">
                    for Watari, Sōma &amp; Haranomachi
                  </span>
                </div>
              </>
            ) : activeSendaiLine === 'saal' ? (
              /* 仙台空港アクセス線 */
              <>
                <div className="w-[44%] flex items-end justify-between self-end pb-[4.5px] shrink-0">
                  <div className="flex items-center gap-1.5 flex-1">
                    {/* 日本語表記上端〜英語表記下端の高さに完全一致する角丸なしの正方形青バッジ */}
                    <div className="w-[23px] h-[23px] aspect-square rounded-none flex items-center justify-center shrink-0 p-[1.5px]" style={{ backgroundColor: LINE_COLORS.saal }}>
                      <JisAirplane tight className="w-full h-full" color="#ffffff" />
                    </div>
                    {/* 正方形バッジと上下端がぴったり揃う日本語＋英語テキストブロック */}
                    <div className="h-[23px] flex flex-col justify-between items-start leading-none">
                      <span className="text-[11px] font-bold leading-none tracking-tight whitespace-nowrap" style={{ color: LINE_COLORS.saal }}>
                        仙台空港アクセス線
                      </span>
                      <span className="text-[7px] font-semibold leading-none font-english tracking-tight whitespace-nowrap" style={{ color: LINE_COLORS.saal }}>
                        Sendai Airport Access Line
                      </span>
                    </div>
                  </div>
                  <div className="w-2.5 self-stretch -mb-[4.5px] shrink-0 shadow-2xs ml-1" style={{ backgroundColor: LINE_COLORS.saal }} />
                </div>

                <div className="flex-1 flex flex-col justify-center items-center text-center pl-2 h-full pt-[1px]">
                  <div className="leading-none flex items-baseline justify-center whitespace-nowrap">
                    <span className="text-[15px] font-bold text-slate-900 tracking-tight">
                      名取・仙台空港
                    </span>
                    <span className="text-[10.5px] font-semibold text-slate-900 ml-1">
                      方面
                    </span>
                  </div>
                  <span className="text-[8px] text-slate-900 font-medium leading-none mt-[2px] font-english whitespace-nowrap">
                    for Natori &amp; Sendai Airport
                  </span>
                </div>
              </>
            ) : (
              /* 東北本線 上り: 文字は黒（slate-900）、カラーバーのみ緑 */
              <>
                <div className="w-[28%] flex items-end justify-between self-end pb-[4.5px] shrink-0">
                  <div className="flex-1 flex flex-col justify-end items-center text-center leading-none">
                    <span className="text-[12px] font-bold text-slate-900 leading-none whitespace-nowrap">
                      東北本線 上り
                    </span>
                    <span className="text-[7.5px] font-semibold text-slate-900 leading-none mt-[2px] font-english tracking-wide">
                      Tōhoku Line
                    </span>
                  </div>
                  <div className="w-2.5 self-stretch -mb-[4.5px] shrink-0 shadow-2xs" style={{ backgroundColor: LINE_COLORS.tohoku }} />
                </div>

                <div className="flex-1 flex flex-col justify-center items-center text-center pl-2 h-full pt-[1px]">
                  <div className="leading-none flex items-baseline justify-center whitespace-nowrap">
                    <span className="text-[15.5px] font-bold text-slate-900 tracking-tight">
                      岩沼・白石・福島
                    </span>
                    <span className="text-[10.5px] font-semibold text-slate-900 ml-1">
                      方面
                    </span>
                  </div>
                  <span className="text-[8px] text-slate-900 font-medium leading-none mt-[2px] font-english whitespace-nowrap">
                    for Iwanuma, Shiroishi &amp; Fukushima
                  </span>
                </div>
              </>
            )}
          </div>

          {/* ================= 下部：LED発車標筐体（実機新陽社384ドット・16列構成：時刻・行先各96ドット） ================= */}
          <div className="bg-[#080a0c] px-2.5 sm:px-3 pt-2 pb-1.5 select-none">
            <div
              className="rounded-none font-led shadow-[inset_0_1px_4px_rgba(0,0,0,0.95)]"
              style={bgStyle}
            >
              <div className="flex flex-col gap-0">
                {sendaiRows.map((train, i) => {
                  if (!train) return <div key={`e-${i}`} className="w-full h-[25px] sm:h-[26px]" />;

                  const cleanDest = train.destination.trim();
                  const isSaal = train.destination === '仙台空港' || train.line === 'saal';
                  const isLimitedExpress = train.trainType === '特急';
                  const typeColorClass = isLimitedExpress ? LED_COLOR_CLASSES.red : LED_COLOR_CLASSES.amber;

                  return (
                    <div
                      key={train.id}
                      className="w-full h-[25px] sm:h-[26px] text-[23.5px] sm:text-[24px] font-bold leading-none grid grid-cols-[repeat(16,minmax(0,1fr))] items-center whitespace-nowrap rounded-none cursor-default min-w-0"
                    >
                      {/* 1〜2マス目: 種別（48ドット / 2文字幅、特急は赤色・普通は橙色、左端スペースなし・縦24ドット全面密着） */}
                      <div className={`col-span-2 h-full w-full flex items-center justify-start p-0 overflow-hidden ${typeColorClass}`}>
                        {(() => {
                          const typeDots = getDestinationDots('sendai', train.trainType);
                          if (typeDots) {
                            return (
                              <DotLedBitmap
                                dots={typeDots}
                                className="h-full w-full block"
                                preserveAspectRatio="xMinYMid meet"
                                ariaLabel={train.trainType}
                              />
                            );
                          }
                          return (
                            <div className="w-full h-full flex items-center justify-around px-0.5 text-[20px] leading-none font-bold py-[2px]">
                              <span className="h-[20px] flex items-center justify-center">{train.trainType[0] ?? '普'}</span>
                              <span className="h-[20px] flex items-center justify-center">{train.trainType[1] ?? '通'}</span>
                            </div>
                          );
                        })()}
                      </div>

                      {/* 3〜7マス目: 愛称・号数枠 / 中央余白（120ドット / 5文字幅、特急時は赤文字「ひたち 12号」等・上下2dot空き再現） */}
                      {isLimitedExpress ? (
                        <div className={`col-span-5 h-full w-full grid grid-cols-5 items-center text-center text-[20px] font-bold leading-none py-[2px] ${LED_COLOR_CLASSES.red}`}>
                          <span className="h-[20px] flex items-center justify-center">ひ</span>
                          <span className="h-[20px] flex items-center justify-center">た</span>
                          <span className="h-[20px] flex items-center justify-center">ち</span>
                          <span className="col-span-2 text-center tracking-tight h-[20px] flex items-center justify-center">
                            {train.departureTime === '8:48' ? '12号' : train.departureTime === '14:16' ? '22号' : '30号'}
                          </span>
                        </div>
                      ) : (
                        <span className="col-span-5 h-full" />
                      )}

                      {/* 8〜11マス目: 発車時刻（実機通り行先と完全同幅の96ドット / 4文字幅枠、中央配置、緑色） */}
                      <div className={`col-span-4 h-full w-full flex items-center justify-center p-0 overflow-hidden ${LED_COLOR_CLASSES.green}`}>
                        <DotLedText
                          text={train.departureTime}
                          stationId="sendai"
                          targetWidth={96}
                          className="h-full w-full block"
                          fallback={<span className="text-center tracking-wider whitespace-nowrap h-[20px] flex items-center justify-center text-[20px] leading-none py-[2px]">{train.departureTime}</span>}
                        />
                      </div>

                      {/* 12〜15マス目: 行先（時刻と完全同幅の96ドット / 4文字幅枠、橙色、実機上下2dot空き再現: text-[20px] py-[2px]） */}
                      <div className={`col-span-4 h-full w-full flex items-center justify-start p-0 overflow-hidden ${LED_COLOR_CLASSES.amber}`}>
                        {(() => {
                          const sendaiDots = getDestinationDots('sendai', cleanDest);
                          if (sendaiDots) {
                            return (
                              <DotLedBitmap
                                dots={sendaiDots}
                                targetWidth={96}
                                className="h-full w-full block"
                                preserveAspectRatio="xMinYMid meet"
                                ariaLabel={cleanDest}
                              />
                            );
                          }

                          if (isSaal) {
                            return (
                              /* 仙台空港: 上向きLED飛行機とともに番線数字に干渉せず左右切れゼロで美しく表示（上下2dot空き） */
                              <div className="w-full h-full flex items-center justify-center text-[20px] font-bold leading-none tracking-[-0.05em] py-[2px]">
                                <svg
                                  viewBox="-2 0 20 24"
                                  className="w-[12px] h-[16px] fill-current shrink-0 mr-0.5"
                                >
                                  <path d="M7 1h2v7l7 5.5v2.5l-7-2.5V19l3.5 2.5V23L8 21.5 4.5 23v-1.5L7 19v-5.5L0 16v-2.5L7 8V1z" />
                                </svg>
                                <span className="h-[20px] flex items-center justify-center">仙</span>
                                <span className="h-[20px] flex items-center justify-center">台</span>
                                <span className="h-[20px] flex items-center justify-center">空</span>
                                <span className="h-[20px] flex items-center justify-center">港</span>
                              </div>
                            );
                          }
                          if (cleanDest.length === 2) {
                            /* 2文字（白石、岩沼、郡山等）: 4文字幅に1:2:1の空白比率（上下2dot空き） */
                            return (
                              <div className="w-full h-full grid grid-cols-8 items-center text-center text-[20px] leading-none py-[2px]">
                                <span className="col-start-2 col-span-2 h-[20px] flex items-center justify-center">{cleanDest[0]}</span>
                                <span className="col-start-6 col-span-2 h-[20px] flex items-center justify-center">{cleanDest[1]}</span>
                              </div>
                            );
                          }
                          if (cleanDest.length === 3) {
                            /* 3文字（浜吉田、原ノ町、小牛田等）: 4文字枠の中で均等配置（上下2dot空き） */
                            return (
                              <div className="w-full h-full flex items-center justify-around px-1 text-[20px] leading-none font-bold py-[2px]">
                                <span className="h-[20px] flex items-center justify-center">{cleanDest[0]}</span>
                                <span className="h-[20px] flex items-center justify-center">{cleanDest[1]}</span>
                                <span className="h-[20px] flex items-center justify-center">{cleanDest[2]}</span>
                              </div>
                            );
                          }
                          return (
                            /* 4文字: 4文字幅枠なので縮小せずフル表示（上下2dot空き） */
                            <div className="w-full h-full grid grid-cols-4 items-center text-center text-[20px] leading-none py-[2px]">
                              <span className="h-[20px] flex items-center justify-center">{cleanDest[0]}</span>
                              <span className="h-[20px] flex items-center justify-center">{cleanDest[1]}</span>
                              <span className="h-[20px] flex items-center justify-center">{cleanDest[2]}</span>
                              <span className="h-[20px] flex items-center justify-center">{cleanDest[3]}</span>
                            </div>
                          );
                        })()}
                      </div>

                      {/* 16マス目: のりば番線（24ドット / 1文字幅、赤色、行先から3dot・右端から3dot空けて配置） */}
                      <div className={`col-span-1 h-full w-full flex items-center justify-center p-0 shrink-0 ${LED_COLOR_CLASSES.red}`}>
                        {(() => {
                          const trackNum = train.track || (train.line === 'saal' ? '4' : '3');
                          if (hasDotFont('sendai', trackNum)) {
                            return (
                              <DotLedText
                                text={trackNum}
                                stationId="sendai"
                                targetWidth={24}
                                className="h-full w-full block"
                                fallback={<span className="text-center text-[23.5px] sm:text-[24px] font-bold h-full flex items-center justify-center leading-none">{trackNum}</span>}
                              />
                            );
                          }
                          return <span className="text-center text-[23.5px] sm:text-[24px] font-bold h-full flex items-center justify-center leading-none">{trackNum}</span>;
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      </div>
      </FixedRatioBoardWrapper>
    );
  }

  /* ─────────────────────────────────────────────────────────────
     2. 仙台空港アクセス線 3駅（杜せきのした・美田園・仙台空港）
     ───────────────────────────────────────────────────────────── */
  if (isSatStation) {
    const satTrack = stationId === 'morisekinoshita' ? '1' : activeTrack === '2' ? '2' : '1';

    return (
      <FixedRatioBoardWrapper baseWidth={baseWidth}>
        <div className="w-full font-sans">
        {/* 実機の一体型アルミ筐体フレーム */}
        <div className="rounded-none border-[3px] border-[#5a6370] bg-[#474f5c] overflow-hidden">
          
          {/* ================= 上部白看板（SAT仕様・斜め青ライン＆番線数字左右反転対応） ================= */}
          <div className="bg-[#eef2f6] text-slate-900 px-3 h-[46px] border-b-2 border-neutral-950 flex items-center justify-between select-none relative font-signboard overflow-hidden">
            {satTrack === '1' ? (
              /* ── 1番線: 左端に数字「1」、青ラインは1の下を通って右上へ滑らかに駆け上がり、方面テキストの上を通る ── */
              <>
                {/* 連続アクセス線青ライン（#0085ca・角ばらない滑らかなS字曲線ベジェ・均一線幅・端部は上下で内側が中心向きに斜めカット） */}
                <svg
                  viewBox="0 0 370 46"
                  preserveAspectRatio="none"
                  className="absolute inset-0 w-full h-full pointer-events-none"
                >
                  <defs>
                    <clipPath id="sat-line-clip-1">
                      <polygon points="7,46 79,-2 366,-2 294,46" />
                    </clipPath>
                  </defs>
                  <path
                    d="M 0 42 L 52 42 C 74 42, 74 4, 96 4 L 370 4"
                    fill="none"
                    stroke="#0085ca"
                    strokeWidth="3.5"
                    clipPath="url(#sat-line-clip-1)"
                  />
                </svg>

                {/* 左端：のりば数字「1」（下部青線から離れるよう若干小さく上寄りに配置） */}
                <div className="h-full flex items-center justify-center shrink-0 z-10 pl-2 pr-3 -mt-[4px]">
                  <TrackNumeral num="1" className="h-[26px] w-auto text-slate-900" />
                </div>

                {/* 中央〜右側：方面テキスト（青ラインが上を通るため pt-[5px]） */}
                <div className="flex-1 flex items-center justify-center h-full pt-[5px] z-10 pl-2 pr-4">
                  {stationId === 'sendai-airport' ? (
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="leading-none flex items-baseline justify-center whitespace-nowrap">
                        <span className="text-[16px] font-bold text-slate-900 leading-none">
                          名取・仙台
                        </span>
                        <span className="text-[11px] font-semibold text-slate-900 ml-1 leading-none">
                          方面
                        </span>
                      </div>
                      <span className="text-[8.5px] font-semibold text-slate-900 font-english leading-none mt-[2px] whitespace-nowrap">
                        for Natori &amp; Sendai
                      </span>
                    </div>
                  ) : (
                    /* 杜せきのした駅・美田園駅: 両方面併記（名取・仙台方面 ／ 仙台空港方面） */
                    <div className="flex items-center justify-center gap-2">
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="leading-none flex items-baseline justify-center whitespace-nowrap">
                          <span className="text-[13.5px] font-bold text-slate-900 leading-none">
                            名取・仙台
                          </span>
                          <span className="text-[9.5px] font-semibold text-slate-900 ml-0.5 leading-none">
                            方面
                          </span>
                        </div>
                        <span className="text-[7.5px] font-semibold text-slate-900 font-english leading-none mt-[1.5px] whitespace-nowrap">
                          for Natori &amp; Sendai
                        </span>
                      </div>

                      <svg viewBox="0 0 10 24" className="h-[24px] w-[10px] text-slate-400 stroke-current shrink-0">
                        <line x1="8" y1="2" x2="2" y2="22" strokeWidth="1.2" />
                      </svg>

                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="leading-none flex items-baseline justify-center whitespace-nowrap">
                          <span className="text-[13.5px] font-bold text-slate-900 leading-none">
                            仙台空港
                          </span>
                          <span className="text-[9.5px] font-semibold text-slate-900 ml-0.5 leading-none">
                            方面
                          </span>
                        </div>
                        <span className="text-[7.5px] font-semibold text-slate-900 font-english leading-none mt-[1.5px] whitespace-nowrap">
                          for Sendai Airport
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* ── 2番線: 右端に数字「2」、青ラインは方面テキストの下を通って右上へ滑らかに駆け上がり、2の上を通る ── */
              <>
                {/* 連続アクセス線青ライン（#0085ca・角ばらない滑らかなS字曲線ベジェ・均一線幅・端部は上下で内側が中心向きに斜めカット） */}
                <svg
                  viewBox="0 0 370 46"
                  preserveAspectRatio="none"
                  className="absolute inset-0 w-full h-full pointer-events-none"
                >
                  <defs>
                    <clipPath id="sat-line-clip-2">
                      <polygon points="7,46 79,-2 366,-2 294,46" />
                    </clipPath>
                  </defs>
                  <path
                    d="M 0 42 L 274 42 C 296 42, 296 4, 318 4 L 370 4"
                    fill="none"
                    stroke="#0085ca"
                    strokeWidth="3.5"
                    clipPath="url(#sat-line-clip-2)"
                  />
                </svg>

                {/* 左側〜中央：方面テキスト（青ラインが下を通るため pb-[5px]） */}
                <div className="flex-1 flex items-center justify-center h-full pb-[5px] z-10 pl-4 pr-2">
                  {stationId === 'sendai-airport' ? (
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="leading-none flex items-baseline justify-center whitespace-nowrap">
                        <span className="text-[16px] font-bold text-slate-900 leading-none">
                          名取・仙台
                        </span>
                        <span className="text-[11px] font-semibold text-slate-900 ml-1 leading-none">
                          方面
                        </span>
                      </div>
                      <span className="text-[8.5px] font-semibold text-slate-900 font-english leading-none mt-[2px] whitespace-nowrap">
                        for Natori &amp; Sendai
                      </span>
                    </div>
                  ) : (
                    /* 杜せきのした駅・美田園駅: 両方面併記（名取・仙台方面 ／ 仙台空港方面） */
                    <div className="flex items-center justify-center gap-2">
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="leading-none flex items-baseline justify-center whitespace-nowrap">
                          <span className="text-[13.5px] font-bold text-slate-900 leading-none">
                            名取・仙台
                          </span>
                          <span className="text-[9.5px] font-semibold text-slate-900 ml-0.5 leading-none">
                            方面
                          </span>
                        </div>
                        <span className="text-[7.5px] font-semibold text-slate-900 font-english leading-none mt-[1.5px] whitespace-nowrap">
                          for Natori &amp; Sendai
                        </span>
                      </div>

                      <svg viewBox="0 0 10 24" className="h-[24px] w-[10px] text-slate-400 stroke-current shrink-0">
                        <line x1="8" y1="2" x2="2" y2="22" strokeWidth="1.2" />
                      </svg>

                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="leading-none flex items-baseline justify-center whitespace-nowrap">
                          <span className="text-[13.5px] font-bold text-slate-900 leading-none">
                            仙台空港
                          </span>
                          <span className="text-[9.5px] font-semibold text-slate-900 ml-0.5 leading-none">
                            方面
                          </span>
                        </div>
                        <span className="text-[7.5px] font-semibold text-slate-900 font-english leading-none mt-[1.5px] whitespace-nowrap">
                          for Sendai Airport
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 右端：のりば数字「2」（上部青線から離れるよう若干小さく下寄りに配置） */}
                <div className="h-full flex items-center justify-center shrink-0 z-10 pl-3 pr-2 mt-[4px]">
                  <TrackNumeral num="2" className="h-[26px] w-auto text-slate-900" />
                </div>
              </>
            )}
          </div>

          {/* ================= 下部：LED発車標筐体（印字ラベル帯＋2段白色LED：360×24 dot 実機確定レイアウト） ================= */}
          <div className="bg-[#0a0c0e] px-2.5 pt-1.5 pb-2 select-none">
            {/* 印字ラベル帯（360dot LEDグリッドの各スロット位置に完全一致） */}
            <div className="grid grid-cols-[48fr_7fr_82fr_19fr_96fr_17fr_86fr_5fr] items-center text-center px-1 pb-1 text-[8.5px] text-neutral-300 font-sans whitespace-nowrap leading-none tracking-tight">
              <div className="flex items-center justify-center gap-1">
                <span className="font-bold">種別</span>
                <span className="text-[6.5px] font-english text-neutral-400">Type</span>
              </div>
              <span />
              <div className="flex items-center justify-center gap-1">
                <span className="font-bold">時刻</span>
                <span className="text-[6.5px] font-english text-neutral-400">Time</span>
              </div>
              <span />
              <div className="flex items-center justify-center gap-1">
                <span className="font-bold">行先</span>
                <span className="text-[6.5px] font-english text-neutral-400">Destination</span>
              </div>
              <span />
              <span />
              <span />
            </div>

            {/* LED表示窓（内枠ガラス面・360×24 dot：48 + 7 + 82 + 19 + 96 + 17 + 86 + 5 = 360 dots） */}
            <div
              className="rounded-none px-1 py-0 font-led shadow-[inset_0_1px_3px_rgba(0,0,0,0.9)] border border-neutral-950"
              style={bgStyle}
            >
              {/* 2段表示 */}
              <div className="flex flex-col gap-[4px]">
                {rows.map((train, i) => {
                  if (!train) return <div key={`e-${i}`} className="h-[24px]" />;

                  const cleanDest = train.destination.trim();

                  return (
                    <div
                      key={train.id}
                      className="w-full h-[24px] text-[20px] font-bold leading-none grid grid-cols-[48fr_7fr_82fr_19fr_96fr_17fr_86fr_5fr] items-center text-center whitespace-nowrap rounded-none cursor-default min-w-0"
                    >
                      {/* 1. 種別（48 dots） */}
                      <div className={`h-full w-full flex items-center justify-center p-0 overflow-hidden ${LED_COLOR_CLASSES.white}`}>
                        {(() => {
                          const typeDots = getDestinationDots(stationId, train.trainType);
                          if (typeDots) {
                            return (
                              <DotLedBitmap
                                dots={typeDots}
                                targetWidth={48}
                                className="h-full w-full block"
                                preserveAspectRatio="xMidYMid meet"
                                ariaLabel={train.trainType}
                              />
                            );
                          }
                          return (
                            <div className="w-full h-full grid grid-cols-2 items-center text-center text-[20px] leading-none py-[2px]">
                              <span className="h-[20px] flex items-center justify-center">{train.trainType[0] ?? '普'}</span>
                              <span className="h-[20px] flex items-center justify-center">{train.trainType[1] ?? '通'}</span>
                            </div>
                          );
                        })()}
                      </div>

                      {/* 2. 空白（7 dots） */}
                      <span className="h-full w-full" />

                      {/* 3. 時刻（82 dots = 16 + 2 + 16 + 2 + 10 + 2 + 16 + 2 + 16） */}
                      <div className={`h-full w-full flex items-center justify-center p-0 overflow-hidden ${LED_COLOR_CLASSES.white}`}>
                        {hasDotFont(stationId, train.departureTime) ? (
                          <DotLedText
                            text={train.departureTime}
                            stationId={stationId}
                            targetWidth={82}
                            className="h-full w-full block"
                          />
                        ) : (
                          <span className="font-led font-bold whitespace-pre tracking-normal h-[20px] flex items-center justify-center leading-none text-[20px] py-[2px]">
                            {formatDepartureTime(train.departureTime)}
                          </span>
                        )}
                      </div>

                      {/* 4. 空白（19 dots） */}
                      <span className="h-full w-full" />

                      {/* 5. 行先（96 dots） */}
                      <div className={`h-full w-full flex items-center justify-center p-0 overflow-hidden ${LED_COLOR_CLASSES.white}`}>
                        {(() => {
                          const satDots = getDestinationDots(stationId, cleanDest);
                          if (satDots) {
                            return (
                              <DotLedBitmap
                                dots={satDots}
                                targetWidth={96}
                                className="h-full w-full block"
                                preserveAspectRatio="xMidYMid meet"
                                ariaLabel={cleanDest}
                              />
                            );
                          }

                          if (cleanDest.length === 2) {
                            /* 2文字行先（仙台等）: 14dot空白 + 24dot(1文字目) + 20dot空白 + 24dot(2文字目) + 14dot空白 = 96dots */
                            return (
                              <div className="w-full h-full grid grid-cols-[14fr_24fr_20fr_24fr_14fr] items-center text-center text-[20px] leading-none py-[2px]">
                                <span className="h-full w-full" />
                                <span className="h-[20px] flex items-center justify-center">{cleanDest[0]}</span>
                                <span className="h-full w-full" />
                                <span className="h-[20px] flex items-center justify-center">{cleanDest[1]}</span>
                                <span className="h-full w-full" />
                              </div>
                            );
                          }
                          if (cleanDest.length === 3) {
                            /* 3文字行先: 12dot空白 + 24dot×3文字 + 12dot空白 = 96dots */
                            return (
                              <div className="w-full h-full grid grid-cols-[12fr_24fr_24fr_24fr_12fr] items-center text-center text-[20px] leading-none py-[2px]">
                                <span className="h-full w-full" />
                                <span className="h-[20px] flex items-center justify-center">{cleanDest[0]}</span>
                                <span className="h-[20px] flex items-center justify-center">{cleanDest[1]}</span>
                                <span className="h-[20px] flex items-center justify-center">{cleanDest[2]}</span>
                                <span className="h-full w-full" />
                              </div>
                            );
                          }
                          /* 4文字行先（仙台空港等）: 24dot×4文字 = 96dots */
                          return (
                            <div className="w-full h-full grid grid-cols-[24fr_24fr_24fr_24fr] items-center text-center text-[20px] leading-none py-[2px]">
                              <span className="h-[20px] flex items-center justify-center">{cleanDest[0]}</span>
                              <span className="h-[20px] flex items-center justify-center">{cleanDest[1]}</span>
                              <span className="h-[20px] flex items-center justify-center">{cleanDest[2]}</span>
                              <span className="h-[20px] flex items-center justify-center">{cleanDest[3]}</span>
                            </div>
                          );
                        })()}
                      </div>

                      {/* 6. 空白（17 dots） */}
                      <span className="h-full w-full" />

                      {/* 7. 両数（86 dots: 「4両編成」「2両編成」枠） */}
                      <div className={`h-full w-full flex items-center justify-center p-0 overflow-hidden ${LED_COLOR_CLASSES.white}`}>
                        {(() => {
                          const carsTextFull = `${train.cars}両編成`;
                          const carsDotsFull = getDestinationDots(stationId, carsTextFull);
                          if (carsDotsFull) {
                            return (
                              <DotLedBitmap
                                dots={carsDotsFull}
                                targetWidth={86}
                                className="h-full w-full block"
                                preserveAspectRatio="xMidYMid meet"
                                ariaLabel={carsTextFull}
                              />
                            );
                          }
                          const carsTextShort = `${train.cars}両`;
                          const carsDotsShort = getDestinationDots(stationId, carsTextShort);
                          if (carsDotsShort) {
                            return (
                              <DotLedBitmap
                                dots={carsDotsShort}
                                targetWidth={86}
                                className="h-full w-full block"
                                preserveAspectRatio="xMidYMid meet"
                                ariaLabel={carsTextShort}
                              />
                            );
                          }
                          return (
                            <div className="w-full h-full grid grid-cols-4 items-center text-center text-[20px] leading-none py-[2px]">
                              <span className="h-[20px] flex items-center justify-center">{train.cars}</span>
                              <span className="h-[20px] flex items-center justify-center">両</span>
                              <span className="h-[20px] flex items-center justify-center">編</span>
                              <span className="h-[20px] flex items-center justify-center">成</span>
                            </div>
                          );
                        })()}
                      </div>

                      {/* 8. 右端空白（5 dots） */}
                      <span className="h-full w-full" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      </div>
      </FixedRatioBoardWrapper>
    );
  }

  /* ─────────────────────────────────────────────────────────────
     3. 看板一体型（長町・太子堂・名取・南仙台）
     ───────────────────────────────────────────────────────────── */
  if (hasIntegratedSignboard) {
    const isUpboundVariant =
      ((stationId === 'nagamachi' || stationId === 'taishido') && (activeTrack === '2' || direction === 'up')) ||
      ((stationId === 'natori' || stationId === 'minami-sendai') && activeTrack === '1');

    const isDownboundLeftVariant =
      ((stationId === 'nagamachi' || stationId === 'taishido') && (activeTrack === '1' || direction === 'down')) ||
      (stationId === 'minami-sendai' && activeTrack === '2');

    const isDownboundRightVariant =
      (stationId === 'natori' || stationId === 'minami-sendai') && activeTrack === '3';

    const isNatoriTrack2Variant =
      stationId === 'natori' && activeTrack === '2';

    return (
      <FixedRatioBoardWrapper baseWidth={baseWidth}>
        <div className="w-full font-sans">
        {/* 実機の一体型アルミ筐体フレーム（角ばった90度直角デザイン） */}
        <div className="rounded-none border-[3px] border-[#5a6370] bg-[#474f5c] overflow-hidden">
          
          {/* ================= 上部看板（実機写真計測に基づくアスペクト比約7.48:1デザイン） ================= */}
          {(() => {
            if (isUpboundVariant) {
              return (
                /* ── Variant 1: 方面(左)・路線名(中)・のりば数字(右) ── */
                <div className={`bg-[#f7f8fa] text-slate-900 ${isNarrowBoard ? 'px-1.5' : 'px-2'} h-[48px] border-b-2 border-neutral-950 flex items-center justify-between select-none relative font-signboard overflow-hidden`}>
                  {/* 左〜中央エリア：上段（東北本線・アクセス線）と下段（常磐線）の2行構造 */}
                  <div className="flex-1 flex flex-col justify-center gap-[3.5px] h-full pt-[0.5px]">
                    {/* 1行目（上段）：方面・縦長長方形・路線名 */}
                    <div className="flex items-center justify-between w-full">
                      <div className="flex-1 flex flex-col items-center justify-center text-center pr-1">
                        <div className="leading-none flex items-baseline justify-center whitespace-nowrap">
                          <span className={`${isNarrowBoard ? 'text-[10px]' : 'text-[10.5px]'} font-bold text-slate-900 tracking-tight`}>
                            白石・福島・仙台空港アクセス線
                          </span>
                          <span className="text-[7.5px] font-semibold text-slate-900 ml-0.5">
                            方面
                          </span>
                        </div>
                        <span className="text-[6px] text-slate-900 font-medium leading-none mt-[1px] tracking-tight whitespace-nowrap font-english">
                          for Shiroishi, Fukushima &amp; Sendai Airport Access Line
                        </span>
                      </div>

                      <div className={`flex items-center ${isNarrowBoard ? 'gap-1' : 'gap-1.5'} shrink-0 pl-1`}>
                        <div className="flex items-center justify-end gap-[2px] w-[21px] shrink-0">
                          <div className="w-[9.5px] h-[15.5px] rounded-none" style={{ backgroundColor: LINE_COLORS.saal }} title="アクセス線" />
                          <div className="w-[9.5px] h-[15.5px] rounded-none" style={{ backgroundColor: LINE_COLORS.tohoku }} title="東北本線" />
                        </div>

                        <div className={`flex flex-col justify-between items-center h-[15.5px] text-center ${isNarrowBoard ? 'w-[42px]' : 'w-[44px]'} shrink-0`}>
                          <span className="text-[8px] font-bold text-slate-900 leading-none">
                            東北本線
                          </span>
                          <span className="text-[5.5px] text-slate-900 font-semibold leading-none font-english">
                            Tōhoku Line
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 2行目（下段）：方面・縦長長方形・路線名 */}
                    <div className="flex items-center justify-between w-full">
                      <div className="flex-1 flex flex-col items-center justify-center text-center pr-1">
                        <div className="leading-none flex items-baseline justify-center whitespace-nowrap">
                          <span className={`${isNarrowBoard ? 'text-[10px]' : 'text-[10.5px]'} font-bold text-slate-900 tracking-tight`}>
                            亘理・原ノ町・いわき
                          </span>
                          <span className="text-[7.5px] font-semibold text-slate-900 ml-0.5">
                            方面
                          </span>
                        </div>
                        <span className="text-[6px] text-slate-900 font-medium leading-none mt-[1px] tracking-tight whitespace-nowrap font-english">
                          for Watari, Haranomachi &amp; Iwaki
                        </span>
                      </div>

                      <div className={`flex items-center ${isNarrowBoard ? 'gap-1' : 'gap-1.5'} shrink-0 pl-1`}>
                        <div className="flex items-center justify-end gap-[2px] w-[21px] shrink-0">
                          <div className="w-[9.5px] h-[15.5px] rounded-none" style={{ backgroundColor: LINE_COLORS.joban }} title="常磐線" />
                        </div>

                        <div className={`flex flex-col justify-between items-center h-[15.5px] text-center ${isNarrowBoard ? 'w-[42px]' : 'w-[44px]'} shrink-0`}>
                          <span className="text-[8px] font-bold text-slate-900 leading-none">
                            常磐線
                          </span>
                          <span className="text-[5.5px] text-slate-900 font-semibold leading-tight font-english">
                            Jōban Line
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 右端：のりば数字 */}
                  <div className={`${isNarrowBoard ? 'px-2' : 'pl-3 pr-2'} flex items-center justify-center shrink-0 h-full`}>
                    <TrackNumeral num={activeTrack} className="h-[33px] w-auto text-slate-900" />
                  </div>
                </div>
              );
            }

            if (isDownboundRightVariant) {
              return (
                /* ── Variant 3: 仙台・小牛田方面(左) ＋ 底辺接地緑バー ＋ 東北本線 ＋ のりば「3」(右) ── */
                <div className={`bg-[#f7f8fa] text-slate-900 ${isNarrowBoard ? 'px-2.5' : 'px-3'} h-[48px] border-b-2 border-neutral-950 flex items-center justify-between select-none relative font-signboard overflow-hidden`}>
                  {/* 左側：仙台・小牛田 方面 */}
                  <div className="flex-1 flex flex-col justify-center items-center text-center pr-2 h-full pt-[1.5px]">
                    <div className="leading-none flex items-baseline justify-center">
                      <span className={`${isNarrowBoard ? 'text-[15.5px]' : 'text-[16.5px]'} font-bold text-slate-900 tracking-tight`}>
                        仙台・小牛田
                      </span>
                      <span className={`${isNarrowBoard ? 'text-[10.5px]' : 'text-[11.5px]'} font-semibold text-slate-900 ml-1`}>
                        方面
                      </span>
                    </div>
                    <span className={`${isNarrowBoard ? 'text-[8px]' : 'text-[8.5px]'} text-slate-900 font-medium leading-none mt-[2px] font-english`}>
                      for Sendai &amp; Kogota
                    </span>
                  </div>

                  {/* 右側：緑バー ＋ 東北本線 ＋ のりば数字「3」 */}
                  <div className={`flex items-end ${isNarrowBoard ? 'gap-3.5' : 'gap-5'} shrink-0 h-full`}>
                    <div className="flex items-end gap-1.5 self-end pb-[5.5px]">
                      <div className="w-2.5 self-stretch -mb-[5.5px] shrink-0 shadow-2xs" style={{ backgroundColor: LINE_COLORS.tohoku }} />
                      <div className="flex flex-col justify-end items-center text-center leading-none">
                        <span className="text-[12px] font-bold text-slate-900 block leading-none">
                          東北本線
                        </span>
                        <span className="text-[7.5px] text-slate-900 font-semibold block leading-none mt-[2px] font-english tracking-wide">
                          Tōhoku Line
                        </span>
                      </div>
                    </div>

                    <div className="h-full flex items-center justify-center shrink-0">
                      <TrackNumeral num="3" className="h-[33px] w-auto text-slate-900" />
                    </div>
                  </div>
                </div>
              );
            }

            if (isNatoriTrack2Variant) {
              return (
                /* ── Variant 4: 名取2番線（仙台空港アクセス線・のりば「2」左） ── */
                <div className={`bg-[#f7f8fa] text-slate-900 ${isNarrowBoard ? 'px-2.5' : 'px-3'} h-[48px] border-b-2 border-neutral-950 flex items-center justify-between select-none relative font-signboard overflow-hidden`}>
                  {/* 左側：のりば「2」 ＋ 仙台空港アクセス線 ＋ 底面接地青バー */}
                  <div className={`flex items-end ${isNarrowBoard ? 'gap-3' : 'gap-3.5'} shrink-0 h-full`}>
                    <div className="h-full flex items-center justify-center shrink-0">
                      <TrackNumeral num="2" className="h-[33px] w-auto text-slate-900" />
                    </div>

                    <div className="flex items-end gap-1.5 self-end pb-[5.5px]">
                      <div className="flex flex-col justify-end items-center text-center leading-none">
                        <span className="text-[11px] font-bold text-slate-900 block leading-none tracking-tight whitespace-nowrap">
                          仙台空港アクセス線
                        </span>
                        <span className="text-[7px] text-slate-900 font-semibold block leading-none mt-[2px] font-english tracking-tight whitespace-nowrap">
                          Sendai Airport Access Line
                        </span>
                      </div>
                      <div className="w-2.5 self-stretch -mb-[5.5px] shrink-0 shadow-2xs" style={{ backgroundColor: LINE_COLORS.saal }} />
                    </div>
                  </div>

                  {/* 右側：仙台・仙台空港 方面 */}
                  <div className="flex-1 flex flex-col justify-center items-center text-center pl-2 h-full pt-[1.5px]">
                    <div className="leading-none flex items-baseline justify-center whitespace-nowrap">
                      <span className="text-[16px] font-bold text-slate-900 tracking-tight">
                        仙台・仙台空港
                      </span>
                      <span className="text-[11px] font-semibold text-slate-900 ml-1">
                        方面
                      </span>
                    </div>
                    <span className="text-[8.5px] text-slate-900 font-medium leading-none mt-[2px] font-english whitespace-nowrap">
                      for Sendai &amp; Sendai Airport
                    </span>
                  </div>
                </div>
              );
            }

            if (isDownboundLeftVariant) {
              /* ── Variant 2: のりば数字(左) ＋ 東北本線 ＋ 底辺接地緑バー ＋ 仙台・小牛田方面(右) ── */
              return (
                <div className={`bg-[#f7f8fa] text-slate-900 ${isNarrowBoard ? 'px-2.5' : 'px-3'} h-[48px] border-b-2 border-neutral-950 flex items-center justify-between select-none relative font-signboard overflow-hidden`}>
                  <div className={`flex items-end ${isNarrowBoard ? 'gap-3.5' : 'gap-5'} shrink-0 h-full`}>
                    <div className={`h-full flex items-center justify-center shrink-0 ${activeTrack === '1' ? 'pl-2' : ''}`}>
                      <TrackNumeral num={activeTrack} className="h-[33px] w-auto text-slate-900" />
                    </div>

                    <div className="flex items-end gap-1.5 self-end pb-[5.5px]">
                      <div className="flex flex-col justify-end items-center text-center leading-none">
                        <span className="text-[12px] font-bold text-slate-900 block leading-none">
                          東北本線
                        </span>
                        <span className="text-[7.5px] text-slate-900 font-semibold block leading-none mt-[2px] font-english tracking-wide">
                          Tōhoku Line
                        </span>
                      </div>

                      <div className="w-2.5 self-stretch -mb-[5.5px] shrink-0 shadow-2xs" style={{ backgroundColor: LINE_COLORS.tohoku }} />
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-center items-center text-center pl-2 h-full pt-[1.5px]">
                    <div className="leading-none flex items-baseline justify-center">
                      <span className={`${isNarrowBoard ? 'text-[15.5px]' : 'text-[16.5px]'} font-bold text-slate-900 tracking-tight`}>
                        仙台・小牛田
                      </span>
                      <span className={`${isNarrowBoard ? 'text-[10.5px]' : 'text-[11.5px]'} font-semibold text-slate-900 ml-1`}>
                        方面
                      </span>
                    </div>
                    <span className={`${isNarrowBoard ? 'text-[8px]' : 'text-[8.5px]'} text-slate-900 font-medium leading-none mt-[2px] font-english`}>
                      for Sendai &amp; Kogota
                    </span>
                  </div>
                </div>
              );
            }

            // Fallback (Variant 2準拠)
            return (
              <div className={`bg-[#f7f8fa] text-slate-900 ${isNarrowBoard ? 'px-2.5' : 'px-3'} h-[48px] border-b-2 border-neutral-950 flex items-center justify-between select-none relative font-signboard overflow-hidden`}>
                <div className={`flex items-end ${isNarrowBoard ? 'gap-3.5' : 'gap-5'} shrink-0 h-full`}>
                  <div className={`h-full flex items-center justify-center shrink-0 ${activeTrack === '1' ? 'pl-2' : ''}`}>
                    <TrackNumeral num={activeTrack} className="h-[33px] w-auto text-slate-900" />
                  </div>

                  <div className="flex items-end gap-1.5 self-end pb-[5.5px]">
                    <div className="flex flex-col justify-end items-center text-center leading-none">
                      <span className="text-[12px] font-bold text-slate-900 block leading-none">
                        東北本線
                      </span>
                      <span className="text-[7.5px] text-slate-900 font-semibold block leading-none mt-[2px] font-english tracking-wide">
                        Tōhoku Line
                      </span>
                    </div>

                    <div className="w-2.5 self-stretch -mb-[5.5px] shrink-0 shadow-2xs" style={{ backgroundColor: LINE_COLORS.tohoku }} />
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-center items-center text-center pl-2 h-full pt-[1.5px]">
                  <div className="leading-none flex items-baseline justify-center">
                    <span className={`${isNarrowBoard ? 'text-[15.5px]' : 'text-[16.5px]'} font-bold text-slate-900 tracking-tight`}>
                      仙台・小牛田
                    </span>
                    <span className={`${isNarrowBoard ? 'text-[10.5px]' : 'text-[11.5px]'} font-semibold text-slate-900 ml-1`}>
                      方面
                    </span>
                  </div>
                  <span className={`${isNarrowBoard ? 'text-[8px]' : 'text-[8.5px]'} text-slate-900 font-medium leading-none mt-[2px] font-english`}>
                    for Sendai &amp; Kogota
                  </span>
                </div>
              </div>
            );
          })()}

          {/* ================= 下部：LED発車標筐体 ================= */}
          <div className="bg-[#0a0c0e] px-2.5 pt-1 pb-1 select-none">
            {/* 実機のLEDドットマトリクス表示窓（インセット画面・角ばった直角ベゼル） */}
            <div
              className={`${
                stationId === 'minami-sendai'
                  ? 'w-[86%] max-w-[275px] mx-auto px-1 '
                  : isNarrowBoard
                  ? 'w-[80%] max-w-[260px] mx-auto px-1 '
                  : isNagamachiTaishido
                  ? 'px-0 '
                  : 'px-1 '
              }rounded-none py-0 font-led shadow-[inset_0_1px_3px_rgba(0,0,0,0.9)] border border-neutral-950`}
              style={bgStyle}
            >
              {/* 1段目と2段目の間隔：新陽社モジュールに準拠（南仙台は密着gap-0、長町・名取はgap-[1px]） */}
              <div className={`flex flex-col ${stationId === 'minami-sendai' ? 'gap-0' : isNagamachiTaishido || stationId === 'natori' ? 'gap-[1px]' : 'gap-[6px]'}`}>
                {rows.map((train, i) => {
                  if (!train) {
                    if (stationId === 'minami-sendai') return <div key={`e-${i}`} className="w-full aspect-[10/1] max-h-[26px]" />;
                    return <div key={`e-${i}`} className={isNagamachiTaishido || stationId === 'natori' ? "h-[24px]" : "h-[25px]"} />;
                  }

                  const dc = getDestinationLedColor(stationId, train.direction || direction, train.line, train.destination);

                  // Case A: nagamachi / taishido（実機312×24dot確定仕様: 21空白 + 52種別 + 8空白 + 43両数 + 21空白 + 71時刻 + 96行先 = 312dot）
                  if (isNagamachiTaishido) {
                    const cleanDest = train.destination.trim();
                    const chType0 = train.trainType[0] ?? '普';
                    const chType1 = train.trainType[1] ?? '通';

                    return (
                      <div
                        key={train.id}
                        className="w-full h-[24px] text-[24px] font-bold leading-none grid grid-cols-[21fr_52fr_8fr_43fr_21fr_71fr_96fr] items-center whitespace-nowrap rounded-none cursor-default min-w-0"
                      >
                        {/* 1. 左端余白: 21dot */}
                        <span className="h-full w-full" />

                        {/* 2. 種別: 52dot (24 + 4 + 24 = 52dot) */}
                        <div className={`h-full w-full flex items-center justify-center p-0 overflow-hidden leading-[24px] ${LED_COLOR_CLASSES[theme.typeColor]}`}>
                          {(() => {
                            const typeDots = getDestinationDots(stationId, train.trainType);
                            if (typeDots) {
                              return (
                                <DotLedBitmap
                                  dots={typeDots}
                                  targetWidth={52}
                                  className="h-full w-full block"
                                  preserveAspectRatio="xMidYMid meet"
                                  ariaLabel={train.trainType}
                                />
                              );
                            }
                            const c0Dots = getDestinationDots(stationId, chType0);
                            const c1Dots = getDestinationDots(stationId, chType1);
                            return (
                              <div className="w-full h-full grid grid-cols-[24fr_4fr_24fr] items-center text-center text-[20px] leading-none py-[2px]">
                                <div className="h-full w-full flex items-center justify-center overflow-hidden">
                                  {c0Dots ? (
                                    <DotLedBitmap
                                      dots={c0Dots}
                                      targetWidth={24}
                                      className="h-full w-full block"
                                      preserveAspectRatio="xMidYMid meet"
                                      ariaLabel={chType0}
                                    />
                                  ) : (
                                    <span className="h-[20px] flex items-center justify-center">{chType0}</span>
                                  )}
                                </div>
                                <span className="h-full w-full" />
                                <div className="h-full w-full flex items-center justify-center overflow-hidden">
                                  {c1Dots ? (
                                    <DotLedBitmap
                                      dots={c1Dots}
                                      targetWidth={24}
                                      className="h-full w-full block"
                                      preserveAspectRatio="xMidYMid meet"
                                      ariaLabel={chType1}
                                    />
                                  ) : (
                                    <span className="h-[20px] flex items-center justify-center">{chType1}</span>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        {/* 3. 種別〜両数の間: 8dot */}
                        <span className="h-full w-full" />

                        {/* 4. 両数: 43dot (16 + 3 + 24 = 43dot) */}
                        <div className={`h-full w-full flex items-center justify-center p-0 overflow-hidden leading-[24px] ${LED_COLOR_CLASSES[theme.carsColor]}`}>
                          {(() => {
                            const carsText = `${train.cars}両`;
                            const carsDots = getDestinationDots(stationId, carsText);
                            if (carsDots) {
                              return (
                                <DotLedBitmap
                                  dots={carsDots}
                                  targetWidth={43}
                                  className="h-full w-full block"
                                  preserveAspectRatio="xMidYMid meet"
                                  ariaLabel={carsText}
                                />
                              );
                            }
                            const carsNumStr = String(train.cars);
                            const carsNumDots =
                              getDestinationDots(stationId, `両数_${carsNumStr}`) ||
                              getDestinationDots(stationId, `両数${carsNumStr}`);
                            const ryoDots = getDestinationDots(stationId, '両');
                            return (
                              <div className="w-full h-full grid grid-cols-[16fr_3fr_24fr] items-center text-center leading-[24px] py-[2px] text-[20px]">
                                <div className="h-full w-full flex items-center justify-center overflow-hidden">
                                  {carsNumDots ? (
                                    <DotLedBitmap
                                      dots={carsNumDots}
                                      targetWidth={16}
                                      className="h-full w-full block"
                                      preserveAspectRatio="xMidYMid meet"
                                      ariaLabel={carsNumStr}
                                    />
                                  ) : (
                                    <span className="h-[20px] flex items-center justify-center leading-none">{toFW(train.cars)}</span>
                                  )}
                                </div>
                                <span className="h-full w-full" />
                                <div className="h-full w-full flex items-center justify-center overflow-hidden">
                                  {ryoDots ? (
                                    <DotLedBitmap
                                      dots={ryoDots}
                                      targetWidth={24}
                                      className="h-full w-full block"
                                      preserveAspectRatio="xMidYMid meet"
                                      ariaLabel="両"
                                    />
                                  ) : (
                                    <span className="h-[20px] flex items-center justify-center leading-none">両</span>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        {/* 5. 両数〜時刻の間: 21dot */}
                        <span className="h-full w-full" />

                        {/* 6. 発車時刻: 71dot (16 + 16 + 7 + 16 + 16 = 71dot) */}
                        <div className={`h-full w-full flex items-center justify-center p-0 overflow-hidden ${LED_COLOR_CLASSES[theme.timeColor]}`}>
                          <DotLedText
                            text={train.departureTime}
                            stationId={stationId}
                            targetWidth={71}
                            className="h-full w-full block"
                            preserveAspectRatio="xMidYMid meet"
                          />
                        </div>

                        {/* 7. 行先: 96dot (24 × 4 = 96dot、時刻の直後から右端まで、上下2dot空き再現) */}
                        <div className={`h-full w-full flex items-center justify-center p-0 overflow-hidden leading-[24px] ${LED_COLOR_CLASSES[dc]}`}>
                          {(() => {
                            const destDots = getDestinationDots(stationId, cleanDest);
                            if (destDots) {
                              return (
                                <DotLedBitmap
                                  dots={destDots}
                                  targetWidth={96}
                                  className="h-full w-full block"
                                  preserveAspectRatio="xMidYMid meet"
                                  ariaLabel={cleanDest}
                                />
                              );
                            }
                            if (cleanDest.length === 2) {
                              /* 2文字行先: 12dot空白 + 24dot(1文字目) + 24dot空白 + 24dot(2文字目) + 12dot空白 = 96dot（上下2dot空き） */
                              return (
                                <div className="w-full h-full grid grid-cols-[12fr_24fr_24fr_24fr_12fr] items-center text-center text-[20px] leading-none py-[2px]">
                                  <span className="h-full w-full" />
                                  <span className="h-[20px] flex items-center justify-center">{cleanDest[0]}</span>
                                  <span className="h-full w-full" />
                                  <span className="h-[20px] flex items-center justify-center">{cleanDest[1]}</span>
                                  <span className="h-full w-full" />
                                </div>
                              );
                            }
                            if (cleanDest.length === 3) {
                              /* 3文字行先: 12dot空白 + 24dot×3文字 + 12dot空白 = 96dot（上下2dot空き） */
                              return (
                                <div className="w-full h-full grid grid-cols-[12fr_24fr_24fr_24fr_12fr] items-center text-center text-[20px] leading-none py-[2px]">
                                  <span className="h-full w-full" />
                                  <span className="h-[20px] flex items-center justify-center">{cleanDest[0]}</span>
                                  <span className="h-[20px] flex items-center justify-center">{cleanDest[1]}</span>
                                  <span className="h-[20px] flex items-center justify-center">{cleanDest[2]}</span>
                                  <span className="h-full w-full" />
                                </div>
                              );
                            }
                            /* 4文字行先: 24dot×4文字 = 96dot（上下2dot空き） */
                            return (
                              <div className="w-full h-full grid grid-cols-[24fr_24fr_24fr_24fr] items-center text-center text-[20px] leading-none py-[2px]">
                                <span className="h-[20px] flex items-center justify-center">{cleanDest[0]}</span>
                                <span className="h-[20px] flex items-center justify-center">{cleanDest[1]}</span>
                                <span className="h-[20px] flex items-center justify-center">{cleanDest[2]}</span>
                                <span className="h-[20px] flex items-center justify-center">{cleanDest[3]}</span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  }

                  // Case B: natori
                  if (stationId === 'natori') {
                    // 名取駅は番線に関係なく、「普通何両」の表示色が上り=緑、下り=オレンジ
                    const trainDir = train.direction || direction;
                    const comboColor: LedColor = trainDir === 'up' ? 'green' : 'amber';

                    return (
                      <div
                        key={train.id}
                        className="w-full h-[24px] text-[24px] font-bold leading-none grid grid-cols-[repeat(10,minmax(0,1fr))] items-center whitespace-nowrap rounded-none cursor-default"
                      >
                        {/* 1〜3マス目: 種別・両数（3文字幅枠に4文字を美しく収める16dot準拠の小型フォント）
                            名取駅は番線に関係なく「普通何両」が上り緑・下りオレンジ */}
                        <div className={`col-span-3 h-full flex items-center justify-center ${LED_COLOR_CLASSES[comboColor]}`}>
                          {(() => {
                            const comboText = `${train.trainType}${train.cars}両`;
                            const comboDots = getDestinationDots('natori', comboText);
                            if (comboDots) {
                              return <DotLedBitmap dots={comboDots} className="h-full w-auto max-w-full" ariaLabel={comboText} />;
                            }
                            return (
                              <div className="w-full h-full grid grid-cols-4 items-center text-center text-[15px] leading-none font-bold py-[2px]">
                                <span className={`h-[20px] flex items-center justify-center ${LED_COLOR_CLASSES[comboColor]}`}>{train.trainType[0] ?? '普'}</span>
                                <span className={`h-[20px] flex items-center justify-center ${LED_COLOR_CLASSES[comboColor]}`}>{train.trainType[1] ?? '通'}</span>
                                <span className={`h-[20px] flex items-center justify-center ${LED_COLOR_CLASSES[comboColor]}`}>{toFW(train.cars)}</span>
                                <span className={`h-[20px] flex items-center justify-center ${LED_COLOR_CLASSES[comboColor]}`}>両</span>
                              </div>
                            );
                          })()}
                        </div>

                        {/* 4〜6マス目: 発車時刻（名取駅・長町型専用手打ちドット・上下2dot余白込みで完全フィット） */}
                        <div className={`col-span-3 h-full flex items-center justify-end pr-1 ${LED_COLOR_CLASSES[theme.timeColor]}`}>
                          <DotLedText text={train.departureTime} stationId={stationId} className="h-full w-auto" />
                        </div>

                        {/* 7〜10マス目: 行先（高さ20dot完全維持） */}
                        {renderDestGrid(train.destination, dc, stationId)}
                      </div>
                    );
                  }

                  // Case C: minami-sendai
                  // 南仙台駅: stationLedData.json の slots 定義に基づき完全データ駆動描画
                  const minamiSendaiTrack = train.track || (activeTrack === '3' ? '3' : activeTrack === '2' ? '2' : '1');
                  return (
                    <LedSlotRow
                      key={train.id}
                      train={train}
                      stationId="minami-sendai"
                      direction={direction}
                      track={minamiSendaiTrack}
                      typeColor={theme.typeColor}
                      carsColor={theme.carsColor}
                      timeColor={theme.timeColor}
                      trackColor={theme.trackColor ?? 'green'}
                      aspectRatio="10/1"
                      className="max-h-[26px]"
                    />
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      </div>
      </FixedRatioBoardWrapper>
    );
  }

  /* ─────────────────────────────────────────────────────────────
     4. フォールバック表示
     ───────────────────────────────────────────────────────────── */
  return (
    <FixedRatioBoardWrapper baseWidth={baseWidth}>
      <div className="w-full">
      <div className="rounded-none border border-neutral-800 bg-[#060806] px-2.5 py-0 font-led select-none" style={bgStyle}>
        <div className="flex flex-col gap-[6px]">
          {rows.map((train, i) => {
            if (!train) {
              if (i === 1 && rows[0]?.remarks) {
                return (
                  <div key="notice" className={`h-[26px] flex items-center text-[20px] font-bold tracking-wide ${LED_COLOR_CLASSES.amber}`}>
                    {rows[0].remarks || noticeText}
                  </div>
                );
              }
              return <div key={`e-${i}`} className="h-[26px]" />;
            }

            const dc = getDestinationLedColor(stationId, train.direction || direction, train.line, train.destination);

            return (
              <div
                key={train.id}
                className={`${rowBase} justify-between cursor-default`}
              >
                <span className={`w-[48px] text-center tracking-widest ${LED_COLOR_CLASSES[theme.typeColor]}`}>{train.trainType}</span>
                <Time t={train.departureTime} color={theme.timeColor} />
                <span className="flex-1 flex justify-center">
                  <Dest text={train.destination} color={dc} stationId={stationId} />
                </span>
                <span className={`w-[68px] text-right tracking-tight ${LED_COLOR_CLASSES[theme.carsColor]}`}>{train.cars}両編成</span>
              </div>
            );
          })}
        </div>
      </div>
      </div>
    </FixedRatioBoardWrapper>
  );
};

export default StationBoard;
