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
import { isWeekendHolidayOrYearEnd } from '../utils/calendar';
import { getCurrentRailwaySeconds } from '../utils/trainPosition';
import {
  NatoringoDayType,
  NatoringoDeparture,
  getNatoringoStationSchedule,
} from '../utils/natoringoSchedule';
import { JisBus } from './icons';
import { Icon } from './Icon';
import { BusRouteBadge } from './BusRouteBadge';
import { RouteTimeline } from './RouteTimeline';

interface NatoringoTimetableModalProps {
  isOpen: boolean;
  onClose: () => void;
  stationId: string;
  initialStopId?: string | null;
  initialDepartureId?: string | null;
  now: Date;
}

export const NatoringoTimetableModal: React.FC<NatoringoTimetableModalProps> = ({
  isOpen,
  onClose,
  stationId,
  initialStopId = null,
  initialDepartureId = null,
  now,
}) => {
  const stationSchedule = useMemo(
    () => getNatoringoStationSchedule(stationId),
    [stationId]
  );
  const busStops = stationSchedule?.busStops ?? [];
  const defaultStopId = busStops[0]?.stopId ?? '';

  const isTodayHoliday = useMemo(() => isWeekendHolidayOrYearEnd(now), [now]);
  const todayDayType: NatoringoDayType = isTodayHoliday ? 'holiday' : 'weekday';

  const [selectedStopId, setSelectedStopId] = useState<string>(
    initialStopId || defaultStopId
  );
  const [dayType, setDayType] = useState<NatoringoDayType>(todayDayType);
  // 路線絞り込みフィルター（複数選択・初期状態は未選択＝全路線表示）
  const [selectedLines, setSelectedLines] = useState<string[]>([]);
  // 選択中の便ID（全停車バス停＆運賃タイムライン表示用）
  const [selectedDepartureId, setSelectedDepartureId] = useState<string | null>(
    initialDepartureId
  );

  const prevOpenRef = useRef(false);

  // モーダルが開いた瞬間（false -> true）のみ初期状態を同期
  useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      const validStopId =
        initialStopId && busStops.some((s) => s.stopId === initialStopId)
          ? initialStopId
          : defaultStopId;
      setSelectedStopId(validStopId);
      setDayType(isWeekendHolidayOrYearEnd(now) ? 'holiday' : 'weekday');
      setSelectedLines([]);
      setSelectedDepartureId(initialDepartureId || null);
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, stationId, initialStopId, initialDepartureId, defaultStopId, now]);

  const activeBusStop = useMemo(
    () => busStops.find((s) => s.stopId === selectedStopId) ?? busStops[0] ?? null,
    [busStops, selectedStopId]
  );

  // のりば変更時は路線フィルターと便選択をリセット
  const handleStopChange = (newStopId: string) => {
    setSelectedStopId(newStopId);
    setSelectedLines([]);
    setSelectedDepartureId(null);
  };

  // ダイヤ種別変更時は便選択をリセット
  const handleDayTypeChange = (newDay: NatoringoDayType) => {
    setSelectedDepartureId(null);
    setDayType(newDay);
  };

  // 現在時刻（4:00基準の鉄道分）
  const currentMinutes = useMemo(
    () => Math.floor(getCurrentRailwaySeconds(now) / 60),
    [now]
  );

  // 現在のバス停・ダイヤ種別の全便リスト
  const allDepartures = useMemo(() => {
    if (!activeBusStop) return [];
    return activeBusStop[dayType] || [];
  }, [activeBusStop, dayType]);

  // 路線フィルター適用後の発車リスト
  const filteredDepartures = useMemo(() => {
    if (selectedLines.length === 0) return allDepartures;
    return allDepartures.filter((d) => selectedLines.includes(d.lineName));
  }, [allDepartures, selectedLines]);

  // 次発便（現在時刻以降の最初の便）
  const nextDepartureId = useMemo(() => {
    for (const dep of filteredDepartures) {
      if (dep.departureMinutes >= currentMinutes) {
        return dep.id;
      }
    }
    return null;
  }, [filteredDepartures, currentMinutes]);

  // 選択中の便データ（全停車バス停タイムライン表示用）
  const selectedDeparture: NatoringoDeparture | null = useMemo(() => {
    if (!selectedDepartureId) return null;
    return allDepartures.find((d) => d.id === selectedDepartureId) || null;
  }, [selectedDepartureId, allDepartures]);

  const listViewportRef = useRef<HTMLDivElement>(null);
  const detailViewportRef = useRef<HTMLDivElement>(null);

  // 1. 時刻表一覧ビューの自動初期スクロール（targetTop - 85）
  useEffect(() => {
    if (!isOpen || selectedDeparture) return;

    const scrollToCurrentDeparture = () => {
      const viewport = listViewportRef.current;
      if (!viewport) return;

      if (!nextDepartureId) {
        viewport.scrollTop = 0;
        return;
      }

      const targetEl = viewport.querySelector<HTMLElement>(
        `[data-natoringo-dep-id="${nextDepartureId}"]`
      );
      if (targetEl) {
        const viewportRect = viewport.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();
        const targetTop = targetRect.top - viewportRect.top + viewport.scrollTop;
        viewport.scrollTop = Math.max(0, targetTop - 85);
      }
    };

    const rafId = requestAnimationFrame(scrollToCurrentDeparture);
    const t1 = setTimeout(scrollToCurrentDeparture, 30);
    const t2 = setTimeout(scrollToCurrentDeparture, 120);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isOpen, selectedDeparture, nextDepartureId, selectedStopId, dayType, selectedLines]);

  // 2. 全停車バス停タイムラインビューの自動初期スクロール（乗車バス停の位置へスクロール）
  useEffect(() => {
    if (!isOpen || !selectedDeparture) return;

    const scrollToBoardingStop = () => {
      const viewport = detailViewportRef.current;
      if (!viewport) return;

      const targetIdx = selectedDeparture.boardingStopIndex;
      if (targetIdx <= 0) {
        viewport.scrollTop = 0;
        return;
      }

      const targetEl = viewport.querySelector<HTMLElement>(
        `[data-natoringo-stop-index="${targetIdx}"]`
      );
      if (targetEl) {
        const viewportRect = viewport.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();
        const targetTop = targetRect.top - viewportRect.top + viewport.scrollTop;
        viewport.scrollTop = Math.max(0, targetTop - 95);
      }
    };

    const rafId = requestAnimationFrame(scrollToBoardingStop);
    const t1 = setTimeout(scrollToBoardingStop, 30);
    const t2 = setTimeout(scrollToBoardingStop, 120);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isOpen, selectedDeparture]);

  if (!stationSchedule || !activeBusStop) return null;

  const hasMultipleStops = busStops.length > 1;
  const availableLines = activeBusStop.lines || [];
  const showLineFilter = availableLines.length > 1;

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Modal.Backdrop>
        <Modal.Container size="md" placement="center" scroll="inside">
          <Modal.Dialog
            aria-label={`${stationSchedule.stationName}駅 なとりん号時刻表`}
            className="p-0 gap-0 overflow-hidden flex flex-col h-[calc(100dvh-4rem)] max-h-[calc(100dvh-4rem)] w-full max-w-md rounded-2xl bg-surface text-foreground border border-border shadow-2xl"
          >
            {/* モーダルヘッダー */}
            <div className="flex items-center justify-between px-4 py-3 bg-surface shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <JisBus size={18} color="#d97706" />
                <h2 className="text-[15px] font-black truncate text-foreground">
                  {stationSchedule.stationName}駅 なとりん号時刻表
                </h2>
              </div>
              <CloseButton onPress={onClose} aria-label="閉じる" />
            </div>
            <Separator />

            {selectedDeparture ? (
              /* ========== 機能2：全停車バス停＆運賃タイムライン表示 ========== */
              <>
                <div className="p-3 shrink-0 bg-surface-secondary flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <Button
                      size="sm"
                      variant="tertiary"
                      onPress={() => setSelectedDepartureId(null)}
                      className="font-bold text-xs h-7 px-2.5 rounded-md flex items-center gap-1"
                    >
                      <Icon name="arrow_back" size={14} />
                      <span>時刻表に戻る</span>
                    </Button>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Chip
                        size="sm"
                        variant="soft"
                        color={dayType === 'holiday' ? 'danger' : 'default'}
                        className="font-bold text-[11px]"
                      >
                        {dayType === 'holiday' ? '土日祝ダイヤ' : '平日ダイヤ'}
                      </Chip>
                      <Chip size="sm" variant="secondary" className="font-bold text-[11px]">
                        {activeBusStop.stopName}
                      </Chip>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-1 h-8 rounded-sm shrink-0"
                        style={{ backgroundColor: selectedDeparture.routeColor }}
                      />
                      <div className="flex flex-col min-w-0 gap-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <BusRouteBadge
                            routeCode={selectedDeparture.routeCode}
                            color={selectedDeparture.routeColor}
                            size="sm"
                          />
                          <span className="text-xs font-extrabold text-muted truncate">
                            {selectedDeparture.lineName}
                          </span>
                        </div>
                        <h3 className="text-base font-extrabold leading-tight truncate text-foreground">
                          {selectedDeparture.headsign}
                          <span className="text-xs font-bold ml-0.5 text-muted">
                            行
                          </span>
                        </h3>
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0 gap-0.5">
                      <span className="text-[11px] font-semibold text-muted font-english tabular-nums">
                        {activeBusStop.stopName} {selectedDeparture.departureTime}
                      </span>
                      <span className="text-xs font-extrabold text-foreground font-english tabular-nums">
                        終着 {selectedDeparture.terminalArrivalTime}（{selectedDeparture.terminalFare}円）
                      </span>
                    </div>
                  </div>
                </div>
                <Separator />

                <ScrollShadow
                  ref={detailViewportRef}
                  data-scrollable="true"
                  className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
                >
                  <div className="p-4 pb-8">
                    <div className="flex items-baseline justify-between mb-3">
                      <span className="text-xs font-bold text-muted">
                        全停車バス停・到着時刻・運賃タイムライン
                      </span>
                      <span className="text-[10.5px] font-semibold text-muted">
                        全{selectedDeparture.stops.length}停留所
                      </span>
                    </div>

                    {(() => {
                      const stops = selectedDeparture.stops;
                      const firstMin = stops[0]?.minutes ?? 0;
                      const lastMin = stops[stops.length - 1]?.minutes ?? 0;
                      const isTodayCal = dayType === todayDayType;
                      const isCurrentlyRunning =
                        isTodayCal && currentMinutes >= firstMin && currentMinutes <= lastMin;

                      let currentStopIdx = -1;
                      if (isCurrentlyRunning) {
                        for (let i = 0; i < stops.length; i++) {
                          if (currentMinutes >= stops[i].minutes) {
                            currentStopIdx = i;
                          }
                        }
                      }

                      const boardingIdx = selectedDeparture.boardingStopIndex;
                      const rColor = selectedDeparture.routeColor;

                      return (
                        <RouteTimeline
                          items={stops}
                          lineColor={rColor}
                          getItemKey={(st) => `${st.stopId}-${st.stopSequence}`}
                          getDataAttributes={(_, i) => ({ 'data-natoringo-stop-index': i })}
                          isPassed={(_, i) =>
                            i < boardingIdx || (isCurrentlyRunning && i < currentStopIdx)
                          }
                          isCurrent={(_, i) => i === boardingIdx}
                          isVehiclePosition={(_, i) =>
                            isCurrentlyRunning && i === currentStopIdx
                          }
                          getRowStyle={(_, i) => ({
                            backgroundColor: i === boardingIdx ? `${rColor}1A` : undefined,
                          })}
                          renderContent={(st, i) => {
                            const isLast = i === stops.length - 1;
                            const isBoarding = i === boardingIdx;
                            const passed =
                              i < boardingIdx || (isCurrentlyRunning && i < currentStopIdx);

                            return (
                              <div className="flex items-center justify-between min-w-0 flex-1 gap-2.5 py-0.5">
                                {/* 左側: バス停名 */}
                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                  <span
                                    className={`text-sm truncate leading-snug ${
                                      isBoarding || isLast
                                        ? 'font-extrabold text-foreground'
                                        : passed
                                          ? 'font-medium text-muted'
                                          : 'font-bold text-foreground'
                                    }`}
                                  >
                                    {st.stopName}
                                  </span>
                                </div>

                                {/* 右側: 運賃 ＋ 時刻 */}
                                <div className="flex items-center gap-1.5 justify-end shrink-0">
                                  {i > boardingIdx && st.fare !== null && (
                                    <Chip
                                      size="sm"
                                      variant="secondary"
                                      className="font-bold font-english tabular-nums text-[11px] h-5 px-1.5 shrink-0"
                                    >
                                      {st.fare}円
                                    </Chip>
                                  )}
                                  <span
                                    className={`text-xs font-english tabular-nums whitespace-nowrap text-right min-w-[52px] ${
                                      isBoarding || isLast
                                        ? 'font-extrabold text-foreground'
                                        : passed
                                          ? 'font-medium text-muted'
                                          : 'font-bold text-foreground'
                                    }`}
                                  >
                                    {st.time}
                                  </span>
                                </div>
                              </div>
                            );
                          }}
                        />
                      );
                    })()}
                  </div>
                </ScrollShadow>
              </>
            ) : (
              /* ========== 機能1：のりば別・ダイヤ別・路線絞り込み付き1日全時刻表一覧 ========== */
              <>
                <div className="p-3 shrink-0 bg-surface-secondary flex flex-col gap-2">
                  {/* のりば切り替え（名取駅は西口・東口の Tabs、他3駅はバス停名表示） */}
                  {hasMultipleStops ? (
                    <Tabs
                      key={`natoringo-stop-tabs-${stationId}`}
                      selectedKey={activeBusStop.stopId}
                      onSelectionChange={(key) => handleStopChange(String(key))}
                      className="w-full"
                    >
                      <Tabs.ListContainer>
                        <Tabs.List
                          aria-label="のりば切替"
                          className="w-full"
                        >
                          {busStops.map((s) => (
                            <Tabs.Tab key={s.stopId} id={s.stopId} className="flex-1 h-7 text-xs font-bold px-2">
                              {s.stopName}
                              <Tabs.Indicator />
                            </Tabs.Tab>
                          ))}
                        </Tabs.List>
                      </Tabs.ListContainer>
                    </Tabs>
                  ) : (
                    <div className="flex items-center justify-between px-1 py-0.5">
                      <div className="flex items-center gap-1.5">
                        <Chip size="sm" variant="secondary" className="font-bold text-[11px]">
                          のりば
                        </Chip>
                        <span className="text-xs font-extrabold text-foreground">
                          {activeBusStop.stopName}
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-muted">
                        {availableLines.map((l) => l.lineName).join('・')}
                      </span>
                    </div>
                  )}

                  {/* 平日ダイヤ / 土日祝ダイヤ 切り替え */}
                  <Tabs
                    key="natoringo-daytype-tabs"
                    selectedKey={dayType}
                    onSelectionChange={(key) => handleDayTypeChange(String(key) as NatoringoDayType)}
                    className="w-full"
                  >
                    <Tabs.ListContainer>
                      <Tabs.List aria-label="ダイヤ種別" className="w-full">
                        <Tabs.Tab id="weekday" className="flex-1 h-7 text-xs font-bold px-2">
                          平日ダイヤ{!isTodayHoliday ? '（本日）' : ''}
                          <Tabs.Indicator />
                        </Tabs.Tab>
                        <Tabs.Tab id="holiday" className="flex-1 h-7 text-xs font-bold px-2">
                          土日祝ダイヤ{isTodayHoliday ? '（本日）' : ''}
                          <Tabs.Indicator />
                        </Tabs.Tab>
                      </Tabs.List>
                    </Tabs.ListContainer>
                  </Tabs>

                  {/* 路線絞り込みフィルター（HeroUI Button） */}
                  {showLineFilter && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <div className="flex items-center text-muted mr-0.5">
                        <Icon name="filter_alt" size={16} />
                      </div>
                      {availableLines.map((line) => {
                        const isSelected = selectedLines.includes(line.lineName);
                        const color = line.routeColor;
                        return (
                          <Button
                            key={line.lineName}
                            size="sm"
                            variant={isSelected ? 'primary' : 'tertiary'}
                            onPress={() => {
                              setSelectedLines((prev) =>
                                prev.includes(line.lineName)
                                  ? prev.filter((l) => l !== line.lineName)
                                  : [...prev, line.lineName]
                              );
                            }}
                            style={
                              isSelected
                                ? {
                                    backgroundColor: color,
                                    borderColor: color,
                                    color: '#ffffff',
                                  }
                                : undefined
                            }
                            className="text-xs font-bold px-2.5 h-7 rounded-md"
                          >
                            {line.lineName}
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <Separator />

                {/* 時刻表一覧スクロール領域 */}
                <ScrollShadow
                  ref={listViewportRef}
                  data-scrollable="true"
                  className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
                >
                  {filteredDepartures.length === 0 ? (
                    <EmptyState className="py-8 text-center text-xs text-muted">
                      該当するバスはありません
                    </EmptyState>
                  ) : (
                    <ListBox
                      key={`natoringo-list-${activeBusStop.stopId}-${dayType}-${selectedLines.slice().sort().join(',')}`}
                      aria-label="発車便一覧"
                      selectionMode="none"
                      className="p-1.5 pb-8 gap-1"
                    >
                      {filteredDepartures.map((dep) => {
                        const isPast = dep.departureMinutes < currentMinutes;
                        const isNext = dep.id === nextDepartureId;
                        const dimmed = isPast && !isNext;

                        return (
                          <ListBox.Item
                            key={dep.id}
                            id={dep.id}
                            textValue={`${dep.departureTime} ${dep.headsign}行 ${dep.lineName}`}
                            data-natoringo-dep-id={dep.id}
                            data-dep-id={dep.id}
                            onAction={() => setSelectedDepartureId(dep.id)}
                            style={{
                              backgroundColor: isNext ? `${dep.routeColor}1F` : undefined,
                              opacity: dimmed ? 0.5 : 1,
                            }}
                            className={`w-full rounded-xl px-2.5 py-2 cursor-pointer transition-colors ${
                              isNext
                                ? 'border border-accent/40 font-bold'
                                : 'hover:bg-surface-secondary border border-transparent'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1.5 w-full">
                              {/* 左側: 発車時刻 | 系統カラーバッジ | 路線名・行先 */}
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  style={isNext ? { color: dep.routeColor } : undefined}
                                  className="text-sm font-extrabold w-[3.1em] text-right font-english tabular-nums shrink-0"
                                >
                                  {dep.departureTime}
                                </span>

                                <BusRouteBadge
                                  routeCode={dep.routeCode}
                                  color={dep.routeColor}
                                  size="sm"
                                />

                                <div className="min-w-0 flex flex-col">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className={`text-sm truncate ${isNext ? 'font-extrabold' : 'font-semibold'}`}>
                                      {dep.headsign}行
                                    </span>
                                  </div>
                                  <span className="text-[10.5px] text-muted truncate">
                                    {dep.lineName}
                                  </span>
                                </div>
                              </div>

                              {/* 右側: 終着到着時刻 | 詳細シェブロン */}
                              <div className="flex items-center gap-1.5 shrink-0 font-english tabular-nums">
                                <span className="text-[11px] text-muted text-right">
                                  終着 {dep.terminalArrivalTime}
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
              </>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default NatoringoTimetableModal;
