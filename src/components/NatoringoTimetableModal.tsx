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

interface NatoringoTimetableModalProps {
  isOpen: boolean;
  onClose: () => void;
  stationId: string;
  initialStopId?: string | null;
  initialDepartureId?: string | null;
  now: Date;
}

/** 静止した五角形バスアイコン（下向き進行方向ノーズ ＋ 四角形車体） */
const PentagonIcon: React.FC<{ lineColor: string; size?: number }> = ({ lineColor, size = 14 }) => {
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

  // モーダルが開いたときに初期状態を同期
  useEffect(() => {
    if (isOpen) {
      const validStopId =
        initialStopId && busStops.some((s) => s.stopId === initialStopId)
          ? initialStopId
          : defaultStopId;
      setSelectedStopId(validStopId);
      setDayType(isWeekendHolidayOrYearEnd(now) ? 'holiday' : 'weekday');
      setSelectedLines([]);
      setSelectedDepartureId(initialDepartureId || null);
    }
  }, [isOpen, stationId, initialStopId, initialDepartureId, defaultStopId]);

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
      const viewport = timelineViewportRef.current;
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
      opened={isOpen}
      onClose={onClose}
      title={
        <Group gap={8} wrap="nowrap" align="center">
          <JisBus size={18} color="#d97706" />
          <Text fw={900} fz={15}>
            {stationSchedule.stationName}駅 なとりん号時刻表
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
        /* ========== 機能2：全停車バス停＆運賃タイムライン表示 ========== */
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
                <Badge
                  size="xs"
                  radius="sm"
                  color={dayType === 'holiday' ? 'red' : 'gray'}
                  variant="light"
                  tt="none"
                >
                  {dayType === 'holiday' ? '土日祝ダイヤ' : '平日ダイヤ'}
                </Badge>
                <Badge size="xs" radius="sm" variant="default" fw={700} tt="none">
                  {activeBusStop.stopName}
                </Badge>
              </Group>
            </Group>

            <Group justify="space-between" align="center" wrap="nowrap" pt={2}>
              <Group gap={8} align="center" wrap="nowrap" className="min-w-0">
                <Box
                  w={4}
                  h={34}
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
                      size="sm"
                    />
                    <Text fz="xs" fw={800} c="dimmed" className="truncate">
                      {selectedDeparture.lineName}
                    </Text>
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
                <Text fz={11} c="dimmed" fw={600} className="font-english tabular-nums">
                  {activeBusStop.stopName} {selectedDeparture.departureTime}発
                </Text>
                <Text fz="xs" fw={800} className="font-english tabular-nums">
                  終着 {selectedDeparture.terminalArrivalTime}着（{selectedDeparture.terminalFare}円）
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
                  全停車バス停・到着時刻・運賃タイムライン
                </Text>
                <Text fz={10.5} c="dimmed" fw={600}>
                  全{selectedDeparture.stops.length}停留所
                </Text>
              </Group>

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
                  <Timeline active={-1} bulletSize={18} lineWidth={2.5}>
                    {stops.map((st, i) => {
                      const isLast = i === stops.length - 1;
                      const isBoarding = i === boardingIdx;
                      const isCurrentPos = isCurrentlyRunning && i === currentStopIdx;

                      // 乗車バス停より前のバス停、または本日運行中で既に通過済みのバス停は控えめなグレーにする
                      const passed =
                        i < boardingIdx || (isCurrentlyRunning && i < currentStopIdx);
                      const linePassed =
                        i < boardingIdx || (isCurrentlyRunning && i < currentStopIdx);

                      const customBullet = isCurrentPos ? (
                        <PentagonIcon lineColor={rColor} size={14} />
                      ) : undefined;

                      return (
                        <Timeline.Item
                          key={`${st.stopId}-${st.stopSequence}`}
                          bullet={customBullet}
                          lineVariant="solid"
                          style={
                            !linePassed
                              ? ({
                                  '--item-border-color': rColor,
                                } as React.CSSProperties)
                              : undefined
                          }
                          styles={
                            !passed
                              ? {
                                  itemBullet: {
                                    borderColor: rColor,
                                    backgroundColor: isBoarding
                                      ? rColor
                                      : 'var(--mantine-color-body)',
                                  },
                                }
                              : undefined
                          }
                        >
                          <Box
                            data-natoringo-stop-index={i}
                            py={4}
                            px={6}
                            style={{
                              borderRadius: 'var(--mantine-radius-sm)',
                              backgroundColor: isBoarding ? `${rColor}1F` : undefined,
                            }}
                          >
                            <Group justify="space-between" wrap="nowrap" gap="xs">
                              {/* 左側: バス停名 */}
                              <Group gap={6} wrap="nowrap" align="center" className="min-w-0" style={{ flex: 1 }}>
                                <Text
                                  fz="sm"
                                  fw={isBoarding || isLast ? 800 : passed ? 500 : 700}
                                  c={passed && !isBoarding ? 'dimmed' : undefined}
                                  className="truncate"
                                >
                                  {st.stopName}
                                </Text>
                              </Group>

                              {/* 右側: 運賃 ＋ 発着時刻 */}
                              <Group
                                gap={6}
                                wrap="nowrap"
                                align="center"
                                justify="flex-end"
                                style={{ flexShrink: 0 }}
                              >
                                {i > boardingIdx && st.fare !== null && (
                                  <Badge
                                    size="xs"
                                    radius="sm"
                                    variant="default"
                                    fw={700}
                                    tt="none"
                                    className="font-english tabular-nums shrink-0"
                                  >
                                    {st.fare}円
                                  </Badge>
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
        /* ========== 機能1：のりば別・ダイヤ別・路線絞り込み付き1日全時刻表一覧 ========== */
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
            {/* のりば切り替え（名取駅は西口・東口の SegmentedControl、他3駅はバス停名表示） */}
            {hasMultipleStops ? (
              <SegmentedControl
                size="xs"
                fullWidth
                radius="md"
                value={activeBusStop.stopId}
                onChange={handleStopChange}
                data={busStops.map((s) => ({
                  label: s.stopName,
                  value: s.stopId,
                }))}
              />
            ) : (
              <Group justify="space-between" align="center" px={2}>
                <Group gap={6} align="center">
                  <Badge size="xs" radius="sm" variant="default" fw={700} tt="none">
                    のりば
                  </Badge>
                  <Text fz="xs" fw={800}>
                    {activeBusStop.stopName}
                  </Text>
                </Group>
                <Text fz={11} c="dimmed" fw={600}>
                  {availableLines.map((l) => l.lineName).join('・')}
                </Text>
              </Group>
            )}

            {/* 平日ダイヤ / 土日祝ダイヤ 切り替え */}
            <SegmentedControl
              size="xs"
              fullWidth
              radius="md"
              value={dayType}
              onChange={(val) => setDayType(val as NatoringoDayType)}
              data={[
                {
                  label: `平日ダイヤ${!isTodayHoliday ? '（本日）' : ''}`,
                  value: 'weekday',
                },
                {
                  label: `土日祝ダイヤ${isTodayHoliday ? '（本日）' : ''}`,
                  value: 'holiday',
                },
              ]}
            />

            {/* 路線絞り込みフィルター（JR TimetableModal と完全統一のUI） */}
            {showLineFilter && (
              <Group gap={6} align="center" wrap="wrap" pt={2}>
                <Group gap={4} align="center" c="dimmed" mr={2}>
                  <Icon name="filter_alt" size={16} />
                </Group>
                {availableLines.map((line) => {
                  const isSelected = selectedLines.includes(line.lineName);
                  const color = line.routeColor;
                  return (
                    <Button
                      key={line.lineName}
                      size="xs"
                      radius="md"
                      variant={isSelected ? 'filled' : 'default'}
                      onClick={() => {
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
                    >
                      {line.lineName}
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
                  const isPast = dep.departureMinutes < currentMinutes;
                  const isNext = dep.id === nextDepartureId;
                  const dimmed = isPast && !isNext;

                  return (
                    <UnstyledButton
                      key={dep.id}
                      data-natoringo-dep-id={dep.id}
                      onClick={() => setSelectedDepartureId(dep.id)}
                      style={{
                        borderRadius: 'var(--mantine-radius-md)',
                        backgroundColor: isNext ? `${dep.routeColor}1F` : undefined,
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
                        {/* 左側: 発車時刻 | 系統カラーバッジ | 路線名・行先 */}
                        <Group gap={7} wrap="nowrap" className="min-w-0">
                          <Text
                            fz="sm"
                            fw={800}
                            w="3.1em"
                            ta="right"
                            style={isNext ? { color: dep.routeColor } : undefined}
                            className="font-english tabular-nums shrink-0"
                          >
                            {dep.departureTime}
                          </Text>

                          <BusRouteBadge
                            routeCode={dep.routeCode}
                            color={dep.routeColor}
                            size="sm"
                          />

                          <Stack gap={0} className="min-w-0">
                            <Group gap={5} wrap="nowrap" align="center">
                              <Text
                                fz="sm"
                                fw={isNext ? 800 : 600}
                                className="truncate"
                              >
                                {dep.headsign}行
                              </Text>
                            </Group>
                            <Text fz={10.5} c="dimmed" className="truncate">
                              {dep.lineName}
                            </Text>
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

export default NatoringoTimetableModal;
