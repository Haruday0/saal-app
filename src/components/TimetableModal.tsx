import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Modal,
  SegmentedControl,
  Button,
  ScrollArea,
  Badge,
  Group,
  Text,
  Stack,
  UnstyledButton,
  Box,
  Title,
  Timeline,
} from '@mantine/core';
import { DepartureTrain, LineType } from '../types';
import { isWeekendHolidayOrYearEnd } from '../utils/calendar';
import { LINE_COLORS, getLineColor, getMantineLineColor } from '../config/trainLineRules';
import {
  getScheduledTrainById,
  getCurrentRailwaySeconds,
  toRailwaySeconds,
  ScheduledFullStop,
} from '../utils/trainPosition';
import { Icon } from './Icon';
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

/** 駅名から（宮城県）（福島県）（鉄道）などの注記を除去して統一 */
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

/** 静止した五角形トレインアイコン（下向き進行方向三角ノーズ ＋ 四角形車体） */
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

  // モーダルオープン時または駅・方面切り替え時にフィルター＆選択中列車を初期化
  useEffect(() => {
    if (isOpen) {
      setSelectedDirection(isAirport ? 'down' : (initialDirection || 'up'));
      setSelectedLines([]);
      setSelectedTrainId(null);
    }
  }, [isOpen, stationId, initialDirection, isAirport]);

  const directionLabels = useMemo(() => getTimetableDirectionLabels(stationId), [stationId]);

  // 並走区間（仙台〜名取）かつ上り（または仙台駅）で路線絞り込みを表示
  const hasMultipleLines = ['sendai', 'nagamachi', 'taishido', 'minami-sendai', 'natori'].includes(stationId);
  const showLineFilter = hasMultipleLines && (isSendai || selectedDirection === 'up');

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
    const scheduledTrain = getScheduledTrainById(selectedTrainId);
    return {
      depTrain,
      scheduledTrain,
    };
  }, [selectedTrainId, filteredTrains, allTrains]);

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
    <Modal
      opened={isOpen}
      onClose={onClose}
      title="時刻表"
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
          paddingInline: 16,
          minHeight: 52,
        },
        title: { fontWeight: 900, fontSize: 16 },
        body: {
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
        },
      }}
    >
      {selectedTrainData?.scheduledTrain ? (
        /* ========== 機能2：全停車駅到着時刻タイムライン表示 ========== */
        (() => {
          const train = selectedTrainData.scheduledTrain;
          const depTrain = selectedTrainData.depTrain;
          const lineColor = getLineColor(train.line);
          const mantineColor = getMantineLineColor(train.line);
          const cleanDest = cleanStationName(train.destination);

          return (
            <>
              {/* 詳細ヘッダー（地下鉄モーダルと同一構造） */}
              <Stack
                gap={8}
                p="sm"
                style={{
                  flexShrink: 0,
                  borderBottom: '1px solid var(--mantine-color-default-border)',
                  backgroundColor: 'var(--mantine-color-default-hover)',
                }}
              >
                {/* 1行目: 戻るボタン ＆ バッジ */}
                <Group justify="space-between" align="center" wrap="nowrap">
                  <Button
                    size="compact-xs"
                    variant="default"
                    radius="md"
                    leftSection={<Icon name="arrow_back" size={14} />}
                    onClick={() => setSelectedTrainId(null)}
                    fw={700}
                  >
                    時刻表に戻る
                  </Button>
                  <Group gap={6} wrap="nowrap">
                    {train.calendar === 'weekday' && (
                      <Badge size="xs" radius="sm" color="gray" variant="light" tt="none">
                        土休日運休
                      </Badge>
                    )}
                    {(depTrain?.track || stopsToShow[boardingIndex]?.track) && (
                      <Badge size="xs" radius="sm" variant="default" fw={700} tt="none">
                        {depTrain?.track || stopsToShow[boardingIndex]?.track}番線
                      </Badge>
                    )}
                  </Group>
                </Group>

                {/* 2行目: 路線カラーバー ＋ 路線名・列車番号 ＋ 種別・行先・両数 ＋ 発着情報 */}
                <Group justify="space-between" align="center" wrap="nowrap" pt={2}>
                  <Group gap={8} align="center" wrap="nowrap">
                    <Box
                      w={4}
                      h={32}
                      style={{
                        backgroundColor: lineColor,
                        borderRadius: 2,
                        flexShrink: 0,
                      }}
                    />
                    <Stack gap={2}>
                      <Group gap={6} align="center" wrap="nowrap">
                        <Text fz="xs" fw={800} c="dimmed">
                          {train.lineName ?? '列車詳細'}
                        </Text>
                        <Text fz="xs" fw={700} c="dimmed">
                          {train.trainNumber}
                        </Text>
                      </Group>
                      <Group gap={6} align="center" wrap="nowrap">
                        <Badge size="sm" radius="sm" color={mantineColor} variant="filled" tt="none">
                          {train.trainType ?? '普通'}
                        </Badge>
                        <Title order={3} fz={17} fw={800} lh={1.2}>
                          {cleanDest}
                          <Text component="span" fz="xs" fw={700} ml={2} c="dimmed">
                            行
                          </Text>
                        </Title>
                        <Badge size="xs" radius="sm" variant="default" fw={700}>
                          {train.cars}両
                        </Badge>
                      </Group>
                    </Stack>
                  </Group>

                  <Stack gap={1} align="flex-end" style={{ flexShrink: 0 }}>
                    {depTrain?.departureTime && (
                      <Text fz={11} c="dimmed" fw={600} className="font-english tabular-nums">
                        当駅 {depTrain.departureTime}発
                      </Text>
                    )}
                    <Text fz="xs" fw={800} className="font-english tabular-nums">
                      {train.terminalStation || cleanDest} {formatStopTime(train.terminalArrivalTime || stopsToShow[stopsToShow.length - 1]?.arr)}着
                    </Text>
                  </Stack>
                </Group>
              </Stack>

              {/* タイムラインスクロール領域 */}
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
                      停車駅・時刻（全区間）
                    </Text>
                    <Text fz={10.5} c="dimmed" fw={600}>
                      {stopsToShow.length}駅
                    </Text>
                  </Group>

                  <Timeline
                    active={-1}
                    bulletSize={18}
                    lineWidth={2.5}
                    color={mantineColor}
                  >
                    {stopsToShow.map((s, i) => {
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

                      const linePassed =
                        trainStatus.kind === 'arrived'
                          ? true
                          : trainStatus.kind === 'before'
                          ? false
                          : i < trainStatus.index;

                      const customBullet = isStoppedHere ? (
                        <PentagonIcon lineColor={lineColor} size={14} />
                      ) : undefined;

                      return (
                        <Timeline.Item
                          key={`${s.stationName}-${i}`}
                          bullet={customBullet}
                          lineVariant="solid"
                          style={
                            !linePassed
                              ? ({ '--item-border-color': 'var(--tl-color)' } as React.CSSProperties)
                              : undefined
                          }
                          styles={
                            !passed
                              ? {
                                  itemBullet: {
                                    borderColor: 'var(--tl-color)',
                                    backgroundColor: isBoarding
                                      ? lineColor
                                      : 'var(--mantine-color-body)',
                                  },
                                }
                              : undefined
                          }
                        >
                          <Box
                            data-stop-index={i}
                            py={3}
                            px={6}
                            style={{
                              borderRadius: 'var(--mantine-radius-sm)',
                              backgroundColor: isBoarding
                                ? `var(--mantine-color-${mantineColor}-light)`
                                : undefined,
                            }}
                          >
                            <Group justify="space-between" wrap="nowrap" gap="xs">
                              {/* 左側: 駅名 */}
                              <Group gap={6} wrap="nowrap" align="center" className="min-w-0" style={{ flex: 1 }}>
                                <Text
                                  fz="sm"
                                  fw={isBoarding || isStoppedHere ? 800 : passed ? 500 : 700}
                                  c={passed && !isBoarding ? 'dimmed' : undefined}
                                  style={{ whiteSpace: 'nowrap' }}
                                >
                                  {cleanStationName(s.stationName)}
                                </Text>
                              </Group>

                              {/* 右側: 到着・出発時刻 ＆ 番線 */}
                              <Group gap={6} wrap="nowrap" align="center" justify="flex-end" style={{ flexShrink: 0 }}>
                                <Stack gap={1} align="flex-end" justify="center" style={{ minWidth: 54 }}>
                                  {isFirst ? (
                                    <Text
                                      fz="xs"
                                      fw={isStoppedHere || isBoarding ? 800 : 700}
                                      c={passed && !isBoarding ? 'dimmed' : undefined}
                                      className="tabular-nums font-english"
                                      style={{ whiteSpace: 'nowrap' }}
                                    >
                                      {formatStopTime(s.dep)} 発
                                    </Text>
                                  ) : isLast ? (
                                    <Text
                                      fz="xs"
                                      fw={isStoppedHere || isBoarding ? 800 : 700}
                                      c={passed && !isBoarding ? 'dimmed' : undefined}
                                      className="tabular-nums font-english"
                                      style={{ whiteSpace: 'nowrap' }}
                                    >
                                      {formatStopTime(s.arr)} 着
                                    </Text>
                                  ) : (
                                    <>
                                      <Text
                                        fz={11}
                                        fw={500}
                                        c="dimmed"
                                        className="tabular-nums font-english"
                                        lh={1.2}
                                        style={{ whiteSpace: 'nowrap' }}
                                      >
                                        {formatStopTime(s.arr)} 着
                                      </Text>
                                      <Text
                                        fz="xs"
                                        fw={isStoppedHere || isBoarding ? 800 : 700}
                                        c={passed && !isBoarding ? 'dimmed' : undefined}
                                        className="tabular-nums font-english"
                                        lh={1.2}
                                        style={{ whiteSpace: 'nowrap' }}
                                      >
                                        {formatStopTime(s.dep)} 発
                                      </Text>
                                    </>
                                  )}
                                </Stack>

                                {/* 番線 */}
                                <Box w={40} style={{ flexShrink: 0, textAlign: 'right' }}>
                                  {s.track ? (
                                    <Text fz="xs" c="dimmed" fw={600} style={{ whiteSpace: 'nowrap' }}>
                                      {s.track}番線
                                    </Text>
                                  ) : null}
                                </Box>
                              </Group>
                            </Group>
                          </Box>
                        </Timeline.Item>
                      );
                    })}
                  </Timeline>
                </Box>
              </ScrollArea>
            </>
          );
        })()
      ) : (
        /* ========== 機能1：時刻表一覧 ========== */
        <>
          {/* 絞り込みフィルターバー */}
          {(showDirectionFilter || showLineFilter) && (
            <Stack
              gap="xs"
              p="sm"
              style={{
                flexShrink: 0,
                borderBottom: '1px solid var(--mantine-color-default-border)',
                backgroundColor: 'var(--mantine-color-default-hover)',
              }}
            >
              {/* 上り / 下り 切り替え */}
              {showDirectionFilter && (
                <SegmentedControl
                  size="xs"
                  fullWidth
                  radius="md"
                  value={selectedDirection}
                  onChange={(value) => setSelectedDirection(value as 'up' | 'down')}
                  data={[
                    { label: directionLabels.up, value: 'up' },
                    { label: directionLabels.down, value: 'down' },
                  ]}
                />
              )}

              {/* 路線絞り込み（Mantine Button + 左側に Filter Alt アイコン） */}
              {showLineFilter && (
                <Group gap={6} align="center" wrap="wrap">
                  <Group gap={4} align="center" c="dimmed" mr={2}>
                    <Icon name="filter_alt" size={16} />
                  </Group>
                  {LINE_OPTIONS.map((opt) => {
                    const isSelected = selectedLines.includes(opt.value);
                    const color = LINE_COLORS[opt.value];
                    return (
                      <Button
                        key={opt.value}
                        size="xs"
                        radius="md"
                        variant={isSelected ? 'filled' : 'default'}
                        onClick={() => {
                          setSelectedLines((prev) =>
                            prev.includes(opt.value)
                              ? prev.filter((l) => l !== opt.value)
                              : [...prev, opt.value]
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
                        {opt.label}
                      </Button>
                    );
                  })}
                </Group>
              )}
            </Stack>
          )}

          {/* 時刻表スクロールリスト */}
          <ScrollArea
            viewportRef={listViewportRef}
            type="auto"
            data-scrollable="true"
            style={{ flex: 1, minHeight: 0 }}
            viewportProps={{ style: { overscrollBehavior: 'contain' } }}
          >
            {filteredTrains.length === 0 ? (
              <Text py="xl" ta="center" fz="xs" c="dimmed">
                該当する列車はありません
              </Text>
            ) : (
              <Stack gap={0} p={6} pb="xl">
                {filteredTrains.map((train) => {
                  const isPast = toRailwayMinutes(train.departureTime) < currentMinutes;
                  const isNext = train.id === nextTrainId;
                  const isWeekdayOnly = train.calendar === 'weekday';
                  const isSuspendedToday = isWeekdayOnly && isTodayHoliday;
                  const dimmed = isSuspendedToday || (isPast && !isNext);

                  return (
                    <UnstyledButton
                      key={train.id}
                      data-train-id={train.id}
                      onClick={() => {
                        setSelectedTrainId(train.trainNumber || train.id);
                      }}
                      style={{
                        borderRadius: 'var(--mantine-radius-md)',
                        opacity: isSuspendedToday ? 0.45 : dimmed ? 0.5 : 1,
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
                        {/* 左側: 発車時刻 | 行先 | 種別 | 運休バッジ */}
                        <Group gap={8} wrap="nowrap" className="min-w-0">
                          <Text
                            fz="sm"
                            fw={800}
                            w="3.2em"
                            ta="right"
                            className="font-english tabular-nums shrink-0"
                          >
                            {train.departureTime}
                          </Text>
                          <Text fz="sm" fw={isNext ? 800 : 500} className="shrink-0">
                            {train.destination}
                          </Text>
                          {train.trainType !== '普通' && (
                            <Badge size="xs" color="red" variant="light" radius="sm">
                              {train.trainType}
                            </Badge>
                          )}
                          {isWeekdayOnly && (
                            <Badge
                              size="xs"
                              color={isSuspendedToday ? 'red' : 'yellow'}
                              variant={isSuspendedToday ? 'filled' : 'light'}
                              radius="sm"
                              className="shrink-0"
                            >
                              {isSuspendedToday ? '本日運休' : '土休日運休'}
                            </Badge>
                          )}
                        </Group>

                        {/* 右側: 列車番号・番線・両数・詳細シェブロン */}
                        <Group gap={6} wrap="nowrap" className="shrink-0 font-english tabular-nums" align="center">
                          <Text fz={10} c="dimmed" w={44} ta="right">
                            {train.trainNumber}
                          </Text>
                          <Text fz="xs" c="dimmed" w={40} ta="right">
                            {train.track}番線
                          </Text>
                          <Text fz="xs" fw={700} w={32} ta="right">
                            {train.cars}両
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

export default TimetableModal;
