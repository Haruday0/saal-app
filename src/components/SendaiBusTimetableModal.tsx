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
import { BusDepartureRow, formatHeadsign } from './BusDepartureRow';

interface SendaiBusTimetableModalProps {
  isOpen: boolean;
  onClose: () => void;
  stationSchedule: SendaiBusStationSchedule | null;
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

  // モーダルが開いたときに初期状態を同期
  useEffect(() => {
    if (isOpen) {
      setDayType(getSendaiBusDayType(now));
      setSelectedFilterKey(initialFilterKey || null);
      setSelectedDepartureId(initialDepartureId || null);
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
    dayType,
    selectedFilterKey,
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

  if (!stationSchedule) return null;

  const availableFilterOptions = stationSchedule.filterOptions || [];
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

              <Stack gap={1} align="flex-end" style={{ flexShrink: 0 }}>
                <Text
                  fz={11}
                  c="dimmed"
                  fw={600}
                  className="font-english tabular-nums"
                >
                  {selectedDeparture.platform
                    ? `${selectedDeparture.platform} `
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
                                      backgroundColor: selectedDeparture.routeColor,
                                      color: selectedDeparture.routeTextColor,
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
                                      borderColor: selectedDeparture.routeColor,
                                      color: selectedDeparture.routeColor,
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
                    すべてのりば
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
          >
            {filteredDepartures.length === 0 ? (
              <Text py="xl" ta="center" fz="xs" c="dimmed">
                該当するバスはありません
              </Text>
            ) : (
              <Stack gap={0} pb="xl">
                {filteredDepartures.map((dep, dIdx) => {
                  const effectiveSec = isTodayCal
                    ? dep.scheduledSec + dep.delaySec
                    : dep.scheduledSec;
                  const isPast = effectiveSec < currentMinuteFloorSec;
                  const isNext = dep.id === nextDepartureId;

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
                        isDelayed={isTodayCal && dep.isDelayed}
                        delayMinutes={dep.delayMinutes}
                        expectedTime={dep.expectedTime}
                        isNext={isNext}
                        isPast={isPast && !isNext}
                        onClick={() => setSelectedDepartureId(dep.id)}
                        isLast={dIdx === filteredDepartures.length - 1}
                      />
                    </div>
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
