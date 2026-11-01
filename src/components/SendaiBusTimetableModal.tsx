import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Modal,
  SegmentedControl,
  ScrollArea,
  Badge,
  Group,
  Text,
  Stack,
  Timeline,
  UnstyledButton,
  Button,
  Box,
  Title,
} from '@mantine/core';
import { getCurrentRailwaySeconds } from '../utils/trainPosition';
import {
  SENDAI_BUS_COLOR,
  SendaiBusDayType,
  SendaiBusDeparture,
  SendaiBusStationSchedule,
  getSendaiBusDayType,
} from '../utils/sendaiBusApi';
import { JisBus } from './icons';
import { Icon } from './Icon';
import { BusRouteBadge } from './BusRouteBadge';

interface SendaiBusTimetableModalProps {
  isOpen: boolean;
  onClose: () => void;
  stationSchedule: SendaiBusStationSchedule | null;
  initialGroupId?: string | null;
  initialDepartureId?: string | null;
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
  initialGroupId = null,
  initialDepartureId = null,
  now,
}) => {
  const groups = stationSchedule?.groups ?? [];
  const defaultGroupId = groups[0]?.groupId ?? '';

  const todayDayType = useMemo(() => getSendaiBusDayType(now), [now]);

  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    initialGroupId || defaultGroupId
  );
  const [dayType, setDayType] = useState<SendaiBusDayType>(todayDayType);
  // 個別のりば / 系統絞り込みフィルター（複数選択・初期状態は未選択＝全表示）
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  // 選択中の便ID（全停車バス停タイムライン表示用）
  const [selectedDepartureId, setSelectedDepartureId] = useState<string | null>(
    initialDepartureId
  );

  // モーダルが開いたときに初期状態を同期
  useEffect(() => {
    if (isOpen) {
      const validGroupId =
        initialGroupId && groups.some((g) => g.groupId === initialGroupId)
          ? initialGroupId
          : defaultGroupId;
      setSelectedGroupId(validGroupId);
      setDayType(getSendaiBusDayType(now));
      setSelectedFilters([]);
      setSelectedDepartureId(initialDepartureId || null);
    }
  }, [isOpen, stationSchedule?.stationId, initialGroupId, initialDepartureId, defaultGroupId]);

  const activeGroup = useMemo(
    () => groups.find((g) => g.groupId === selectedGroupId) ?? groups[0] ?? null,
    [groups, selectedGroupId]
  );

  // のりばグループ変更時はフィルターと便選択をリセット
  const handleGroupChange = (newGroupId: string) => {
    setSelectedGroupId(newGroupId);
    setSelectedFilters([]);
    setSelectedDepartureId(null);
  };

  // 現在時刻（4:00基準の鉄道秒・分）
  const currentSec = useMemo(() => getCurrentRailwaySeconds(now), [now]);
  const currentMinuteFloorSec = useMemo(
    () => Math.floor(currentSec / 60) * 60,
    [currentSec]
  );
  const currentMinutes = useMemo(() => Math.floor(currentSec / 60), [currentSec]);

  const isTodayCal = dayType === todayDayType;

  // 現在ののりばグループ・ダイヤ種別の全便リスト
  const allDepartures = useMemo(() => {
    if (!activeGroup) return [];
    return activeGroup[dayType] || [];
  }, [activeGroup, dayType]);

  // フィルター適用後の発車リスト
  const filteredDepartures = useMemo(() => {
    if (selectedFilters.length === 0) return allDepartures;
    return allDepartures.filter((d) => selectedFilters.includes(d.filterKey));
  }, [allDepartures, selectedFilters]);

  // 次発便（現在時刻以降の最初の便。本日ダイヤの場合は遅延込みの予想発車時刻で判定）
  const nextDepartureId = useMemo(() => {
    for (const dep of filteredDepartures) {
      const effectiveSec = isTodayCal
        ? dep.scheduledSec + dep.delaySec
        : dep.scheduledSec;
      if (effectiveSec >= currentMinuteFloorSec) {
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

  const listViewportRef = useRef<HTMLDivElement>(null);
  const timelineViewportRef = useRef<HTMLDivElement>(null);

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
        `[data-sendai-bus-dep-id="${nextDepartureId}"]`
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
  }, [
    isOpen,
    selectedDeparture,
    nextDepartureId,
    selectedGroupId,
    dayType,
    selectedFilters,
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

  if (!stationSchedule || !activeGroup) return null;

  const hasMultipleGroups = groups.length > 1;
  const availableFilterOptions = activeGroup.filterOptions || [];
  const showSubFilter = availableFilterOptions.length > 1;

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={
        <Group gap={8} wrap="nowrap" align="center">
          <JisBus size={18} color={SENDAI_BUS_COLOR} />
          <Text fw={900} fz={15}>
            {stationSchedule.stationName}駅 仙台市営バス時刻表
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
      {selectedDeparture ? (
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
            <Group justify="space-between" align="center" wrap="nowrap">
              <Button
                size="compact-xs"
                variant="default"
                radius="md"
                leftSection={<Icon name="arrow_back" size={14} />}
                onClick={() => setSelectedDepartureId(null)}
                fw={700}
              >
                時刻表に戻る
              </Button>
              <Group gap={6} wrap="nowrap">
                {isTodayCal && selectedDeparture.isDelayed && (
                  <Badge size="xs" radius="sm" color="red" variant="filled" tt="none">
                    +{selectedDeparture.delayMinutes}分遅れ
                  </Badge>
                )}
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
                    ? ` (${selectedDeparture.platform}番のりば)`
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
                    backgroundColor: SENDAI_BUS_COLOR,
                    borderRadius: 2,
                    flexShrink: 0,
                  }}
                />
                <Stack gap={2} className="min-w-0">
                  <Group gap={6} align="center" wrap="nowrap">
                    <BusRouteBadge
                      routeCode={selectedDeparture.routeCode}
                      color={SENDAI_BUS_COLOR}
                      size="sm"
                    />
                    {selectedDeparture.via && (
                      <Text fz="xs" fw={700} c="dimmed" className="truncate">
                        {selectedDeparture.via}経由
                      </Text>
                    )}
                  </Group>
                  <Title order={3} fz={16} fw={800} lh={1.2} className="truncate">
                    {selectedDeparture.headsign}
                    <Text component="span" fz="xs" fw={700} ml={2} c="dimmed">
                      行
                    </Text>
                  </Title>
                </Stack>
              </Group>

              <Stack gap={1} align="flex-end" style={{ flexShrink: 0 }}>
                <Text
                  fz={11}
                  c="dimmed"
                  fw={600}
                  className="font-english tabular-nums"
                >
                  {selectedDeparture.platform
                    ? `${selectedDeparture.platform}番のりば `
                    : ''}
                  {selectedDeparture.departureTime}発
                </Text>
                {isTodayCal && selectedDeparture.isDelayed ? (
                  <Text
                    fz="xs"
                    fw={800}
                    c="red"
                    className="font-english tabular-nums"
                  >
                    予想 {selectedDeparture.expectedTime}発
                  </Text>
                ) : (
                  <Text fz="xs" fw={800} className="font-english tabular-nums">
                    終着 {selectedDeparture.terminalArrivalTime}着
                  </Text>
                )}
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
                const boardingMin = selectedDeparture.scheduledMinutes;

                return (
                  <Timeline active={-1} bulletSize={18} lineWidth={2.5}>
                    {stops.map((st, i) => {
                      const isFirst = i === 0;
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

                      const diffFromBoarding = st.scheduledMinutes - boardingMin;
                      const customBullet = isCurrentPos ? (
                        <PentagonIcon lineColor={SENDAI_BUS_COLOR} size={14} />
                      ) : undefined;

                      return (
                        <Timeline.Item
                          key={`${st.stopId}-${st.stopSequence}`}
                          bullet={customBullet}
                          lineVariant="solid"
                          style={
                            !linePassed
                              ? ({
                                  '--item-border-color': SENDAI_BUS_COLOR,
                                } as React.CSSProperties)
                              : undefined
                          }
                          styles={
                            !passed
                              ? {
                                  itemBullet: {
                                    borderColor: SENDAI_BUS_COLOR,
                                    backgroundColor: isBoarding
                                      ? SENDAI_BUS_COLOR
                                      : 'var(--mantine-color-body)',
                                  },
                                }
                              : undefined
                          }
                        >
                          <Box
                            data-sendai-bus-stop-index={i}
                            py={4}
                            px={6}
                            style={{
                              borderRadius: 'var(--mantine-radius-sm)',
                              backgroundColor: isBoarding
                                ? `${SENDAI_BUS_COLOR}1F`
                                : undefined,
                            }}
                          >
                            <Group justify="space-between" wrap="nowrap" gap="xs">
                              {/* 左側: バス停名 ＋ のりば番号 ＋ バッジ */}
                              <Group
                                gap={6}
                                wrap="nowrap"
                                align="center"
                                className="min-w-0"
                              >
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
                                  className="truncate"
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

                                {isBoarding && (
                                  <Badge
                                    size="xs"
                                    radius="xs"
                                    variant="filled"
                                    tt="none"
                                    style={{
                                      backgroundColor: SENDAI_BUS_COLOR,
                                      color: '#ffffff',
                                      flexShrink: 0,
                                    }}
                                  >
                                    乗車
                                  </Badge>
                                )}
                                {isCurrentPos && (
                                  <Badge
                                    size="xs"
                                    radius="xs"
                                    variant="outline"
                                    tt="none"
                                    style={{
                                      borderColor: SENDAI_BUS_COLOR,
                                      color: SENDAI_BUS_COLOR,
                                      flexShrink: 0,
                                    }}
                                  >
                                    現在位置
                                  </Badge>
                                )}
                                {isFirst && !isBoarding && (
                                  <Badge
                                    size="xs"
                                    radius="xs"
                                    color="gray"
                                    variant="light"
                                    tt="none"
                                    className="shrink-0"
                                  >
                                    始発
                                  </Badge>
                                )}
                                {isLast && !isBoarding && (
                                  <Badge
                                    size="xs"
                                    radius="xs"
                                    color="gray"
                                    variant="light"
                                    tt="none"
                                    className="shrink-0"
                                  >
                                    終着
                                  </Badge>
                                )}
                              </Group>

                              {/* 右側: 遅延表示 ＋ 所要時間（乗車バス停以降）＋ 発着時刻 */}
                              <Group
                                gap={6}
                                wrap="nowrap"
                                align="center"
                                justify="flex-end"
                                style={{ flexShrink: 0 }}
                              >
                                {isBoarding &&
                                  isTodayCal &&
                                  selectedDeparture.isDelayed && (
                                    <Badge
                                      size="xs"
                                      radius="sm"
                                      color="red"
                                      variant="light"
                                      fw={700}
                                      tt="none"
                                      className="font-english tabular-nums shrink-0"
                                    >
                                      +{selectedDeparture.delayMinutes}分遅れ
                                    </Badge>
                                  )}
                                {i > boardingIdx && diffFromBoarding >= 0 && (
                                  <Text
                                    fz={11}
                                    fw={600}
                                    c="dimmed"
                                    className="font-english tabular-nums"
                                    style={{
                                      whiteSpace: 'nowrap',
                                      minWidth: 34,
                                      textAlign: 'right',
                                    }}
                                  >
                                    +{diffFromBoarding}分
                                  </Text>
                                )}
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
                                  {st.time} {i <= boardingIdx && !isLast ? '発' : '着'}
                                </Text>
                              </Group>
                            </Group>
                          </Box>
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
        /* ========== 機能1：のりばグループ別・ダイヤ別・絞り込み付き1日全時刻表一覧 ========== */
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
            {/* のりばグループ切り替え */}
            {hasMultipleGroups && (
              <SegmentedControl
                size="xs"
                fullWidth
                radius="md"
                value={activeGroup.groupId}
                onChange={handleGroupChange}
                data={groups.map((g) => ({
                  label: g.shortTitle,
                  value: g.groupId,
                }))}
              />
            )}

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

            {/* 個別のりば / 系統絞り込みフィルター（JR・なとりん号と完全統一のUI） */}
            {showSubFilter && (
              <Group gap={6} align="center" wrap="wrap" pt={2}>
                <Group gap={4} align="center" c="dimmed" mr={2}>
                  <Icon name="filter_alt" size={16} />
                </Group>
                {availableFilterOptions.map((opt) => {
                  const isSelected = selectedFilters.includes(opt.key);
                  return (
                    <Button
                      key={opt.key}
                      size="xs"
                      radius="md"
                      variant={isSelected ? 'filled' : 'default'}
                      onClick={() => {
                        setSelectedFilters((prev) =>
                          prev.includes(opt.key)
                            ? prev.filter((k) => k !== opt.key)
                            : [...prev, opt.key]
                        );
                      }}
                      style={
                        isSelected
                          ? {
                              backgroundColor: SENDAI_BUS_COLOR,
                              borderColor: SENDAI_BUS_COLOR,
                              color: '#ffffff',
                            }
                          : undefined
                      }
                    >
                      {opt.label}
                    </Button>
                  );
                })}
              </Group>
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
          >
            {filteredDepartures.length === 0 ? (
              <Text py="xl" ta="center" fz="xs" c="dimmed">
                該当するバスはありません
              </Text>
            ) : (
              <Stack gap={0} p={6} pb="xl">
                {filteredDepartures.map((dep) => {
                  const effectiveSec = isTodayCal
                    ? dep.scheduledSec + dep.delaySec
                    : dep.scheduledSec;
                  const isPast = effectiveSec < currentMinuteFloorSec;
                  const isNext = dep.id === nextDepartureId;
                  const dimmed = isPast && !isNext;
                  const showDelay = isTodayCal && dep.isDelayed;

                  return (
                    <UnstyledButton
                      key={dep.id}
                      data-sendai-bus-dep-id={dep.id}
                      onClick={() => setSelectedDepartureId(dep.id)}
                      style={{
                        borderRadius: 'var(--mantine-radius-md)',
                        backgroundColor: isNext
                          ? `${SENDAI_BUS_COLOR}1F`
                          : undefined,
                        opacity: dimmed ? 0.5 : 1,
                        width: '100%',
                      }}
                      className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      <Group
                        justify="space-between"
                        wrap="nowrap"
                        gap={6}
                        px={8}
                        py={8}
                      >
                        {/* 左側: 発車時刻 | 系統バッジ | 行先・経由・のりば | 次発・遅延バッジ */}
                        <Group gap={7} wrap="nowrap" className="min-w-0">
                          <Stack
                            gap={0}
                            align="flex-end"
                            w="3.2em"
                            className="font-english tabular-nums shrink-0"
                          >
                            <Text
                              fz="sm"
                              fw={800}
                              ta="right"
                              style={
                                isNext ? { color: SENDAI_BUS_COLOR } : undefined
                              }
                            >
                              {dep.departureTime}
                            </Text>
                            {showDelay && (
                              <Text fz={10} fw={800} c="red" ta="right">
                                {dep.expectedTime}
                              </Text>
                            )}
                          </Stack>

                          <BusRouteBadge
                            routeCode={dep.routeCode}
                            color={SENDAI_BUS_COLOR}
                            size="sm"
                          />

                          <Stack gap={1} className="min-w-0">
                            <Group gap={5} wrap="nowrap" align="center">
                              <Text
                                fz="sm"
                                fw={isNext ? 800 : 600}
                                className="truncate"
                              >
                                {dep.headsign}行
                              </Text>
                              {isNext && (
                                <Badge
                                  size="xs"
                                  variant="filled"
                                  radius="sm"
                                  tt="none"
                                  style={{
                                    backgroundColor: SENDAI_BUS_COLOR,
                                    color: '#ffffff',
                                    flexShrink: 0,
                                  }}
                                >
                                  次発
                                </Badge>
                              )}
                              {showDelay && (
                                <Badge
                                  size="xs"
                                  color="red"
                                  variant="light"
                                  radius="sm"
                                  tt="none"
                                  fw={700}
                                  className="shrink-0"
                                >
                                  +{dep.delayMinutes}分遅れ
                                </Badge>
                              )}
                            </Group>
                            <Group gap={6} wrap="nowrap" align="center">
                              {dep.platform && (
                                <Text fz={10.5} fw={700} c="dimmed" className="shrink-0">
                                  {dep.platform}番のりば
                                </Text>
                              )}
                              {dep.via && (
                                <Text fz={10.5} c="dimmed" className="truncate">
                                  {dep.via}経由
                                </Text>
                              )}
                            </Group>
                          </Stack>
                        </Group>

                        {/* 右側: 終着到着時刻 | 詳細シェブロン */}
                        <Group
                          gap={6}
                          wrap="nowrap"
                          className="shrink-0 font-english tabular-nums"
                        >
                          <Text fz={11} c="dimmed" ta="right">
                            終着 {dep.terminalArrivalTime}
                          </Text>
                          <Icon
                            name="chevron_right"
                            size={15}
                            className="text-slate-400 dark:text-slate-500"
                          />
                        </Group>
                      </Group>
                    </UnstyledButton>
                  );
                })}
              </Stack>
            )}
          </ScrollArea>
        </>
      )}
    </Modal>
  );
};
