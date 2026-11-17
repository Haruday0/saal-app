import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Modal,
  Tabs,
  Button,
  Chip,
  CloseButton,
  ScrollShadow,
  ListBox,
  EmptyState,
  Separator,
} from '@heroui/react';
import { DepartureTrain, LineType } from '../types';
import { isWeekendHolidayOrYearEnd } from '../utils/calendar';
import { LINE_COLORS, getLineColor } from '../config/trainLineRules';
import {
  getScheduledTrainById,
  getCurrentRailwaySeconds,
  toRailwaySeconds,
  ScheduledFullStop,
} from '../utils/trainPosition';
import { Icon } from './Icon';
import { RouteTimeline } from './RouteTimeline';
import { getTimetableDirectionLabels } from '../utils/stationDirection';

interface TimetableModalProps {
  isOpen: boolean;
  onClose: () => void;
  stationId: string;
  allTrains: DepartureTrain[];
  now: Date;
  initialDirection?: 'up' | 'down';
}

/** 鉄道時刻分計算 (4:00〜翌3:59、深夜0〜3時は24〜27時) */
function toRailwayMinutes(t: string): number {
  const parts = t.split(':');
  let h = parseInt(parts[0] || '0', 10);
  const m = parseInt(parts[1] || '0', 10);
  if (h < 4) h += 24;
  return h * 60 + m;
}

/** 駅名から注記を除去して統一 */
function cleanStationName(name?: string | null): string {
  if (!name) return '';
  return name.replace(/\s*\([^\)]+\)/g, '').trim();
}

/** 時刻文字列を旅客案内標準（24時以降は0時台表記: 0:xx）に正規化 */
function formatStopTime(timeStr?: string | null): string {
  if (!timeStr) return '';
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return timeStr;
  let h = parseInt(match[1], 10);
  const m = match[2];
  if (h >= 24) {
    h = h % 24;
  }
  return `${h}:${m}`;
}

type TrainStatus =
  | { kind: 'before' }
  | { kind: 'stopped'; index: number }
  | { kind: 'running'; index: number }
  | { kind: 'arrived' };

/** 全停車駅に基づき現在時刻の運行状況を判定 */
function getTrainStatus(nowSec: number, stops: ScheduledFullStop[]): TrainStatus {
  if (!stops || stops.length === 0) return { kind: 'before' };

  const firstDep = toRailwaySeconds(stops[0].dep);
  if (nowSec < firstDep) return { kind: 'before' };

  for (let i = 0; i < stops.length; i++) {
    const arr = toRailwaySeconds(stops[i].arr);
    const dep = toRailwaySeconds(stops[i].dep);
    if (nowSec >= arr && nowSec <= dep) return { kind: 'stopped', index: i };
    if (i < stops.length - 1 && nowSec > dep && nowSec < toRailwaySeconds(stops[i + 1].arr)) {
      return { kind: 'running', index: i };
    }
  }

  const lastArr = toRailwaySeconds(stops[stops.length - 1].arr);
  if (nowSec >= lastArr) {
    return { kind: 'arrived' };
  }

  return { kind: 'arrived' };
}

