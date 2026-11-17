import React, { useMemo } from 'react';
import { Station } from '../types';
import { STATIONS } from '../data/mockData';
import { Chip } from '@heroui/react';
import { Icon } from './Icon';
import { JisTrain, JisSubway } from './icons';
import { getActiveMovingTrains, RealtimeMovingTrain } from '../utils/trainPosition';
import { LINE_COLORS, getLineColor } from '../config/trainLineRules';
import { useDebug } from '../context/DebugContext';

interface RouteMapProps {
  selectedStationId: string | null;
  onSelectStation: (station: Station) => void;
  onSelectTrain?: (train: RealtimeMovingTrain) => void;
  now?: Date;
}

export const RouteMap: React.FC<RouteMapProps> = ({
  selectedStationId,
  onSelectStation,
  onSelectTrain,
  now: propNow,
}) => {
  const { now: debugNow } = useDebug();
  const now = propNow ?? debugNow;

  // 時刻表データ（着時刻・発時刻）から現在走行中・停車中の列車をリアルタイム算出
  const movingTrains = useMemo(() => {
    return getActiveMovingTrains(now);
  }, [now]);

  const downTrains = useMemo(
    () => movingTrains.filter((t) => t.direction === 'down'),
    [movingTrains]
  );
  const upTrains = useMemo(
    () => movingTrains.filter((t) => t.direction === 'up'),
    [movingTrains]
  );

  const handleTrainClick = (train: RealtimeMovingTrain) => {
    if (onSelectTrain) {
      onSelectTrain(train);
      return;
    }
    const st = STATIONS.find((s) => s.id === train.currentStationId);
    if (st) {
      onSelectStation(st);
    }
  };

  return (
    <div className="flex-1 min-h-0 w-full max-w-md mx-auto px-2 sm:px-3 py-1 flex flex-col justify-between select-none overflow-hidden">
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
              <stop offset="0%" stopColor={LINE_COLORS.tohoku} stopOpacity="1" />
              <stop offset="55%" stopColor={LINE_COLORS.tohoku} stopOpacity="0.85" />
              <stop offset="100%" stopColor={LINE_COLORS.tohoku} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* 1. 名取〜仙台間: 青と緑が極細の白い間を入れて1本の帯ストライプとして走る */}
          {/* 左: 緑線（JR東北本線・常磐線） */}
          <line
            x1="47.9"
            y1="50"
            x2="47.9"
            y2="440"
            stroke={LINE_COLORS.tohoku}
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
          <path
            d="M 52.1 50 L 52.1 438 C 52.1 445, 50 447, 50 452 L 50 750"
            fill="none"
            stroke={LINE_COLORS.saal}
            strokeWidth="3.2"
            vectorEffect="non-scaling-stroke"
          />

          {/* 4. 名取〜仙台空港間の単独区間 */}
          <line
            x1="50"
            y1="452"
            x2="50"
            y2="750"
            stroke={LINE_COLORS.saal}
            strokeWidth="4.0"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* ================= 下り列車（仙台方面）オーバーレイレーン ================= */}
        <div className="absolute left-[66px] top-0 bottom-0 w-[58px] pointer-events-none z-20">
          {downTrains.map((train) => (
            <TrainBadge
              key={train.id}
              train={train}
              onClick={() => handleTrainClick(train)}
            />
          ))}
        </div>

        {/* ================= 上り列車（空港・白石方面）オーバーレイレーン ================= */}
        <div className="absolute left-[124px] top-0 bottom-0 w-[58px] pointer-events-none z-20">
          {upTrains.map((train) => (
            <TrainBadge
              key={train.id}
              train={train}
              onClick={() => handleTrainClick(train)}
            />
          ))}
        </div>

        {/* ================= 各駅ノード ＆ 駅名ボタン行（全8駅・1画面完全均等フィット） ================= */}
        {STATIONS.map((station) => {
          const isSelected = selectedStationId === station.id;
          const isNatori = station.id === 'natori';

          return (
            <div
              key={station.id}
              className="relative flex-1 min-h-0 flex items-stretch my-[1px] z-10"
            >
              {/* ================= 1. 駅シンボルノード（線の中心 X=50px と100%完全一致） ================= */}
              <div className="relative w-[66px] shrink-0 flex items-center">
                {/* 名取駅の分岐ラベル */}
                {isNatori && (
                  <div
                    className="absolute left-1 top-1/2 -translate-y-1/2 flex flex-col items-end pr-1 pointer-events-none z-20"
                    style={{ color: LINE_COLORS.tohoku }}
                  >
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
                  <div
                    className={`w-3.5 h-3.5 rounded-full border-2 border-[#2A5CAA] bg-white dark:bg-[#1a1b1e] shadow-xs transition-transform duration-150 ${
                      isSelected ? 'scale-115 ring-2 ring-[#2A5CAA]/40' : ''
                    }`}
                  >
                    <div
                      className={`w-1 h-1 mx-auto my-[3px] rounded-full transition-colors ${
                        isSelected ? 'bg-[#2A5CAA]' : 'bg-transparent'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* ================= 2. 下り列車走行列スペース（仙台方面・幅 58px） ================= */}
              <div className="relative w-[58px] shrink-0 flex items-center justify-center px-1">
                {/* 走行ガイドライン（背景薄線） */}
                <div
                  className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-[1px] pointer-events-none bg-border opacity-70"
                />
              </div>

              {/* ================= 3. 上り列車走行列スペース（空港・東京方面・幅 58px） ================= */}
              <div className="relative w-[58px] shrink-0 flex items-center justify-center px-1">
                {/* 走行ガイドライン（背景薄線） */}
                <div
                  className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-[1px] pointer-events-none bg-border opacity-70"
                />
              </div>

              {/* ================= 4. 駅名 ＆ 接続情報ボタン ================= */}
              <button
                type="button"
                onClick={() => onSelectStation(station)}
                className={`flex-1 min-h-0 flex items-center justify-between text-left px-2.5 py-1 ml-1 rounded-xl border transition-all pointer-events-auto select-none cursor-pointer ${
                  isSelected
                    ? 'border-[#2A5CAA] bg-[#2A5CAA]/12 dark:bg-[#2A5CAA]/25 shadow-xs'
                    : 'border-border bg-surface hover:bg-surface-secondary shadow-2xs'
                }`}
              >
                {/* 駅名 */}
                <div className="min-w-0 pr-1">
                  <div className="flex items-baseline gap-1.5 flex-nowrap">
                    <span className="font-extrabold text-[15px] tracking-tight shrink-0 text-foreground">
                      {station.name}
                    </span>
                    <span className="text-[10px] text-muted font-english hidden xs:inline truncate">
                      {station.nameEn}
                    </span>
                  </div>

                  {/* 特徴タグ（新幹線・地下鉄の乗り換えのみ表示・JISピクトグラム付き） */}
                  {station.id === 'sendai' && (
                    <Chip
                      size="sm"
                      variant="soft"
                      color="default"
                      className="mt-0.5 text-[9.5px] font-bold h-4 px-1.5 gap-1 shrink-0 inline-flex items-center justify-center"
                    >
                      <span className="inline-flex items-center justify-center gap-1 leading-none">
                        <JisTrain size={10} data-slot="custom-icon" className="shrink-0" />
                        <span className="leading-none pt-[0.5px]">新幹線・地下鉄</span>
                      </span>
                    </Chip>
                  )}
                  {station.id === 'nagamachi' && (
                    <Chip
                      size="sm"
                      variant="soft"
                      color="default"
                      className="mt-0.5 text-[9.5px] font-bold h-4 px-1.5 gap-1 shrink-0 inline-flex items-center justify-center"
                    >
                      <span className="inline-flex items-center justify-center gap-1 leading-none">
                        <JisSubway size={10} data-slot="custom-icon" className="shrink-0" />
                        <span className="leading-none pt-[0.5px]">地下鉄</span>
                      </span>
                    </Chip>
                  )}
                </div>

                {/* 詳細矢印 */}
                <Icon
                  name="chevron_right"
                  size={16}
                  className={`shrink-0 transition-transform duration-200 ${
                    isSelected ? 'text-[#2A5CAA] translate-x-0.5' : 'text-muted'
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

/**
 * 路線図上の在線列車バッジ（TrainBadge）
 * 進行方向ノーズ一体型シルエット（進行方向に三角ノーズが突き出す構造）
 */
const TrainBadge: React.FC<{ train: RealtimeMovingTrain; onClick: () => void }> = ({ train, onClick }) => {
  const topPercent = ((train.positionRatio + 0.5) / 8) * 100;
  const lineColor = getLineColor(train.line);
  const isDown = train.direction === 'down';
  const isCompact = !!train.isCompact;
  const noseH = isCompact ? 4.5 : 5;
  const overlap = 2.5;

  return (
    <button
      type="button"
      onClick={onClick}
      className="border-none bg-transparent p-0 m-0 outline-none cursor-pointer"
      style={{
        position: 'absolute',
        top: `${topPercent}%`,
        left: 1.5,
        right: 1.5,
        transform: 'translateY(-50%)',
        pointerEvents: 'auto',
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 下り（仙台方面）: 上向き三角ノーズ */}
      {isDown && (
        <div
          style={{
            width: '100%',
            height: noseH + overlap,
            backgroundColor: lineColor,
            clipPath: `polygon(50% 0px, 100% ${noseH}px, 100% 100%, 0% 100%, 0% ${noseH}px)`,
            marginBottom: -overlap,
            position: 'relative',
            zIndex: 1,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* 4辺ボーダー付き本体四角形 */}
      <div
        style={{
          width: '100%',
          boxSizing: 'border-box',
          position: 'relative',
          zIndex: 0,
          borderColor: lineColor,
          borderWidth: 1.5,
          borderStyle: 'solid',
          backgroundColor: 'var(--train-badge-bg, var(--surface))',
          padding: isCompact ? '1.5px 2.5px' : '2px 2.5px',
          display: isCompact ? 'flex' : undefined,
          alignItems: isCompact ? 'center' : undefined,
          justifyContent: isCompact ? 'center' : undefined,
          borderRadius: isDown
            ? isCompact
              ? '0 0 3px 3px'
              : '0 0 3.5px 3.5px'
            : isCompact
            ? '3px 3px 0 0'
            : '3.5px 3.5px 0 0',
        }}
      >
        {isCompact ? (
          <div
            className="text-center font-extrabold text-[10px] leading-[1.15] text-foreground"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              whiteSpace: 'nowrap',
              letterSpacing: train.destination.length >= 4 ? '-0.04em' : '0.04em',
              paddingTop: '0.5px',
            }}
          >
            {train.destination}
          </div>
        ) : (
          <div className="flex flex-col gap-[1.5px] items-stretch">
            {/* 1段目: 種別 + 両数 */}
            <div className="flex justify-between items-center gap-[1px] flex-nowrap">
              <span
                className="h-[11px] px-[2px] font-extrabold text-[8px] leading-none rounded-[2px] flex items-center justify-center shrink-0 text-white"
                style={{
                  backgroundColor: lineColor,
                }}
              >
                {train.trainType}
              </span>
              <span
                className="font-bold text-[8px] leading-none text-muted"
                style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center' }}
              >
                {train.cars}両
              </span>
            </div>

            {/* 2段目: 行先 */}
            <div
              className="text-center font-extrabold text-[10px] leading-[1.15] text-foreground"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                whiteSpace: 'nowrap',
                letterSpacing: train.destination.length >= 4 ? '-0.04em' : '0.04em',
                paddingTop: '0.5px',
              }}
            >
              {train.destination}
            </div>
          </div>
        )}
      </div>

      {/* 上り（空港・白石方面）: 下向き三角ノーズ */}
      {!isDown && (
        <div
          style={{
            width: '100%',
            height: noseH + overlap,
            backgroundColor: lineColor,
            clipPath: `polygon(0% 0px, 100% 0px, 100% ${overlap}px, 50% 100%, 0% ${overlap}px)`,
            marginTop: -overlap,
            position: 'relative',
            zIndex: 1,
            pointerEvents: 'none',
          }}
        />
      )}
    </button>
  );
};

export default RouteMap;
