import React, { useState, useMemo, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import {
  Modal,
  SegmentedControl,
  ScrollArea,
  Badge,
  Group,
  Text,
  Stack,
  Timeline,
  Button,
  Box,
  Title,
  Skeleton,
  Loader,
  Center,
} from '@mantine/core';
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
  BusDepartureRow,
  BusDepartureRowSkeleton,
  formatHeadsign,
} from './BusDepartureRow';

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

/** 静止した五角形バスアイコン（下向き進行方向ノーズ ＋ 四角形車体） */
const PentagonIcon: React.FC<{ lineColor: string; size?: number }> = ({
  lineColor,
  size = 14,
}) => {
  const w = size;
  const bodyH = Math.round(size * 0.6);
  const noseH = Math.round(size * 0.4);

  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: w,
          height: bodyH,
          backgroundColor: lineColor,
          borderRadius: '2px 2px 0 0',
        }}
      />
      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: `${w / 2}px solid transparent`,
          borderRight: `${w / 2}px solid transparent`,
          borderTop: `${noseH}px solid ${lineColor}`,
        }}
      />
    </div>
  );
};

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

  // モーダルが開いたときに初期状態を同期
  useEffect(() => {
    if (isOpen) {
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
  }, [isOpen, stationSchedule?.stationId, initialFilterKey, initialDepartureId]);

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
  const timelineViewportRef = useRef<HTMLDivElement>(null);

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
  const handleScrollPositionChange = useCallback(
    ({ y }: { x: number; y: number }) => {
      const vp = listViewportRef.current;
      if (!vp) return;

      // 初期スクロール完了前は上端トリガーを抑制
      if (!hasInitialScrolledRef.current) return;

      const scrollTop = y;
      const clientHeight = vp.clientHeight;
      const scrollHeight = vp.scrollHeight;

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
      const viewport = timelineViewportRef.current;
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
      opened={isOpen}
      onClose={onClose}
      title={
        <Group gap={8} wrap="nowrap" align="center">
          <JisBus size={18} color={SENDAI_BUS_COLOR} />
          <Text fw={900} fz={15}>
            {titleStationName ? `${titleStationName}駅 ` : ''}
            {isTripDetail
              ? '仙台市営バス運行詳細'
              : '仙台市営バス時刻表'}
          </Text>
        </Group>
      }
      centered
      size="md"
      radius="lg"
      padding={0}
      zIndex={1000}
      overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
      styles={{
        content: {
          height: 'calc(100dvh - 4rem)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        },
        header: {
          borderBottom: '1px solid var(--mantine-color-default-border)',
          paddingInline: 14,
          minHeight: 50,
        },
        title: { fontWeight: 900, fontSize: 15 },
        body: {
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
        },
      }}
    >
      {isModalLoading ? (
        /* ========== 読み込み中スケルトンローダー（最低高さ360px・CLS防止） ========== */
        <>
          <Stack
            gap={6}
            p="sm"
            style={{
              flexShrink: 0,
              borderBottom: '1px solid var(--mantine-color-default-border)',
              backgroundColor: 'var(--mantine-color-default-hover)',
            }}
          >
            {/* 平日 / 土曜 / 日祝 ダイヤ切り替えスケルトン */}
            <Skeleton height={28} radius="sm" />

            {/* のりば選択ピルスケルトン */}
            <Box pt={4} pb={2}>
              <Group gap={6} wrap="nowrap">
                <Skeleton width={80} height={24} radius="xl" />
                <Skeleton width={64} height={24} radius="xl" />
                <Skeleton width={64} height={24} radius="xl" />
                <Skeleton width={64} height={24} radius="xl" />
              </Group>
            </Box>
          </Stack>

          {/* 時刻表一覧スクロール領域（最低高さ360px確保、実寸行と完全一致） */}
          <ScrollArea
            type="auto"
            data-scrollable="true"
            style={{ flex: 1, minHeight: 360 }}
            viewportProps={{
              style: { overscrollBehavior: 'contain' },
            }}
          >
            <Stack gap={0} pb="xl">
              {Array.from({ length: 8 }).map((_, idx) => (
                <BusDepartureRowSkeleton
                  key={idx}
                  isLast={idx === 7}
                />
              ))}
            </Stack>
          </ScrollArea>
        </>
      ) : selectedDeparture ? (
        /* ========== 機能2：全停車バス停タイムライン表示 ========== */
        <>
          <Stack
            gap={8}
            p="sm"
            style={{
              flexShrink: 0,
              borderBottom: '1px solid var(--mantine-color-default-border)',
              backgroundColor: 'var(--mantine-color-default-hover)',
            }}
          >
            <Group justify="space-between" align="center" wrap="wrap" gap={8}>
              {openedFromList ? (
                <Button
                  size="compact-xs"
                  variant="default"
                  radius="md"
                  leftSection={<Icon name="arrow_back" size={14} />}
                  onClick={() => {
                    setSelectedDepartureId(null);
                    setOpenedFromList(false);
                  }}
                  fw={700}
                >
                  時刻表に戻る
                </Button>
              ) : (
                <Text fz={12} fw={700} c="dimmed">
                  運行状況・全停車バス停
                </Text>
              )}
              <Group gap={6} wrap="nowrap">
                <Badge
                  size="xs"
                  radius="sm"
                  color={
                    dayType === 'holiday'
                      ? 'red'
                      : dayType === 'saturday'
                        ? 'blue'
                        : 'gray'
                  }
                  variant="light"
                  tt="none"
                >
                  {DAY_TYPE_LABELS[dayType]}
                </Badge>
                <Badge size="xs" radius="sm" variant="default" fw={700} tt="none">
                  {selectedDeparture.stopName}
                  {selectedDeparture.platform
                    ? ` (${selectedDeparture.platform})`
                    : ''}
                </Badge>
              </Group>
            </Group>

            <Group justify="space-between" align="center" wrap="nowrap" pt={2}>
              <Group gap={8} align="center" wrap="nowrap" className="min-w-0">
                <Box
                  w={4}
                  h={36}
                  style={{
                    backgroundColor: selectedDeparture.routeColor,
                    borderRadius: 2,
                    flexShrink: 0,
                  }}
                />
                <Stack gap={2} className="min-w-0">
                  <Group gap={6} align="center" wrap="nowrap">
                    <BusRouteBadge
                      routeCode={selectedDeparture.routeCode}
                      color={selectedDeparture.routeColor}
                      textColor={selectedDeparture.routeTextColor}
                      size="sm"
                    />
                    {selectedDeparture.via && (
                      <Text fz="xs" fw={700} c="dimmed" className="truncate">
                        {selectedDeparture.via}経由
                      </Text>
                    )}
                  </Group>
                  <Title order={3} fz={16} fw={800} lh={1.2} className="truncate">
                    {formatHeadsign(selectedDeparture.headsign)}
                  </Title>
                </Stack>
              </Group>

              <Stack gap={2} align="flex-end" style={{ flexShrink: 0 }}>
                {isTodayCal && selectedDeparture.isDelayed && selectedDeparture.expectedTime ? (
                  <Group gap={6} align="baseline" wrap="nowrap" justify="flex-end">
                    <del
                      style={{
                        color: 'var(--mantine-color-dimmed)',
                        fontWeight: 500,
                        fontSize: 12,
                      }}
                      className="font-english tabular-nums"
                    >
                      {selectedDeparture.departureTime}
                    </del>
                    <span
                      style={{ color: 'var(--mantine-color-text)', fontWeight: 800, fontSize: 16 }}
                      className="font-english tabular-nums"
                    >
                      {selectedDeparture.expectedTime}発
                    </span>
                  </Group>
                ) : (
                  <Text fz={16} fw={800} className="font-english tabular-nums">
                    {selectedDeparture.departureTime}発
                  </Text>
                )}
                <Text fz={11} c="dimmed" fw={600} className="font-english tabular-nums">
                  終着 {selectedDeparture.terminalArrivalTime}着
                </Text>
              </Stack>
            </Group>
          </Stack>

          <ScrollArea
            viewportRef={timelineViewportRef}
            type="auto"
            data-scrollable="true"
            style={{ flex: 1, minHeight: 0 }}
            viewportProps={{
              style: { overscrollBehavior: 'contain' },
            }}
          >
            <Box p="md" pb="xl">
              <Group justify="space-between" align="baseline" mb={12} wrap="nowrap">
                <Text fz="xs" fw={700} c="dimmed">
                  全停車バス停・発着時刻タイムライン
                </Text>
                <Text fz={10.5} c="dimmed" fw={600}>
                  全{selectedDeparture.stops.length}停留所
                </Text>
              </Group>

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
                  <Timeline active={-1} bulletSize={18} lineWidth={2.5}>
                    {stops.map((st, i) => {
                      const isLast = i === stops.length - 1;
                      const isBoarding = i === boardingIdx;
                      const isCurrentPos =
                        isCurrentlyRunning && i === currentStopIdx;

                      // 乗車バス停より前のバス停、または本日運行中で既に通過済みのバス停は控えめなグレーにする
                      const passed =
                        i < boardingIdx ||
                        (isCurrentlyRunning && i < currentStopIdx);
                      const linePassed =
                        i < boardingIdx ||
                        (isCurrentlyRunning && i < currentStopIdx);

                      const customBullet = isCurrentPos ? (
                        <PentagonIcon lineColor={selectedDeparture.routeColor} size={14} />
                      ) : undefined;

                      return (
                        <Timeline.Item
                          key={`${st.stopId}-${st.stopSequence}`}
                          bullet={customBullet}
                          lineVariant="solid"
                          style={
                            !linePassed
                              ? ({
                                  '--item-border-color': selectedDeparture.routeColor,
                                } as React.CSSProperties)
                              : undefined
                          }
                          styles={
                            !passed
                              ? {
                                  itemBullet: {
                                    borderColor: selectedDeparture.routeColor,
                                    backgroundColor: isBoarding
                                      ? selectedDeparture.routeColor
                                      : 'var(--mantine-color-body)',
                                  },
                                }
                              : undefined
                          }
                        >
                          {(() => {
                            // バス停ごとのリアルタイム遅延秒数（APIの遅延秒数マップ、なければ便全体の遅延）
                            const stopDelaySec = isTodayCal
                              ? (stopDelays[st.stopId] ?? selectedDeparture.delaySec ?? 0)
                              : 0;
                            const hasStopDelay = !passed && stopDelaySec >= 60;
                            const stopExpectedTime = hasStopDelay
                              ? calcExpectedTime(st.time, stopDelaySec)
                              : null;

                            const timeSuffix = i <= boardingIdx && !isLast ? '発' : '着';

                            return (
                              <Box
                                data-sendai-bus-stop-index={i}
                                py={4}
                                px={6}
                                style={{
                                  borderRadius: 'var(--mantine-radius-sm)',
                                  backgroundColor: isBoarding
                                    ? `${selectedDeparture.routeColor}1F`
                                    : undefined,
                                }}
                              >
                                <Group justify="space-between" wrap="nowrap" align="center" gap="sm">
                                  {/* 左側: バス停名 ＋ のりば番号 */}
                                  <Group gap={6} wrap="nowrap" align="center" style={{ flex: 1, minWidth: 0 }}>
                                    <Text
                                      fz="sm"
                                      fw={
                                        isBoarding || isLast
                                          ? 800
                                          : passed
                                            ? 500
                                            : 700
                                      }
                                      c={passed && !isBoarding ? 'dimmed' : undefined}
                                      style={{
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        lineHeight: 1.3,
                                      }}
                                    >
                                      {st.stopName}
                                    </Text>

                                    {st.platform && (
                                      <Badge
                                        size="xs"
                                        radius="xs"
                                        variant="default"
                                        fw={600}
                                        tt="none"
                                        className="shrink-0"
                                      >
                                        {st.platform}番のりば
                                      </Badge>
                                    )}
                                  </Group>

                                  {/* 右側: 発着時刻（定時取消線＋予想時刻） */}
                                  <Group
                                    gap={6}
                                    wrap="nowrap"
                                    align="center"
                                    justify="flex-end"
                                    style={{ flexShrink: 0 }}
                                  >
                                    {hasStopDelay ? (
                                      <Group
                                        gap={4}
                                        align="baseline"
                                        wrap="nowrap"
                                        justify="flex-end"
                                        style={{ whiteSpace: 'nowrap' }}
                                      >
                                        <del
                                          style={{
                                            color: 'var(--mantine-color-dimmed)',
                                            fontWeight: 500,
                                            fontSize: 12,
                                          }}
                                          className="font-english tabular-nums"
                                        >
                                          {st.time}
                                        </del>
                                        <span
                                          style={{
                                            color: 'var(--mantine-color-text)',
                                            fontWeight: 800,
                                            fontSize: 14,
                                          }}
                                          className="font-english tabular-nums"
                                        >
                                          {stopExpectedTime}
                                        </span>
                                        <span
                                          style={{
                                            fontSize: 12,
                                            fontWeight: isBoarding || isLast ? 800 : 700,
                                            color: 'var(--mantine-color-text)',
                                          }}
                                        >
                                          {timeSuffix}
                                        </span>
                                      </Group>
                                    ) : (
                                      <Text
                                        fz="xs"
                                        fw={isBoarding || isLast ? 800 : 700}
                                        c={passed && !isBoarding ? 'dimmed' : undefined}
                                        className="font-english tabular-nums"
                                        style={{
                                          whiteSpace: 'nowrap',
                                          minWidth: 52,
                                          textAlign: 'right',
                                        }}
                                      >
                                        {st.time} {timeSuffix}
                                      </Text>
                                    )}
                                  </Group>
                                </Group>
                              </Box>
                            );
                          })()}
                        </Timeline.Item>
                      );
                    })}
                  </Timeline>
                );
              })()}
            </Box>
          </ScrollArea>
        </>
      ) : (
        /* ========== 機能1：全のりば統合・ダイヤ別・のりば選択付き時刻表一覧 ========== */
        <>
          <Stack
            gap={6}
            p="sm"
            style={{
              flexShrink: 0,
              borderBottom: '1px solid var(--mantine-color-default-border)',
              backgroundColor: 'var(--mantine-color-default-hover)',
            }}
          >
            {/* 平日 / 土曜 / 日祝 ダイヤ切り替え */}
            <SegmentedControl
              size="xs"
              fullWidth
              radius="md"
              value={dayType}
              onChange={(val) => setDayType(val as SendaiBusDayType)}
              data={[
                {
                  label: `平日${todayDayType === 'weekday' ? '（本日）' : ''}`,
                  value: 'weekday',
                },
                {
                  label: `土曜${todayDayType === 'saturday' ? '（本日）' : ''}`,
                  value: 'saturday',
                },
                {
                  label: `日祝${todayDayType === 'holiday' ? '（本日）' : ''}`,
                  value: 'holiday',
                },
              ]}
            />

            {/* sendai-bus-map-v2 準拠ののりば選択ピル（全のりば / 個別のりば切り替え） */}
            {showSubFilter && (
              <Box
                style={{
                  overflowX: 'auto',
                  WebkitOverflowScrolling: 'touch',
                }}
                pt={4}
                pb={2}
              >
                <Group gap={6} wrap="nowrap" align="center">
                  <Button
                    size="compact-xs"
                    radius="xl"
                    variant={selectedFilterKey === null ? 'filled' : 'default'}
                    style={
                      selectedFilterKey === null
                        ? {
                            backgroundColor: SENDAI_BUS_COLOR,
                            color: '#ffffff',
                          }
                        : undefined
                    }
                    onClick={() => setSelectedFilterKey(null)}
                    fw={700}
                    className="shrink-0"
                  >
                    すべて
                  </Button>
                  {availableFilterOptions.map((opt) => {
                    const isSelected = selectedFilterKey === opt.key;
                    return (
                      <Button
                        key={opt.key}
                        size="compact-xs"
                        radius="xl"
                        variant={isSelected ? 'filled' : 'default'}
                        style={
                          isSelected
                            ? {
                                backgroundColor: SENDAI_BUS_COLOR,
                                color: '#ffffff',
                              }
                            : undefined
                        }
                        onClick={() =>
                          setSelectedFilterKey(isSelected ? null : opt.key)
                        }
                        fw={700}
                        className="shrink-0"
                      >
                        {opt.label}
                      </Button>
                    );
                  })}
                </Group>
              </Box>
            )}
          </Stack>

          {/* 時刻表一覧スクロール領域 */}
          <ScrollArea
            viewportRef={listViewportRef}
            type="auto"
            data-scrollable="true"
            style={{ flex: 1, minHeight: 0 }}
            viewportProps={{
              style: { overscrollBehavior: 'contain' },
            }}
            onScrollPositionChange={handleScrollPositionChange}
            onBottomReached={() => {
              if (endIndex < filteredDepartures.length) {
                handleLoadLater();
              }
            }}
          >
            {filteredDepartures.length === 0 ? (
              <Text py="xl" ta="center" fz="xs" c="dimmed">
                該当するバスはありません
              </Text>
            ) : (
              <Stack gap={0} pb="xl">
                {startIndex > 0 && (
                  <Center py="sm">
                    <Loader size="xs" color="gray" type="dots" />
                  </Center>
                )}

                {visibleDepartures.map((dep, vIdx) => {
                  const effectiveSec = dep.scheduledSec;
                  const isPast = isTodayCal ? effectiveSec < currentMinuteFloorSec : false;
                  const isNext = dep.id === nextDepartureId;
                  const globalIdx = startIndex + vIdx;

                  return (
                    <div key={dep.id} data-sendai-bus-dep-id={dep.id}>
                      <BusDepartureRow
                        routeCode={dep.routeCode}
                        routeColor={dep.routeColor}
                        routeTextColor={dep.routeTextColor}
                        headsign={dep.headsign}
                        via={dep.via}
                        platform={dep.platform}
                        departureTime={dep.departureTime}
                        isDelayed={false}
                        delayMinutes={0}
                        expectedTime={undefined}
                        showDelay={false}
                        isNext={isNext}
                        isPast={isPast && !isNext}
                        onClick={() => {
                          setSelectedDepartureId(dep.id);
                          setOpenedFromList(true);
                        }}
                        isLast={globalIdx === filteredDepartures.length - 1}
                      />
                    </div>
                  );
                })}

                {endIndex < filteredDepartures.length && (
                  <Center py="sm">
                    <Loader size="xs" color="gray" type="dots" />
                  </Center>
                )}
              </Stack>
            )}
          </ScrollArea>
        </>
      )}
    </Modal>
  );
};
