import React, { useState, useMemo, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import {
  Modal,
  Tabs,
  Button,
  Chip,
  CloseButton,
  Spinner,
  Skeleton,
  ScrollShadow,
  ListBox,
  EmptyState,
  Separator,
} from '@heroui/react';
import { getCurrentRailwaySeconds } from '../utils/trainPosition';
import {
  SENDAI_BUS_COLOR,
  SendaiBusDayType,
  SendaiBusDeparture,
  SendaiBusStationSchedule,
  getSendaiBusDayType,
  fetchSendaiBusTripDetail,
  calcExpectedTime,
  MIN_SKELETON_TIME,
} from '../utils/sendaiBusApi';
import { JisBus } from './icons';
import { Icon } from './Icon';
import { BusRouteBadge } from './BusRouteBadge';
import {
  BusDepartureRowSkeleton,
  formatHeadsign,
} from './BusDepartureRow';
import { RouteTimeline } from './RouteTimeline';

interface SendaiBusTimetableModalProps {
  isOpen: boolean;
  onClose: () => void;
  stationSchedule: SendaiBusStationSchedule | null;
  stationName?: string;
  isLoading?: boolean;
  initialDepartureId?: string | null;
  initialFilterKey?: string | null;
  now: Date;
}

const DAY_TYPE_LABELS: Record<SendaiBusDayType, string> = {
  weekday: '平日ダイヤ',
  saturday: '土曜ダイヤ',
  holiday: '日祝ダイヤ',
};

export const SendaiBusTimetableModal: React.FC<SendaiBusTimetableModalProps> = ({
  isOpen,
  onClose,
  stationSchedule,
  stationName = '',
  isLoading = false,
  initialDepartureId = null,
  initialFilterKey = null,
  now,
}) => {
  const todayDayType = useMemo(() => getSendaiBusDayType(now), [now]);

  const [dayType, setDayType] = useState<SendaiBusDayType>(todayDayType);
  const [selectedFilterKey, setSelectedFilterKey] = useState<string | null>(
    initialFilterKey
  );
  // 選択中の便ID（全停車バス停タイムライン表示用）
  const [selectedDepartureId, setSelectedDepartureId] = useState<string | null>(
    initialDepartureId
  );

  // TransferGuide から直接開いたか、時刻表一覧から選択したかの判別フラグ
  const [openedFromList, setOpenedFromList] = useState(false);

  // バス停ごとのリアルタイム遅延秒数マップ (stopId -> delaySec)
  const [stopDelays, setStopDelays] = useState<Record<string, number>>({});

  const prevOpenRef = useRef(false);

  // モーダルが開いた瞬間（false -> true）のみ初期状態を同期
  useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      setDayType(getSendaiBusDayType(now));
      setSelectedFilterKey(initialFilterKey || null);
      if (initialDepartureId) {
        setSelectedDepartureId(initialDepartureId);
        setOpenedFromList(false);
      } else {
        setSelectedDepartureId(null);
        setOpenedFromList(false);
      }
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, stationSchedule?.stationId, initialFilterKey, initialDepartureId, now]);

  // 現在時刻（4:00基準の鉄道秒・分）
  const currentSec = useMemo(() => getCurrentRailwaySeconds(now), [now]);
  const currentMinuteFloorSec = useMemo(
    () => Math.floor(currentSec / 60) * 60,
    [currentSec]
  );
  const currentMinutes = useMemo(() => Math.floor(currentSec / 60), [currentSec]);

  const isTodayCal = dayType === todayDayType;

  // 現在のダイヤ種別の全便リスト
  const allDepartures = useMemo(() => {
    if (!stationSchedule) return [];
    return stationSchedule[dayType] || [];
  }, [stationSchedule, dayType]);

  // フィルター適用後の発車リスト
  const filteredDepartures = useMemo(() => {
    if (!selectedFilterKey) return allDepartures;
    return allDepartures.filter((d) => d.filterKey === selectedFilterKey);
  }, [allDepartures, selectedFilterKey]);

  // 次発便（現在時刻以降の最初の便。時刻表一覧は定時ダイヤ準拠）
  const nextDepartureId = useMemo(() => {
    if (!isTodayCal) return null;
    for (const dep of filteredDepartures) {
      if (dep.scheduledSec >= currentMinuteFloorSec) {
        return dep.id;
      }
    }
    return null;
  }, [filteredDepartures, currentMinuteFloorSec, isTodayCal]);

  // 選択中の便データ（全停車バス停タイムライン表示用）
  const selectedDeparture: SendaiBusDeparture | null = useMemo(() => {
    if (!selectedDepartureId) return null;
    return allDepartures.find((d) => d.id === selectedDepartureId) || null;
  }, [selectedDepartureId, allDepartures]);

  // 便詳細表示時に、バス停ごとのリアルタイム遅延秒数をAPIから取得
  useEffect(() => {
    if (!selectedDeparture || !isTodayCal) {
      setStopDelays({});
      return;
    }
    let cancelled = false;
    fetchSendaiBusTripDetail(selectedDeparture.routeId, selectedDeparture.tripId)
      .then((detail) => {
        if (!cancelled && detail?.delays) {
          setStopDelays(detail.delays);
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch Sendai Bus trip detail:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedDeparture?.routeId, selectedDeparture?.tripId, isTodayCal]);

  // ダイヤ種別変更時は便選択をリセット
  const handleDayTypeChange = (newDay: SendaiBusDayType) => {
    setSelectedDepartureId(null);
    setOpenedFromList(false);
    setDayType(newDay);
  };

  // スケルトンローダーのチラつき・フラッシュ防止用の最低表示時間管理
  const rawLoading = Boolean(isLoading || !stationSchedule);
  const [isSkeletonVisible, setIsSkeletonVisible] = useState(rawLoading);
  const skeletonStartTimeRef = useRef<number | null>(null);
  const skeletonTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isOpen) {
      if (skeletonTimerRef.current) {
        clearTimeout(skeletonTimerRef.current);
        skeletonTimerRef.current = null;
      }
      skeletonStartTimeRef.current = null;
      setIsSkeletonVisible(rawLoading);
      return;
    }

    if (rawLoading) {
      if (skeletonTimerRef.current) {
        clearTimeout(skeletonTimerRef.current);
        skeletonTimerRef.current = null;
      }
      if (skeletonStartTimeRef.current === null) {
        skeletonStartTimeRef.current = Date.now();
      }
      setIsSkeletonVisible(true);
    } else {
      if (skeletonStartTimeRef.current !== null) {
        const elapsed = Date.now() - skeletonStartTimeRef.current;
        const remaining = MIN_SKELETON_TIME - elapsed;
        if (remaining > 0) {
          skeletonTimerRef.current = setTimeout(() => {
            setIsSkeletonVisible(false);
            skeletonStartTimeRef.current = null;
            skeletonTimerRef.current = null;
          }, remaining);
        } else {
          setIsSkeletonVisible(false);
          skeletonStartTimeRef.current = null;
        }
      } else {
        setIsSkeletonVisible(false);
      }
    }

    return () => {
      if (skeletonTimerRef.current) {
        clearTimeout(skeletonTimerRef.current);
        skeletonTimerRef.current = null;
      }
    };
  }, [isOpen, rawLoading]);

  // 初期レンダリング件数の段階的展開（パフォーマンス最適化）
  const INITIAL_WINDOW_SIZE = 60;
  const WINDOW_BUFFER_BEFORE = 10;
  const WINDOW_STEP = 60;

  const [startIndex, setStartIndex] = useState<number>(0);
  const [endIndex, setEndIndex] = useState<number>(INITIAL_WINDOW_SIZE);

  const isScheduleLoaded = Boolean(stationSchedule);

  const listViewportRef = useRef<HTMLDivElement>(null);
  const detailViewportRef = useRef<HTMLDivElement>(null);

  // 初期スクロール完了フラグ（初期スクロール前に上端トリガーが暴発するのを防止）
  const hasInitialScrolledRef = useRef(false);
  const isEarlierLoadingRef = useRef(false);
  const isLaterLoadingRef = useRef(false);
  const prevScrollStateRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null);

  // モーダルが開いた時、またはダイヤ・のりばフィルター切り替え時、データ読み込み完了時に表示ウィンドウを初期化
  useEffect(() => {
    hasInitialScrolledRef.current = false;
    if (!isOpen || !isScheduleLoaded) return;

    const targetId = nextDepartureId || selectedDepartureId;
    let targetIdx = -1;
    if (targetId) {
      targetIdx = filteredDepartures.findIndex((d) => d.id === targetId);
    }

    if (targetIdx >= 0) {
      const start = Math.max(0, targetIdx - WINDOW_BUFFER_BEFORE);
      const end = Math.min(filteredDepartures.length, start + INITIAL_WINDOW_SIZE);
      const adjustedStart = Math.max(0, end - INITIAL_WINDOW_SIZE);
      setStartIndex(adjustedStart);
      setEndIndex(end);
    } else {
      setStartIndex(0);
      setEndIndex(Math.min(filteredDepartures.length, INITIAL_WINDOW_SIZE));
    }
  }, [
    isOpen,
    isScheduleLoaded,
    dayType,
    selectedFilterKey,
    stationSchedule?.stationId,
  ]);

  // 前の便を自動読み込み（スクロール位置を同期的に調整して位置飛び防止）
  const handleLoadEarlier = useCallback(() => {
    if (isEarlierLoadingRef.current) return;
    const vp = listViewportRef.current;
    if (!vp) return;

    isEarlierLoadingRef.current = true;
    prevScrollStateRef.current = {
      scrollHeight: vp.scrollHeight,
      scrollTop: vp.scrollTop,
    };

    setStartIndex((prev) => Math.max(0, prev - WINDOW_STEP));
  }, []);

  // startIndex 更新後に DOM の高さの差分分だけ scrollTop を同期補正
  useLayoutEffect(() => {
    if (!prevScrollStateRef.current) return;
    const vp = listViewportRef.current;
    if (vp) {
      const { scrollHeight: prevHeight, scrollTop: prevTop } = prevScrollStateRef.current;
      const heightDiff = vp.scrollHeight - prevHeight;
      if (heightDiff > 0) {
        vp.scrollTop = prevTop + heightDiff;
      }
    }
    prevScrollStateRef.current = null;
    const timer = setTimeout(() => {
      isEarlierLoadingRef.current = false;
    }, 120);
    return () => clearTimeout(timer);
  }, [startIndex]);

  // 後の便を自動読み込み
  const handleLoadLater = useCallback(() => {
    if (isLaterLoadingRef.current) return;
    isLaterLoadingRef.current = true;
    setEndIndex((prev) => Math.min(filteredDepartures.length, prev + WINDOW_STEP));
    const timer = setTimeout(() => {
      isLaterLoadingRef.current = false;
    }, 120);
    return () => clearTimeout(timer);
  }, [filteredDepartures.length]);

  // スクロール監視：上端・下端に近づいたら自動読み込み（インフィニットスクロール）
  const handleListScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;

      // 初期スクロール完了前は上端トリガーを抑制
      if (!hasInitialScrolledRef.current) return;

      const scrollTop = el.scrollTop;
      const clientHeight = el.clientHeight;
      const scrollHeight = el.scrollHeight;

      // 下端に近づいた（残り150px以内）
      if (scrollTop + clientHeight >= scrollHeight - 150) {
        if (endIndex < filteredDepartures.length) {
          handleLoadLater();
        }
      }

      // 上端に近づいた（scrollTop <= 60）
      if (scrollTop <= 60) {
        if (startIndex > 0) {
          handleLoadEarlier();
        }
      }
    },
    [endIndex, filteredDepartures.length, startIndex, handleLoadLater, handleLoadEarlier]
  );

  const visibleDepartures = useMemo(() => {
    return filteredDepartures.slice(startIndex, endIndex);
  }, [filteredDepartures, startIndex, endIndex]);

  // 1. 時刻表一覧ビューの自動初期スクロール（targetTop - 85）
  useEffect(() => {
    if (!isOpen || selectedDeparture || isSkeletonVisible) return;

    const scrollToCurrentDeparture = () => {
      const viewport = listViewportRef.current;
      if (!viewport) return;

      if (!nextDepartureId) {
        viewport.scrollTop = 0;
        hasInitialScrolledRef.current = true;
        return;
      }

      const targetEl = viewport.querySelector<HTMLElement>(
        `[data-sendai-bus-dep-id="${nextDepartureId}"]`
      );
      if (targetEl) {
        const viewportRect = viewport.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();
        const targetTop = targetRect.top - viewportRect.top + viewport.scrollTop;
        viewport.scrollTop = Math.max(0, targetTop - 85);
        hasInitialScrolledRef.current = true;
      }
    };

    const rafId = requestAnimationFrame(scrollToCurrentDeparture);
    const t1 = setTimeout(scrollToCurrentDeparture, 30);
    const t2 = setTimeout(() => {
      scrollToCurrentDeparture();
      hasInitialScrolledRef.current = true;
    }, 120);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [
    isOpen,
    selectedDeparture,
    nextDepartureId,
    dayType,
    selectedFilterKey,
    isSkeletonVisible,
  ]);

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
        `[data-sendai-bus-stop-index="${targetIdx}"]`
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

  const isModalLoading = isSkeletonVisible;
  const availableFilterOptions = stationSchedule?.filterOptions || [];
  const showSubFilter = availableFilterOptions.length > 1;
  const titleStationName = stationSchedule?.stationName || stationName || '';
  const isTripDetail = Boolean(selectedDeparture && !openedFromList);

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
            aria-label="仙台市営バス時刻表"
            className="p-0 gap-0 overflow-hidden flex flex-col h-[calc(100dvh-4rem)] max-h-[calc(100dvh-4rem)] w-full max-w-md rounded-2xl bg-surface text-foreground border border-border shadow-2xl"
          >
            {/* モーダルヘッダー */}
            <div className="flex items-center justify-between px-4 py-3 bg-surface shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <JisBus size={18} color={SENDAI_BUS_COLOR} />
                <h2 className="text-[15px] font-black truncate text-foreground">
                  {titleStationName ? `${titleStationName}駅 ` : ''}
                  {isTripDetail
                    ? '仙台市営バス運行詳細'
                    : '仙台市営バス時刻表'}
                </h2>
              </div>
              <CloseButton onPress={onClose} aria-label="閉じる" />
            </div>
            <Separator />

            {isModalLoading ? (
              /* ========== 読み込み中スケルトンローダー（最低高さ360px・CLS防止） ========== */
              <>
                <div className="p-3 shrink-0 bg-surface-secondary flex flex-col gap-1.5">
                  {/* 平日 / 土曜 / 日祝 ダイヤ切り替えスケルトン */}
                  <Skeleton className="h-7 w-full rounded-md" />

                  {/* のりば選択ピルスケルトン */}
                  <div className="pt-1 pb-0.5 flex gap-1.5 overflow-x-hidden">
                    <Skeleton className="h-6 w-20 rounded-full shrink-0" />
                    <Skeleton className="h-6 w-16 rounded-full shrink-0" />
                    <Skeleton className="h-6 w-16 rounded-full shrink-0" />
                    <Skeleton className="h-6 w-16 rounded-full shrink-0" />
                  </div>
                </div>
                <Separator />

                {/* 時刻表一覧スクロール領域（最低高さ360px確保、実寸行と完全一致） */}
                <ScrollShadow className="flex-1 min-h-[360px] overflow-y-auto overscroll-contain">
                  <div className="flex flex-col pb-6">
                    {Array.from({ length: 8 }).map((_, idx) => (
                      <BusDepartureRowSkeleton
                        key={idx}
                        isLast={idx === 7}
                      />
                    ))}
                  </div>
                </ScrollShadow>
              </>
            ) : selectedDeparture ? (
              /* ========== 機能2：全停車バス停タイムライン表示 ========== */
              <>
                <div className="p-3 shrink-0 bg-surface-secondary flex flex-col gap-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    {openedFromList ? (
                      <Button
                        size="sm"
                        variant="tertiary"
                        onPress={() => {
                          setSelectedDepartureId(null);
                          setOpenedFromList(false);
                        }}
                        className="font-bold text-xs h-7 px-2.5 rounded-md flex items-center gap-1"
                      >
                        <Icon name="arrow_back" size={14} />
                        <span>時刻表に戻る</span>
                      </Button>
                    ) : (
                      <span className="text-xs font-bold text-muted">
                        運行状況・全停車バス停
                      </span>
                    )}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Chip
                        size="sm"
                        variant="soft"
                        color={
                          dayType === 'holiday'
                            ? 'danger'
                            : dayType === 'saturday'
                              ? 'accent'
                              : 'default'
                        }
                        className="font-bold text-[11px]"
                      >
                        {DAY_TYPE_LABELS[dayType]}
                      </Chip>
                      <Chip
                        size="sm"
                        variant="secondary"
                        className="font-bold text-[11px]"
                      >
                        {selectedDeparture.stopName}
                        {selectedDeparture.platform
                          ? ` (${selectedDeparture.platform})`
                          : ''}
                      </Chip>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-1 h-9 rounded-sm shrink-0"
                        style={{ backgroundColor: selectedDeparture.routeColor }}
                      />
                      <div className="flex flex-col min-w-0 gap-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <BusRouteBadge
                            routeCode={selectedDeparture.routeCode}
                            color={selectedDeparture.routeColor}
                            textColor={selectedDeparture.routeTextColor}
                            size="sm"
                          />
                          {selectedDeparture.via && (
                            <span className="text-xs font-bold text-muted truncate">
                              {selectedDeparture.via}経由
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-extrabold leading-tight truncate text-foreground">
                          {formatHeadsign(selectedDeparture.headsign)}
                        </h3>
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0 gap-0.5">
                      {isTodayCal && selectedDeparture.isDelayed && selectedDeparture.expectedTime ? (
                        <div className="flex items-baseline justify-end gap-1.5 whitespace-nowrap">
                          <del className="text-xs font-medium text-muted font-english tabular-nums">
                            {selectedDeparture.departureTime}
                          </del>
                          <span className="text-base font-extrabold text-foreground font-english tabular-nums">
                            {selectedDeparture.expectedTime}
                          </span>
                        </div>
                      ) : (
                        <span className="text-base font-extrabold text-foreground font-english tabular-nums">
                          {selectedDeparture.departureTime}
                        </span>
                      )}
                      <span className="text-[11px] font-semibold text-muted font-english tabular-nums">
                        終着 {selectedDeparture.terminalArrivalTime}
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
                        全停車バス停・時刻タイムライン
                      </span>
                      <span className="text-[10.5px] font-semibold text-muted">
                        全{selectedDeparture.stops.length}停留所
                      </span>
                    </div>

                    {(() => {
                      const stops = selectedDeparture.stops;
                      const delayMin = isTodayCal ? selectedDeparture.delayMinutes : 0;
                      const firstMin = (stops[0]?.scheduledMinutes ?? 0) + delayMin;
                      const lastMin =
                        (stops[stops.length - 1]?.scheduledMinutes ?? 0) + delayMin;
                      const isCurrentlyRunning =
                        isTodayCal &&
                        currentMinutes >= firstMin &&
                        currentMinutes <= lastMin;

                      let currentStopIdx = -1;
                      if (isCurrentlyRunning) {
                        for (let i = 0; i < stops.length; i++) {
                          if (currentMinutes >= stops[i].scheduledMinutes + delayMin) {
                            currentStopIdx = i;
                          }
                        }
                      }

                      const boardingIdx = selectedDeparture.boardingStopIndex;

                      return (
                        <RouteTimeline
                          items={stops}
                          lineColor={selectedDeparture.routeColor}
                          getItemKey={(st) => `${st.stopId}-${st.stopSequence}`}
                          getDataAttributes={(_, i) => ({ 'data-sendai-bus-stop-index': i })}
                          isPassed={(_, i) =>
                            i < boardingIdx || (isCurrentlyRunning && i < currentStopIdx)
                          }
                          isCurrent={(_, i) => i === boardingIdx}
                          isVehiclePosition={(_, i) =>
                            isCurrentlyRunning && i === currentStopIdx
                          }
                          getRowStyle={(_, i) => ({
                            backgroundColor:
                              i === boardingIdx
                                ? `${selectedDeparture.routeColor}1A`
                                : undefined,
                          })}
                          renderContent={(st, i) => {
                            const isLast = i === stops.length - 1;
                            const isBoarding = i === boardingIdx;
                            const passed =
                              i < boardingIdx ||
                              (isCurrentlyRunning && i < currentStopIdx);

                            const stopDelaySec = isTodayCal
                              ? (stopDelays[st.stopId] ?? selectedDeparture.delaySec ?? 0)
                              : 0;
                            const hasStopDelay = !passed && stopDelaySec >= 60;
                            const stopExpectedTime = hasStopDelay
                              ? calcExpectedTime(st.time, stopDelaySec)
                              : null;

                            return (
                              <div className="flex items-center justify-between min-w-0 flex-1 gap-2.5 py-0.5">
                                {/* 左側: バス停名 ＋ のりば番号 */}
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

                                  {st.platform && (
                                    <span className="shrink-0 text-[10px] font-semibold px-1 py-0.5 rounded border border-border bg-surface-secondary text-foreground leading-none">
                                      {st.platform}番のりば
                                    </span>
                                  )}
                                </div>

                                {/* 右側: 時刻 */}
                                <div className="flex items-center justify-end shrink-0">
                                  {hasStopDelay ? (
                                    <div className="flex items-baseline justify-end gap-1 whitespace-nowrap">
                                      <del className="text-xs font-medium text-muted font-english tabular-nums">
                                        {st.time}
                                      </del>
                                      <span className="text-sm font-extrabold text-foreground font-english tabular-nums">
                                        {stopExpectedTime}
                                      </span>
                                    </div>
                                  ) : (
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
                                  )}
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
              /* ========== 機能1：全のりば統合・ダイヤ別・のりば選択付き時刻表一覧 ========== */
              <>
                <div className="p-3 shrink-0 bg-surface-secondary flex flex-col gap-2">
                  {/* 平日 / 土曜 / 日祝 ダイヤ切り替え */}
                  <Tabs
                    key="sendai-bus-daytype-tabs"
                    selectedKey={dayType}
                    onSelectionChange={(key) => handleDayTypeChange(String(key) as SendaiBusDayType)}
                    className="w-full"
                  >
                    <Tabs.ListContainer>
                      <Tabs.List aria-label="ダイヤ種別" className="w-full">
                        <Tabs.Tab id="weekday" className="flex-1 h-7 text-xs font-bold px-2">
                          平日{todayDayType === 'weekday' ? '（本日）' : ''}
                          <Tabs.Indicator />
                        </Tabs.Tab>
                        <Tabs.Tab id="saturday" className="flex-1 h-7 text-xs font-bold px-2">
                          土曜{todayDayType === 'saturday' ? '（本日）' : ''}
                          <Tabs.Indicator />
                        </Tabs.Tab>
                        <Tabs.Tab id="holiday" className="flex-1 h-7 text-xs font-bold px-2">
                          日祝{todayDayType === 'holiday' ? '（本日）' : ''}
                          <Tabs.Indicator />
                        </Tabs.Tab>
                      </Tabs.List>
                    </Tabs.ListContainer>
                  </Tabs>

                  {/* sendai-bus-map-v2 準拠ののりば選択ピル（全のりば / 個別のりば切り替え） */}
                  {showSubFilter && (
                    <div className="overflow-x-auto pt-1 pb-0.5 flex gap-1.5 items-center">
                      <Button
                        size="sm"
                        variant={selectedFilterKey === null ? 'primary' : 'tertiary'}
                        style={
                          selectedFilterKey === null
                            ? {
                                backgroundColor: SENDAI_BUS_COLOR,
                                borderColor: SENDAI_BUS_COLOR,
                                color: '#ffffff',
                              }
                            : undefined
                        }
                        onPress={() => setSelectedFilterKey(null)}
                        className="rounded-full text-xs font-bold px-3 h-7 shrink-0"
                      >
                        すべて
                      </Button>
                      {availableFilterOptions.map((opt) => {
                        const isSelected = selectedFilterKey === opt.key;
                        return (
                          <Button
                            key={opt.key}
                            size="sm"
                            variant={isSelected ? 'primary' : 'tertiary'}
                            style={
                              isSelected
                                ? {
                                    backgroundColor: SENDAI_BUS_COLOR,
                                    borderColor: SENDAI_BUS_COLOR,
                                    color: '#ffffff',
                                  }
                                : undefined
                            }
                            onPress={() =>
                              setSelectedFilterKey(isSelected ? null : opt.key)
                            }
                            className="rounded-full text-xs font-bold px-3 h-7 shrink-0"
                          >
                            {opt.label}
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
                  onScroll={handleListScroll}
                >
                  {filteredDepartures.length === 0 ? (
                    <EmptyState className="py-8 text-center text-xs text-muted">
                      該当するバスはありません
                    </EmptyState>
                  ) : (
                    <div className="flex flex-col pb-8">
                      {startIndex > 0 && (
                        <div className="flex justify-center py-2">
                          <Spinner size="sm" className="text-muted" />
                        </div>
                      )}

                      <ListBox
                        key={`sendai-bus-list-${stationName}-${dayType}-${selectedFilterKey ?? 'all'}`}
                        aria-label="発車便一覧"
                        selectionMode="none"
                        className="gap-0 p-0 w-full"
                      >
                        {visibleDepartures.map((dep, vIdx) => {
                          const effectiveSec = dep.scheduledSec;
                          const isPast = isTodayCal ? effectiveSec < currentMinuteFloorSec : false;
                          const isNext = dep.id === nextDepartureId;
                          const globalIdx = startIndex + vIdx;
                          const isLast = globalIdx === filteredDepartures.length - 1;

                          return (
                            <ListBox.Item
                              key={dep.id}
                              id={dep.id}
                              textValue={`${dep.departureTime}発 [${dep.routeCode}] ${formatHeadsign(dep.headsign)}`}
                              data-sendai-bus-dep-id={dep.id}
                              data-dep-id={dep.id}
                              onAction={() => {
                                setSelectedDepartureId(dep.id);
                                setOpenedFromList(true);
                              }}
                              className={`rounded-none px-3.5 py-2.5 w-full flex items-center justify-between gap-2.5 cursor-pointer font-inherit text-foreground select-none relative data-[hovered=true]:bg-surface-secondary/60 data-[pressed=true]:bg-surface-tertiary transition-colors ${
                                isNext
                                  ? 'bg-accent/15 border border-accent/40 font-bold'
                                  : isLast
                                    ? ''
                                    : 'border-b border-border'
                              }`}
                              style={{
                                opacity: isPast && !isNext ? 0.55 : 1,
                              }}
                            >
                              <div className="flex items-center justify-between gap-2.5 w-full">
                                {/* 左カラム: 発車時刻 */}
                                <div className="font-english tabular-nums shrink-0 w-[58px] min-w-[58px] flex flex-col items-center justify-center text-center min-h-[46px]">
                                  <span className="text-lg font-bold text-foreground tracking-tight">
                                    {dep.departureTime}
                                  </span>
                                </div>

                                {/* 中央カラム: 経由・系統バッジ・行先・のりば情報 */}
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                  {dep.via && (
                                    <div className="truncate text-xs text-muted mb-0.5 leading-tight">
                                      {dep.via} 経由
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1.5 w-full min-w-0">
                                    <BusRouteBadge
                                      routeCode={dep.routeCode}
                                      color={dep.routeColor}
                                      textColor={dep.routeTextColor}
                                      size="sm"
                                    />
                                    <span className="truncate text-[15px] font-bold text-foreground leading-snug">
                                      {formatHeadsign(dep.headsign)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-0.5 flex-nowrap overflow-hidden">
                                    {dep.platform && (
                                      <span className="shrink-0 text-[11px] font-medium text-muted">
                                        {dep.platform.includes('のりば') || dep.platform.includes('口') || dep.platform.includes('方面')
                                          ? dep.platform
                                          : `${dep.platform}番のりば`}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* 右端: 詳細遷移アフォーダンスアイコン */}
                                <div className="flex items-center justify-center pl-1 shrink-0">
                                  <Icon
                                    name="chevron_right"
                                    size={16}
                                    className="text-muted shrink-0"
                                  />
                                </div>
                              </div>
                            </ListBox.Item>
                          );
                        })}
                      </ListBox>

                      {endIndex < filteredDepartures.length && (
                        <div className="flex justify-center py-2">
                          <Spinner size="sm" className="text-muted" />
                        </div>
                      )}
                    </div>
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
