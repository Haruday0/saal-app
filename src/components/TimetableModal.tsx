import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Modal, SegmentedControl, Chip, ScrollArea, Badge, Group, Text, Stack } from '@mantine/core';
import { DepartureTrain, LineType } from '../types';
import { isWeekendHolidayOrYearEnd } from '../utils/calendar';
import { LINE_COLORS } from '../config/trainLineRules';

interface TimetableModalProps {
  isOpen: boolean;
  onClose: () => void;
  stationId: string;
  allTrains: DepartureTrain[];
  now: Date;
}

/** 鉄道時刻分計算 (4:00〜翌3:59、深夜0〜3時は24〜27時) */
function toRailwayMinutes(t: string): number {
  const parts = t.split(':');
  let h = parseInt(parts[0] || '0', 10);
  const m = parseInt(parts[1] || '0', 10);
  if (h < 4) h += 24;
  return h * 60 + m;
}

export const TimetableModal: React.FC<TimetableModalProps> = ({
  isOpen,
  onClose,
  stationId,
  allTrains,
  now,
}) => {
  const isSendai = stationId === 'sendai';
  const isAirport = stationId === 'sendai-airport';
  // 仙台駅（全便上り）と仙台空港駅（全便下り）は方面切り替え不要
  const showDirectionFilter = !isSendai && !isAirport;

  // 1. 方面フィルター: 「上り」と「下り」の2択
  const [selectedDirection, setSelectedDirection] = useState<'up' | 'down'>('up');

  // 2. 路線フィルター: 複数選択（マルチセレクト）。初期状態は未選択（＝全路線表示）
  const [selectedLines, setSelectedLines] = useState<LineType[]>([]);

  // モーダルオープン時または駅・方面切り替え時にフィルターを初期化（未選択＝全路線表示）
  useEffect(() => {
    if (isOpen) {
      setSelectedLines([]);
    }
  }, [isOpen, stationId, selectedDirection]);

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

  // ★ 現在時刻以降で、かつ「本日運行されている」最初の列車（次に発車する列車）を特定
  const nextTrainId = useMemo(() => {
    for (const t of filteredTrains) {
      const isSuspended = t.calendar === 'weekday' && isTodayHoliday;
      if (!isSuspended && toRailwayMinutes(t.departureTime) >= currentMinutes) {
        return t.id;
      }
    }
    return null;
  }, [filteredTrains, currentMinutes, isTodayHoliday]);

  const viewportRef = useRef<HTMLDivElement>(null);

  // モーダルオープン時またはフィルター切り替え時に、現在時刻の列車（nextTrainId）へスクロール
  useEffect(() => {
    if (!isOpen) return;

    const scrollToCurrentTrain = () => {
      const viewport = viewportRef.current;
      if (!viewport) return;

      if (!nextTrainId) {
        viewport.scrollTop = 0;
        return;
      }

      const targetEl = viewport.querySelector<HTMLElement>(`[data-train-id="${nextTrainId}"]`);
      if (targetEl) {
        // 1〜2本前の過去電車が上に見えるよう、targetEl.offsetTop - 85 に即時スクロール
        const viewportRect = viewport.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();
        const targetTop = targetRect.top - viewportRect.top + viewport.scrollTop;
        const scrollPosition = targetTop - 85;
        viewport.scrollTop = Math.max(0, scrollPosition);
      }
    };

    // 初期表示タイミングに合わせて rAF および setTimeout(30ms) で即時実行
    const rafId = requestAnimationFrame(() => {
      scrollToCurrentTrain();
    });
    const timerId = setTimeout(() => {
      scrollToCurrentTrain();
    }, 30);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
    };
  }, [isOpen, nextTrainId, selectedDirection, selectedLines]);

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
        // 高さを固定することで内部 ScrollArea の高さが確定し、確実にスクロールできる
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
                { label: '上り（空港・白石方面）', value: 'up' },
                { label: '下り（仙台方面）', value: 'down' },
              ]}
            />
          )}

          {/* 路線絞り込み（複数選択 Chip） */}
          {showLineFilter && (
            <Chip.Group
              multiple
              value={selectedLines}
              onChange={(value) => setSelectedLines(value as LineType[])}
            >
              <Group gap={6} wrap="wrap">
                {LINE_OPTIONS.map((opt) => (
                  <Chip key={opt.value} value={opt.value} size="xs" radius="md" color={LINE_COLORS[opt.value]}>
                    {opt.label}
                  </Chip>
                ))}
              </Group>
            </Chip.Group>
          )}
        </Stack>
      )}

      {/* 時刻表スクロールリスト */}
      <ScrollArea
        viewportRef={viewportRef}
        type="auto"
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
                <Group
                  key={train.id}
                  data-train-id={train.id}
                  justify="space-between"
                  wrap="nowrap"
                  gap={6}
                  px={8}
                  py={8}
                  style={{
                    borderRadius: 'var(--mantine-radius-md)',
                    backgroundColor: isNext ? 'var(--mantine-color-saal-light)' : undefined,
                    opacity: isSuspendedToday ? 0.45 : dimmed ? 0.5 : 1,
                  }}
                >
                  {/* 左側: 発車時刻 | 行先 | 種別 | 運休バッジ */}
                  <Group gap={8} wrap="nowrap" className="min-w-0">
                    <Text
                      fz="sm"
                      fw={800}
                      w="3.2em"
                      ta="right"
                      c={isNext ? 'saal' : undefined}
                      className="font-english tabular-nums shrink-0"
                    >
                      {train.departureTime}
                    </Text>
                    <Text fz="sm" fw={isNext ? 800 : 500} c={isNext ? 'saal' : undefined} className="shrink-0">
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

                  {/* 右側: 列車番号・番線・両数（固定幅で桁ずれ防止） */}
                  <Group gap={6} wrap="nowrap" className="shrink-0 font-english tabular-nums">
                    <Text fz={10} c="dimmed" w={44} ta="right">
                      {train.trainNumber}
                    </Text>
                    <Text fz="xs" c="dimmed" w={40} ta="right">
                      {train.track}番線
                    </Text>
                    <Text fz="xs" fw={700} w={32} ta="right">
                      {train.cars}両
                    </Text>
                  </Group>
                </Group>
              );
            })}
          </Stack>
        )}
      </ScrollArea>
    </Modal>
  );
};