export const TimetableModal: React.FC<TimetableModalProps> = ({
  isOpen,
  onClose,
  stationId,
  allTrains,
  now,
  initialDirection = 'up',
}) => {
  const isSendai = stationId === 'sendai';
  const isAirport = stationId === 'sendai-airport';
  // 仙台駅（全便上り）と仙台空港駅（全便下り）は方面切り替え不要
  const showDirectionFilter = !isSendai && !isAirport;

  // 1. 方面フィルター: 「上り」と「下り」の2択
  const [selectedDirection, setSelectedDirection] = useState<'up' | 'down'>(
    isAirport ? 'down' : initialDirection
  );

  // 2. 路線フィルター: 複数選択（マルチセレクト）。初期状態は未選択（＝全路線表示）
  const [selectedLines, setSelectedLines] = useState<LineType[]>([]);

  // 3. 選択中の列車ID（詳細タイムライン表示用、nullで時刻表一覧）
  const [selectedTrainId, setSelectedTrainId] = useState<string | null>(null);

  const prevOpenRef = useRef(false);

  // モーダルオープン時（false -> true）のみフィルター＆選択中列車を初期化
  useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      setSelectedDirection(isAirport ? 'down' : (initialDirection || 'up'));
      setSelectedLines([]);
      setSelectedTrainId(null);
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, stationId, initialDirection, isAirport]);

  const directionLabels = useMemo(() => getTimetableDirectionLabels(stationId), [stationId]);

  // レンダリング中の方面キーの安全なフォールバック
  const validDirection: 'up' | 'down' = isAirport ? 'down' : isSendai ? 'up' : (selectedDirection === 'down' ? 'down' : 'up');

  // 並走区間（仙台〜名取）かつ上り（または仙台駅）で路線絞り込みを表示
  const hasMultipleLines = ['sendai', 'nagamachi', 'taishido', 'minami-sendai', 'natori'].includes(stationId);
  const showLineFilter = hasMultipleLines && (isSendai || validDirection === 'up');

  const handleDirectionChange = (newDir: 'up' | 'down') => {
    setSelectedTrainId(null);
    setSelectedDirection(newDir);
  };

  // 現在時刻の分（4:00基準）
  const currentMinutes = useMemo(() => {
    let h = now.getHours();
    const m = now.getMinutes();
    if (h < 4) h += 24;
    return h * 60 + m;
  }, [now]);

  const nowSec = useMemo(() => getCurrentRailwaySeconds(now), [now]);

  // 今日が土曜・休日・年末年始（運休対象日）かどうか
  const isTodayHoliday = useMemo(() => isWeekendHolidayOrYearEnd(now), [now]);

  // フィルタリング処理
  const filteredTrains = useMemo(() => {
    let list = [...allTrains];

    // 方面フィルター（上り / 下り）
    if (showDirectionFilter) {
      list = list.filter((t) => t.direction === selectedDirection);
    }

    // 路線フィルター（複数選択）: 未選択時は全路線表示、選択時はその路線のみ絞り込み
    if (showLineFilter && selectedLines.length > 0) {
      list = list.filter((t) => selectedLines.includes(t.line));
    }

    // 時系列昇順ソート（4:00基準）
    return list.sort((a, b) => toRailwayMinutes(a.departureTime) - toRailwayMinutes(b.departureTime));
  }, [allTrains, showDirectionFilter, selectedDirection, showLineFilter, selectedLines]);

  // 現在時刻以降で、かつ「本日運行されている」最初の列車（次に発車する列車）を特定
  const nextTrainId = useMemo(() => {
    for (const t of filteredTrains) {
      const isSuspended = t.calendar === 'weekday' && isTodayHoliday;
      if (!isSuspended && toRailwayMinutes(t.departureTime) >= currentMinutes) {
        return t.id;
      }
    }
    return null;
  }, [filteredTrains, currentMinutes, isTodayHoliday]);

  // 選択中の列車データ（全停車駅タイムライン表示用）
  const selectedTrainData = useMemo(() => {
    if (!selectedTrainId) return null;
    const depTrain =
      filteredTrains.find((t) => t.id === selectedTrainId || t.trainNumber === selectedTrainId) ||
      allTrains.find((t) => t.id === selectedTrainId || t.trainNumber === selectedTrainId) ||
      null;
    const scheduledTrain = getScheduledTrainById(selectedTrainId, now);
    return {
      depTrain,
      scheduledTrain,
    };
  }, [selectedTrainId, filteredTrains, allTrains, now]);

  const stopsToShow: ScheduledFullStop[] = useMemo(() => {
    const s = selectedTrainData?.scheduledTrain;
    if (!s) return [];
    if (s.allStops && s.allStops.length > 0) {
      return s.allStops;
    }
    return s.stops;
  }, [selectedTrainData?.scheduledTrain]);

  const trainStatus = useMemo(
    () => getTrainStatus(nowSec, stopsToShow),
    [nowSec, stopsToShow]
  );

  const activeIndex = useMemo(() => {
    return trainStatus.kind === 'before'
      ? -1
      : trainStatus.kind === 'arrived'
      ? stopsToShow.length - 1
      : trainStatus.index;
  }, [trainStatus, stopsToShow.length]);

  const boardingIndex = useMemo(() => {
    return stopsToShow.findIndex((s) => s.stationId === stationId);
  }, [stopsToShow, stationId]);

  const listViewportRef = useRef<HTMLDivElement>(null);
  const timelineViewportRef = useRef<HTMLDivElement>(null);

  // 1. 時刻表一覧表示時の現在列車スクロール
  useEffect(() => {
    if (!isOpen || selectedTrainId) return;

    const scrollToCurrentTrain = () => {
      const viewport = listViewportRef.current;
      if (!viewport) return;

      if (!nextTrainId) {
        viewport.scrollTop = 0;
        return;
      }

      const targetEl = viewport.querySelector<HTMLElement>(`[data-train-id="${nextTrainId}"]`);
      if (targetEl) {
        const viewportRect = viewport.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();
        const targetTop = targetRect.top - viewportRect.top + viewport.scrollTop;
        const scrollPosition = targetTop - 85;
        viewport.scrollTop = Math.max(0, scrollPosition);
      }
    };

    const rafId = requestAnimationFrame(scrollToCurrentTrain);
    const timerId = setTimeout(scrollToCurrentTrain, 30);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
    };
  }, [isOpen, selectedTrainId, nextTrainId, selectedDirection, selectedLines]);

  // 2. タイムライン表示時の自動スクロール（乗車駅または現在走行位置へスクロール）
  useEffect(() => {
    if (!isOpen || !selectedTrainId) return;

    const scrollToTargetStop = () => {
      const viewport = timelineViewportRef.current;
      if (!viewport) return;

      // 優先順位: 走行中/停車中/到達済みの駅 -> 乗車駅 -> 最上部
      const targetIdx =
        trainStatus.kind === 'running'
          ? trainStatus.index
          : activeIndex >= 0
          ? activeIndex
          : boardingIndex >= 0
          ? boardingIndex
          : 0;

      if (targetIdx <= 0) {
        viewport.scrollTop = 0;
        return;
      }

      const targetEl = viewport.querySelector<HTMLElement>(`[data-stop-index="${targetIdx}"]`);
      if (targetEl) {
        const viewportRect = viewport.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();
        const targetTop = targetRect.top - viewportRect.top + viewport.scrollTop;
        viewport.scrollTop = Math.max(0, targetTop - 85);
      }
    };

    const rafId = requestAnimationFrame(scrollToTargetStop);
    const t1 = setTimeout(scrollToTargetStop, 30);
    const t2 = setTimeout(scrollToTargetStop, 120);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isOpen, selectedTrainId, trainStatus.kind, boardingIndex]);

  const LINE_OPTIONS: { value: LineType; label: string }[] = [
    { value: 'tohoku', label: '東北本線' },
    { value: 'joban', label: '常磐線' },
    { value: 'saal', label: '仙台空港アクセス線' },
  ];

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Modal.Backdrop>
        <Modal.Container size="md" placement="center" scroll="inside">
          <Modal.Dialog
            aria-label="時刻表"
            className="p-0 gap-0 overflow-hidden flex flex-col h-[calc(100dvh-4rem)] max-h-[calc(100dvh-4rem)] w-full max-w-md rounded-2xl bg-surface text-foreground border border-border shadow-2xl"
          >
            {/* モーダルヘッダー */}
            <div className="flex items-center justify-between px-4 py-3 shrink-0 min-h-[52px]">
              <h2 className="font-black text-base m-0 leading-tight">時刻表</h2>
              <CloseButton onPress={onClose} aria-label="閉じる" />
            </div>
            <Separator />

            {selectedTrainData?.scheduledTrain ? (
              /* ========== 機能2：全停車駅到着時刻タイムライン表示 ========== */
              (() => {
                const train = selectedTrainData.scheduledTrain;
                const depTrain = selectedTrainData.depTrain;
                const lineColor = getLineColor(train.line);
                const cleanDest = cleanStationName(train.destination);

                return (
                  <div className="flex-1 min-h-0 flex flex-col">
                    {/* 詳細ヘッダー */}
                    <div className="flex flex-col gap-2 p-3 bg-surface-secondary shrink-0">
                      {/* 1行目: 戻るボタン ＆ バッジ */}
                      <div className="flex items-center justify-between gap-2">
                        <Button
                          size="sm"
                          variant="tertiary"
                          onPress={() => setSelectedTrainId(null)}
                          className="h-7 px-2.5 text-xs font-bold flex items-center gap-1.5 rounded-lg border border-border"
                        >
                          <Icon name="arrow_back" size={14} />
                          <span>時刻表に戻る</span>
                        </Button>
                        <div className="flex items-center gap-1.5">
                          {train.calendar === 'weekday' && (
                            <Chip size="sm" variant="soft" color="warning" className="h-5 px-1.5 text-[10px] font-bold">
                              土休日運休
                            </Chip>
                          )}
                          {(depTrain?.track || stopsToShow[boardingIndex]?.track) && (
                            <Chip size="sm" variant="secondary" className="h-5 px-1.5 text-[10px] font-bold border border-border">
                              {depTrain?.track || stopsToShow[boardingIndex]?.track}番線
                            </Chip>
                          )}
                        </div>
                      </div>

                      {/* 2行目: 路線カラーバー ＋ 路線名・列車番号 ＋ 種別・行先・両数 ＋ 発着情報 */}
                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-1 h-8 rounded shrink-0"
                            style={{ backgroundColor: lineColor }}
                          />
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-extrabold text-muted">
                                {train.lineName ?? '列車詳細'}
                              </span>
                              <span className="text-xs font-bold text-muted">
                                {train.trainNumber}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Chip
                                size="sm"
                                variant="primary"
                                style={{ backgroundColor: lineColor, color: '#ffffff' }}
                                className="h-5 px-1.5 text-xs font-bold border-0"
                              >
                                {train.trainType ?? '普通'}
                              </Chip>
                              <h3 className="text-[17px] font-extrabold leading-tight m-0 flex items-center">
                                {cleanDest}
                                <span className="text-xs font-bold ml-0.5 text-muted">
                                  行
                                </span>
                              </h3>
                              <Chip size="sm" variant="secondary" className="h-5 px-1.5 text-[10px] font-bold border border-border">
                                {train.cars}両
                              </Chip>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end shrink-0">
                          {depTrain?.departureTime && (
                            <span className="text-[11px] text-muted font-semibold font-english tabular-nums">
                              当駅 {depTrain.departureTime}発
                            </span>
                          )}
                          <span className="text-xs font-extrabold font-english tabular-nums">
                            {train.terminalStation || cleanDest} {formatStopTime(train.terminalArrivalTime || stopsToShow[stopsToShow.length - 1]?.arr)}着
                          </span>
                        </div>
                      </div>
                    </div>
                    <Separator />

                    {/* タイムラインスクロール領域 */}
                    <ScrollShadow
                      ref={timelineViewportRef}
                      className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
                    >
                      <div className="p-4 pb-8">
                        <div className="flex items-baseline justify-between mb-3">
                          <span className="text-xs font-bold text-muted">
                            停車駅・時刻（全区間）
                          </span>
                          <span className="text-[10.5px] font-semibold text-muted">
                            {stopsToShow.length}駅
                          </span>
                        </div>

                        <RouteTimeline
                          items={stopsToShow}
                          lineColor={lineColor}
                          getItemKey={(s, i) => `${s.stationName}-${i}`}
                          getDataAttributes={(_, i) => ({ 'data-stop-index': i })}
                          isPassed={(_, i) =>
                            trainStatus.kind === 'arrived'
                              ? true
                              : trainStatus.kind === 'before'
                              ? false
                              : trainStatus.kind === 'stopped'
                              ? i < trainStatus.index
                              : i <= trainStatus.index
                          }
                          isCurrent={(_, i) => i === boardingIndex}
                          isVehiclePosition={(_, i) =>
                            trainStatus.kind === 'stopped' && trainStatus.index === i
                          }
                          renderContent={(s, i) => {
                            const isFirst = i === 0;
                            const isLast = i === stopsToShow.length - 1;
                            const isStoppedHere = trainStatus.kind === 'stopped' && trainStatus.index === i;
                            const isBoarding = i === boardingIndex;

                            const passed =
                              trainStatus.kind === 'arrived'
                                ? true
                                : trainStatus.kind === 'before'
                                ? false
                                : trainStatus.kind === 'stopped'
                                ? i < trainStatus.index
                                : i <= trainStatus.index;

                            return (
                              <div className="flex items-center justify-between min-w-0 flex-1 gap-2">
                                {/* 駅名 */}
                                <span
                                  className={`text-sm truncate ${
                                    isBoarding || isStoppedHere
                                      ? 'font-extrabold text-foreground'
                                      : passed
                                      ? 'font-medium text-muted'
                                      : 'font-bold text-foreground'
                                  }`}
                                >
                                  {cleanStationName(s.stationName)}
                                </span>

                                {/* 発着時刻 ＆ 番線 */}
                                <div className="flex items-center gap-2 shrink-0">
                                  <div className="flex flex-col items-end justify-center min-w-[54px]">
                                    {isFirst ? (
                                      <span
                                        className={`text-xs tabular-nums font-english ${
                                          isStoppedHere || isBoarding
                                            ? 'font-extrabold text-foreground'
                                            : passed
                                            ? 'text-muted font-medium'
                                            : 'font-bold text-foreground'
                                        }`}
                                      >
                                        {formatStopTime(s.dep)} 発
                                      </span>
                                    ) : isLast ? (
                                      <span
                                        className={`text-xs tabular-nums font-english ${
                                          isStoppedHere || isBoarding
                                            ? 'font-extrabold text-foreground'
                                            : passed
                                            ? 'text-muted font-medium'
                                            : 'font-bold text-foreground'
                                        }`}
                                      >
                                        {formatStopTime(s.arr)} 着
                                      </span>
                                    ) : (
                                      <>
                                        <span className="text-[11px] font-medium text-muted tabular-nums font-english leading-tight">
                                          {formatStopTime(s.arr)} 着
                                        </span>
                                        <span
                                          className={`text-xs tabular-nums font-english leading-tight ${
                                            isStoppedHere || isBoarding
                                              ? 'font-extrabold text-foreground'
                                              : passed
                                              ? 'text-muted font-medium'
                                              : 'font-bold text-foreground'
                                          }`}
                                        >
                                          {formatStopTime(s.dep)} 発
                                        </span>
                                      </>
                                    )}
                                  </div>

                                  {/* 番線 */}
                                  <div className="w-10 shrink-0 text-right">
                                    {s.track ? (
                                      <span className="text-xs text-muted font-semibold">
                                        {s.track}番線
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            );
                          }}
                        />
                      </div>
                    </ScrollShadow>
                  </div>
                );
              })()
            ) : (
              /* ========== 機能1：時刻表一覧 ========== */
              <div className="flex-1 min-h-0 flex flex-col">
                {/* 絞り込みフィルターバー */}
                {(showDirectionFilter || showLineFilter) && (
                  <>
                    <div className="flex flex-col gap-2 p-3 bg-surface-secondary shrink-0">
                      {/* 上り / 下り 切り替え */}
                      {showDirectionFilter && (
                        <Tabs
                          key={`timetable-dir-tabs-${stationId}`}
                          selectedKey={validDirection}
                          onSelectionChange={(key) => handleDirectionChange(String(key) as 'up' | 'down')}
                          className="w-full"
                        >
                          <Tabs.ListContainer>
                            <Tabs.List aria-label="方面切り替え" className="w-full">
                              <Tabs.Tab id="up" className="flex-1 h-7 text-xs font-bold px-2 flex items-center justify-center">
                                {directionLabels.up}
                                <Tabs.Indicator />
                              </Tabs.Tab>
                              <Tabs.Tab id="down" className="flex-1 h-7 text-xs font-bold px-2 flex items-center justify-center">
                                {directionLabels.down}
                                <Tabs.Indicator />
                              </Tabs.Tab>
                            </Tabs.List>
                          </Tabs.ListContainer>
                        </Tabs>
                      )}

                      {/* 路線絞り込み */}
                      {showLineFilter && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <div className="flex items-center text-muted mr-1">
                            <Icon name="filter_alt" size={16} />
                          </div>
                          {LINE_OPTIONS.map((opt) => {
                            const isSelected = selectedLines.includes(opt.value);
                            const color = LINE_COLORS[opt.value];
                            return (
                              <Button
                                key={opt.value}
                                size="sm"
                                variant={isSelected ? 'primary' : 'tertiary'}
                                onPress={() => {
                                  setSelectedLines((prev) =>
                                    prev.includes(opt.value)
                                      ? prev.filter((l) => l !== opt.value)
                                      : [...prev, opt.value]
                                  );
                                }}
                                className="h-7 px-2.5 text-xs font-semibold rounded-lg border border-border"
                                style={
                                  isSelected
                                    ? {
                                        backgroundColor: color,
                                        borderColor: color,
                                        color: '#ffffff',
                                      }
                                    : undefined
                                }
                              >
                                {opt.label}
                              </Button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <Separator />
                  </>
                )}

                {/* 時刻表スクロールリスト */}
                <ScrollShadow
                  ref={listViewportRef}
                  className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
                >
                  {filteredTrains.length === 0 ? (
                    <EmptyState className="py-8 text-center text-xs text-muted">
                      該当する列車はありません
                    </EmptyState>
                  ) : (
                    <ListBox
                      key={`timetable-list-${stationId}-${validDirection}-${selectedLines.slice().sort().join(',')}`}
                      aria-label="発車便一覧"
                      selectionMode="none"
                      className="p-1.5 pb-6 gap-1"
                    >
                      {filteredTrains.map((train) => {
                        const isPast = toRailwayMinutes(train.departureTime) < currentMinutes;
                        const isNext = train.id === nextTrainId;
                        const isWeekdayOnly = train.calendar === 'weekday';
                        const isSuspendedToday = isWeekdayOnly && isTodayHoliday;
                        const dimmed = isSuspendedToday || (isPast && !isNext);

                        return (
                          <ListBox.Item
                            key={train.id}
                            id={train.id}
                            textValue={`${train.departureTime} ${train.destination}行 ${train.trainType || ''} ${train.trainNumber} ${train.track}番線`}
                            data-train-id={train.id}
                            onAction={() => {
                              setSelectedTrainId(train.trainNumber || train.id);
                            }}
                            style={{
                              opacity: isSuspendedToday ? 0.45 : dimmed ? 0.5 : 1,
                            }}
                            className={`w-full rounded-lg px-2.5 py-2 cursor-pointer transition-colors ${
                              isNext
                                ? 'bg-accent/15 border border-accent/40 font-bold'
                                : 'hover:bg-surface-secondary border border-transparent'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1.5 w-full">
                              {/* 左側: 発車時刻 | 行先 | 種別 | 運休バッジ */}
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-sm font-extrabold w-[3.2em] text-right font-english tabular-nums shrink-0">
                                  {train.departureTime}
                                </span>
                                <span className={`text-sm shrink-0 ${isNext ? 'font-extrabold' : 'font-medium'}`}>
                                  {train.destination}
                                </span>
                                {train.trainType !== '普通' && (
                                  <Chip size="sm" variant="soft" color="danger" className="h-5 px-1.5 text-[10px] font-bold shrink-0">
                                    {train.trainType}
                                  </Chip>
                                )}
                                {isWeekdayOnly && (
                                  <Chip
                                    size="sm"
                                    variant={isSuspendedToday ? 'primary' : 'soft'}
                                    color={isSuspendedToday ? 'danger' : 'warning'}
                                    className="h-5 px-1.5 text-[10px] font-bold shrink-0"
                                  >
                                    {isSuspendedToday ? '本日運休' : '土休日運休'}
                                  </Chip>
                                )}
                              </div>

                              {/* 右側: 列車番号・番線・両数・詳細シェブロン */}
                              <div className="flex items-center gap-1.5 shrink-0 font-english tabular-nums">
                                <span className="text-[10px] text-muted w-11 text-right">
                                  {train.trainNumber}
                                </span>
                                <span className="text-xs text-muted w-10 text-right">
                                  {train.track}番線
                                </span>
                                <span className="text-xs font-bold w-8 text-right">
                                  {train.cars}両
                                </span>
                                <Icon
                                  name="chevron_right"
                                  size={15}
                                  className="text-muted"
                                />
                              </div>
                            </div>
                          </ListBox.Item>
                        );
                      })}
                    </ListBox>
                  )}
                </ScrollShadow>
              </div>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default TimetableModal;
