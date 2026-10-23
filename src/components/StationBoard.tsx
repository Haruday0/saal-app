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
  amber: 'text-[#f59e0b] drop-shadow-[0_0_3px_rgba(245,158,11,0.5)]',
  green: 'text-[#22c55e] drop-shadow-[0_0_3px_rgba(34,197,94,0.5)]',
  red: 'text-[#ef4444] drop-shadow-[0_0_3px_rgba(239,68,68,0.5)]',
  white: 'text-[#f0f4f8] drop-shadow-[0_0_3px_rgba(240,244,248,0.5)]',
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

export const STATION_BOARD_WIDTH_CLASSES: Record<string, string> = {
  'minami-sendai': 'w-full max-w-[285px]',
  natori: 'w-full max-w-[345px]',
  sendai: 'w-full max-w-[370px]',
  nagamachi: 'w-full max-w-[385px]',
  taishido: 'w-full max-w-[385px]',
  morisekinoshita: 'w-full max-w-[370px]',
  mitazono: 'w-full max-w-[370px]',
  'sendai-airport': 'w-full max-w-[370px]',
};

/* ── ユーティリティ ── */

function toFW(n: number): string {
  const d = ['０','１','２','３','４','５','６','７','８','９'];
  return String(n).split('').map(c => d[parseInt(c,10)] ?? c).join('');
}

/* ── サブコンポーネント ── */

/** 行先セル — 実機写真通り、行先枠を固定幅にして文字数（2字/3字/4字）による発車時刻のズレを100%防止 */
const Dest: React.FC<{ text: string; color: LedColor }> = ({ text, color }) => {
  const cls = `${LED_COLOR_CLASSES[color]} whitespace-nowrap`;
  const clean = text.trim();

  // 2文字（山下、白石、福島、岩沼、仙台など）は実機写真のように「山　下」「仙　台」と間に全角スペース
  if (clean.length === 2) {
    return (
      <span className={`inline-block w-[88px] text-center tracking-wider ${cls}`}>
        {clean[0]}　{clean[1]}
      </span>
    );
  }
  // 3文字（原ノ町、小牛田、いわきなど）
  if (clean.length === 3) {
    return (
      <span className={`inline-block w-[88px] text-center tracking-normal ${cls}`}>
        {clean}
      </span>
    );
  }
  // 4文字（仙台空港など）
  return (
    <span className={`inline-block w-[88px] text-center tracking-tight ${cls}`}>
      {clean}
    </span>
  );
};

/** 時刻セル — 実機写真通り緑色で右寄せ、固定幅で全行の縦位置を完全一致 */
const Time: React.FC<{ t?: string; color: LedColor }> = ({ t, color }) => {
  if (!t) return <span className="inline-block w-[54px]" />;
  const padded = t.length === 4 ? `\u2007${t}` : t;
  return (
    <span className={`inline-block w-[54px] text-right tracking-wider whitespace-pre ${LED_COLOR_CLASSES[color]}`}>
      {padded}
    </span>
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
  return <span className="font-track font-normal leading-none">{n}</span>;
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
  const isNagamachiTaishido = stationId === 'nagamachi' || stationId === 'taishido';

  const activeTrack = useMemo(() => {
    if (track) return track;
    if (selectedTrain?.track) return selectedTrain.track;
    if (trains[0]?.track) return trains[0].track;
    if (stationId === 'minami-sendai') return direction === 'up' ? '1' : '2';
    if (isNagamachiTaishido) return direction === 'up' ? '2' : '1';
    if (stationId === 'natori') return direction === 'up' ? '1' : '2';
    return 'default';
  }, [track, selectedTrain, trains, stationId, direction, isNagamachiTaishido]);

  const theme = useMemo(() => {
    const st = STATION_TRACK_THEMES[stationId] ?? STATION_TRACK_THEMES.nagamachi;
    const base = st[activeTrack] ?? st.default ?? Object.values(st)[0];
    return { ...base, ...getStationThemeColors(stationId, direction, base) };
  }, [stationId, activeTrack, direction]);

  const rows: (DepartureTrain | null)[] = useMemo(() => [trains[0] ?? null, trains[1] ?? null], [trains]);

  const bgStyle: React.CSSProperties = {
    backgroundColor: '#16191d',
  };

  const rowBase = 'w-full h-[26px] text-[23px] font-bold leading-none flex items-center whitespace-nowrap rounded-none px-1 transition';

  const containerWidthClass = STATION_BOARD_WIDTH_CLASSES[stationId] || 'w-full max-w-[400px]';

  /* ─────────────────────────────────────────────────────────────
     1. 長町駅・太子堂駅型（実機看板一体型・1番線/2番線 完全再現）
     ───────────────────────────────────────────────────────────── */
  if (isNagamachiTaishido) {
    return (
      <div className={`${containerWidthClass} mx-auto transition-all duration-300 font-sans`}>
        {/* 実機の一体型アルミ筐体フレーム（角ばった90度直角デザイン） */}
        <div className="rounded-none border-2 border-slate-600 bg-neutral-900 shadow-xl overflow-hidden">
          
          {/* ================= 上部看板（実機写真計測に基づくアスペクト比約7.48:1デザイン） ================= */}
          {direction === 'down' ? (
            /* ── 1番線（下り: 仙台方面）実機計測比率準拠：上下の余白を完全対称（均等）に配置 ── */
            <div className="bg-[#f7f8fa] text-slate-900 px-3 h-[48px] border-b-2 border-neutral-950 flex items-center justify-between select-none relative font-signboard overflow-hidden">
              {/* 左側：のりば数字「1」 ＋ 2番線と同一の広い間隔（gap-5） ＋ 東北本線 ＋ 下にくっつき文字頭まで伸びる緑バー */}
              <div className="flex items-end gap-5 shrink-0 h-full">
                {/* のりば「1」：元のサイズ（35px）に戻し */}
                <div className="h-full flex items-center justify-center shrink-0">
                  <TrackNumeral num="1" className="h-[35px] w-auto text-slate-900" />
                </div>

                {/* 東北本線テキスト ＋ 底辺接地緑バーの一体ブロック */}
                <div className="flex items-end gap-1.5 self-end pb-[5.5px]">
                  <div className="flex flex-col justify-end items-center text-center leading-none">
                    <span className="text-[12px] font-bold text-slate-900 block leading-none">
                      東北本線
                    </span>
                    <span className="text-[7.5px] text-slate-900 font-semibold block leading-none mt-[2px] font-english tracking-wide">
                      Tōhoku Line
                    </span>
                  </div>

                  {/* 縦長緑バー：看板底辺に接地し、上端は左の「東北本線」文字頭の高さまで伸びる */}
                  <div className="w-2.5 self-stretch -mb-[5.5px] bg-[#009e44] shrink-0 shadow-2xs" />
                </div>
              </div>

              {/* 右側：仙台・小牛田 方面（漢字の頭と英語の底の上下余白を完全均等化） */}
              <div className="flex-1 flex flex-col justify-center items-center text-center pl-2 h-full pt-[1.5px]">
                <div className="leading-none flex items-baseline justify-center">
                  <span className="text-[16.5px] font-bold text-slate-900 tracking-tight">
                    仙台・小牛田
                  </span>
                  <span className="text-[11.5px] font-semibold text-slate-900 ml-1">
                    方面
                  </span>
                </div>
                <span className="text-[8.5px] text-slate-900 font-medium leading-none mt-[2px] font-english">
                  for Sendai &amp; Kogota
                </span>
              </div>
            </div>
          ) : (
            /* ── 2番線（上り: 空港・白石方面）方面(左)・路線名(中)・「2」(右) ── */
            <div className="bg-[#f7f8fa] text-slate-900 px-2 h-[48px] border-b-2 border-neutral-950 flex items-center justify-between select-none relative font-signboard overflow-hidden">
              {/* 左〜中央エリア：上段（東北本線・アクセス線）と下段（常磐線）の2行構造
                  行間を固定（gap-[2.5px]）して広がりすぎを防止し、ブロック全体を看板中央に均等配置 */}
              <div className="flex-1 flex flex-col justify-center gap-[2.5px] h-full pt-[0.5px]">
                
                {/* ── 1行目（上段）：方面・縦長長方形・路線名 ── */}
                <div className="flex items-center justify-between w-full">
                  {/* 左側：方面 */}
                  <div className="flex-1 flex flex-col items-center justify-center text-center pr-1">
                    <div className="leading-none flex items-baseline justify-center whitespace-nowrap">
                      <span className="text-[10px] font-bold text-slate-900 tracking-tight">
                        白石・福島・仙台空港アクセス線
                      </span>
                      <span className="text-[7.5px] font-semibold text-slate-900 ml-0.5">
                        方面
                      </span>
                    </div>
                    <span className="text-[5.5px] text-slate-900 font-medium leading-none mt-[1px] tracking-tight whitespace-nowrap font-english">
                      for Shiroishi, Fukushima &amp; Sendai Airport Access Line
                    </span>
                  </div>

                  {/* 右側：縦長長方形（右揃え） ＋ 路線名（中央揃え） */}
                  <div className="flex items-center gap-1.5 shrink-0 pl-1">
                    {/* 縦長長方形：右揃え */}
                    <div className="flex items-center justify-end gap-[2px] w-[21px] shrink-0">
                      <div className="w-[9.5px] h-[14.5px] bg-[#0085ca] rounded-none" title="アクセス線" />
                      <div className="w-[9.5px] h-[14.5px] bg-[#009e44] rounded-none" title="東北本線" />
                    </div>

                    {/* 路線名：中央揃え（幅固定・「方面」と同じ文字サイズ） */}
                    <div className="flex flex-col justify-between items-center h-[14.5px] text-center w-[44px] shrink-0">
                      <span className="text-[7.5px] font-bold text-slate-900 leading-none">
                        東北本線
                      </span>
                      <span className="text-[5.5px] text-slate-900 font-semibold leading-none font-english">
                        Tōhoku Line
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── 2行目（下段）：方面・縦長長方形・路線名 ── */}
                <div className="flex items-center justify-between w-full">
                  {/* 左側：方面 */}
                  <div className="flex-1 flex flex-col items-center justify-center text-center pr-1">
                    <div className="leading-none flex items-baseline justify-center whitespace-nowrap">
                      <span className="text-[10px] font-bold text-slate-900 tracking-tight">
                        亘理・原ノ町・いわき
                      </span>
                      <span className="text-[7.5px] font-semibold text-slate-900 ml-0.5">
                        方面
                      </span>
                    </div>
                    <span className="text-[5.5px] text-slate-900 font-medium leading-none mt-[1px] tracking-tight whitespace-nowrap font-english">
                      for Watari, Haranomachi &amp; Iwaki
                    </span>
                  </div>

                  {/* 右側：縦長長方形（右揃え） ＋ 路線名（中央揃え） */}
                  <div className="flex items-center gap-1.5 shrink-0 pl-1">
                    {/* 縦長長方形：右揃え（緑長方形の真下にダークブルー長方形が配置） */}
                    <div className="flex items-center justify-end gap-[2px] w-[21px] shrink-0">
                      <div className="w-[9.5px] h-[14.5px] bg-[#0072bc] rounded-none" title="常磐線" />
                    </div>

                    {/* 路線名：中央揃え（幅固定・「方面」と同じ文字サイズ） */}
                    <div className="flex flex-col justify-between items-center h-[14.5px] text-center w-[44px] shrink-0">
                      <span className="text-[7.5px] font-bold text-slate-900 leading-none">
                        常磐線
                      </span>
                      <span className="text-[5.5px] text-slate-900 font-semibold leading-tight font-english">
                        Jōban Line
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* 右端：のりば数字「2」：元のサイズ（35px）に戻し */}
              <div className="pl-4 pr-1 flex items-center justify-center shrink-0 h-full">
                <TrackNumeral num="2" className="h-[35px] w-auto text-slate-900" />
              </div>
            </div>
          )}

          {/* ================= 下部：LED発車標筐体（実機写真計測：実機プロポーション・スリム設計） ================= */}
          <div className="bg-[#0a0c0e] px-2.5 pt-1 pb-1 select-none">
            {/* 実機のLEDドットマトリクス表示窓（インセット画面・角ばった直角ベゼル） */}
            <div
              className="rounded-none px-1 py-[1.5px] font-led shadow-[inset_0_1px_3px_rgba(0,0,0,0.9)] border border-neutral-950"
              style={bgStyle}
            >
              {/* 1段目と2段目の間隔：実機計測4〜5ドット（約6px）間隔に設定 */}
              <div className="flex flex-col gap-[6px]">
                {rows.map((train, i) => {
                  if (!train) return <div key={`e-${i}`} className="h-[25px]" />;

                  const sel = selectedTrain?.id === train.id;
                  const dc = getDestinationLedColor(stationId, train.direction || direction, train.line, train.destination);
                  const paddedTime = train.departureTime.length === 4 ? `\u2007${train.departureTime}` : train.departureTime;

                  return (
                    <button
                      key={train.id}
                      type="button"
                      onClick={() => onSelectTrain(train)}
                      className={`w-full h-[25px] text-[24px] font-bold leading-none grid grid-cols-[repeat(13,minmax(0,1fr))] items-center whitespace-nowrap rounded-none transition ${
                        sel ? 'bg-white/[0.07]' : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      {/* 1〜3マス目: 種別（両端に若干のスペースを持たせて均等配置） */}
                      <div className={`col-span-3 flex items-center justify-around px-0.5 ${LED_COLOR_CLASSES[theme.typeColor]}`}>
                        <span>{train.trainType[0] ?? '普'}</span>
                        <span>{train.trainType[1] ?? '通'}</span>
                      </div>

                      {/* 4〜5マス目: 両数（2文字幅で「数字」「両」） */}
                      <div className={`col-span-2 grid grid-cols-2 text-center ${LED_COLOR_CLASSES[theme.carsColor]}`}>
                        <span>{toFW(train.cars)}</span>
                        <span>両</span>
                      </div>

                      {/* 6マス目: 中央余白（両数と時刻の間の空きすぎを解消した1文字幅枠） */}
                      <span className="col-span-1" />

                      {/* 7〜9マス目: 発車時刻（行先の手前・3文字幅） */}
                      <span className={`col-span-3 text-right pr-0.5 tracking-wider whitespace-pre ${LED_COLOR_CLASSES[theme.timeColor]}`}>
                        {paddedTime}
                      </span>

                      {/* 10〜13マス目: 行先（右端から4文字幅枠） */}
                      <div className={`col-span-4 text-center ${LED_COLOR_CLASSES[dc]}`}>
                        {train.destination.length === 2 ? (
                          <span className="tracking-wider">{train.destination[0]}　{train.destination[1]}</span>
                        ) : train.destination.length === 3 ? (
                          <span className="tracking-normal">{train.destination}</span>
                        ) : (
                          <div className="grid grid-cols-4 text-center">
                            <span>{train.destination[0]}</span>
                            <span>{train.destination[1]}</span>
                            <span>{train.destination[2]}</span>
                            <span>{train.destination[3]}</span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────────
     2. SAT（仙台空港鉄道 杜せきのした・美田園・仙台空港）
     ───────────────────────────────────────────────────────────── */
  if (theme.layout === 'sat-common') {
    return (
      <div className={`${containerWidthClass} mx-auto transition-all duration-300`}>
        <div className="rounded-none border border-neutral-800 bg-[#060806] px-2.5 py-1.5 font-led select-none shadow-md" style={bgStyle}>
          {/* 白色LED実機のタイトル行 */}
          <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-neutral-800 text-[9px] text-neutral-400 font-sans whitespace-nowrap">
            <span className="w-[48px] text-center">種別</span>
            <span className="w-[56px] text-center">時刻</span>
            <span className="flex-1 text-center">行先</span>
            <span className="w-[68px] text-right">両数</span>
          </div>

          <div className="flex flex-col gap-[6px]">
            {rows.map((train, i) => {
              if (!train) {
                if (i === 1 && rows[0]) {
                  return (
                    <div key="notice" className={`h-[26px] flex items-center text-[20px] font-bold tracking-wide ${LED_COLOR_CLASSES.amber}`}>
                      {rows[0].remarks || noticeText}
                    </div>
                  );
                }
                return <div key={`e-${i}`} className="h-[26px]" />;
              }
              const sel = selectedTrain?.id === train.id;
              return (
                <button
                  key={train.id}
                  type="button"
                  onClick={() => onSelectTrain(train)}
                  className={`${rowBase} justify-between ${sel ? 'bg-white/[0.08]' : 'hover:bg-white/[0.03]'}`}
                >
                  <span className={`w-[48px] text-center tracking-widest ${LED_COLOR_CLASSES[theme.typeColor]}`}>{train.trainType}</span>
                  <Time t={train.departureTime} color={theme.timeColor} />
                  <span className="flex-1 flex justify-center">
                    <Dest text={train.destination} color={getDestinationLedColor(stationId, train.direction || direction, train.line, train.destination)} />
                  </span>
                  <span className={`w-[68px] text-right tracking-tight ${LED_COLOR_CLASSES[theme.carsColor]}`}>{train.cars}両編成</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────────
     3. JR各駅（南仙台・名取・仙台）
     ───────────────────────────────────────────────────────────── */
  return (
    <div className={`${containerWidthClass} mx-auto transition-all duration-300`}>
      <div className="rounded-none border border-neutral-800 bg-[#060806] px-2.5 py-1.5 font-led select-none shadow-md" style={bgStyle}>
        
        {/* 南仙台駅・名取駅・仙台駅の実機LED表示行 */}
        <div className="flex flex-col gap-[6px]">
          {rows.map((train, i) => {
            if (!train) return <div key={`e-${i}`} className="h-[26px]" />;

            const sel = selectedTrain?.id === train.id;
            const dc = getDestinationLedColor(stationId, train.direction || direction, train.line, train.destination);
            const fwCars = `${toFW(train.cars)}両`;

            return (
              <button
                key={train.id}
                type="button"
                onClick={() => onSelectTrain(train)}
                className={`${rowBase} justify-between ${sel ? 'bg-white/[0.08]' : 'hover:bg-white/[0.03]'}`}
              >
                {/* 仙台: [普通] ──── [16:58] [小牛田] */}
                {theme.layout === 'jr-sendai' && (<>
                  <span className={`w-[44px] tracking-wider ${LED_COLOR_CLASSES[theme.typeColor]}`}>{train.trainType}</span>
                  <span className="flex-1" />
                  <Time t={train.departureTime} color={theme.timeColor} />
                  <span className="w-2" />
                  <Dest text={train.destination} color={dc} />
                </>)}

                {/* 南仙台1番線（上り）: [６両] ──── [8:23] [原ノ町] [1] */}
                {theme.layout === 'jr-minami-sendai-1' && (<>
                  <span className={`w-[44px] tracking-wider ${LED_COLOR_CLASSES[theme.carsColor]}`}>{fwCars}</span>
                  <span className="flex-1" />
                  <Time t={train.departureTime} color={theme.timeColor} />
                  <span className="w-1.5" />
                  <Dest text={train.destination} color={dc} />
                  <span className={`w-[20px] text-right ml-1 ${LED_COLOR_CLASSES[theme.trackColor ?? 'green']}`}>{train.track}</span>
                </>)}

                {/* 南仙台2番線（下り）: [６両] ──── [8:29] [仙　台] */}
                {theme.layout === 'jr-minami-sendai-2' && (<>
                  <span className={`w-[44px] tracking-wider ${LED_COLOR_CLASSES[theme.carsColor]}`}>{fwCars}</span>
                  <span className="flex-1" />
                  <Time t={train.departureTime} color={theme.timeColor} />
                  <span className="w-1.5" />
                  <Dest text={train.destination} color={dc} />
                </>)}

                {/* 名取: [普通６両] [22:43] ──── [白　石] */}
                {theme.layout === 'jr-natori' && (<>
                  <span className="inline-grid grid-cols-4 w-[84px] text-center leading-none">
                    <span className={LED_COLOR_CLASSES[theme.typeColor]}>{train.trainType[0] ?? '普'}</span>
                    <span className={LED_COLOR_CLASSES[theme.typeColor]}>{train.trainType[1] ?? '通'}</span>
                    <span className={LED_COLOR_CLASSES[theme.carsColor]}>{toFW(train.cars)}</span>
                    <span className={LED_COLOR_CLASSES[theme.carsColor]}>両</span>
                  </span>
                  <Time t={train.departureTime} color={theme.timeColor} />
                  <span className="flex-1" />
                  <Dest text={train.destination} color={dc} />
                </>)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StationBoard;
