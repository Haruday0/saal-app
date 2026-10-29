import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import {
  Group,
  Stack,
  Text,
  Title,
  Badge,
  Box,
  Paper,
  Timeline,
  UnstyledButton,
  SimpleGrid,
  CloseButton,
} from '@mantine/core';
import { Station } from '../types';
import { STATIONS } from '../data/mockData';
import { getLineColor, getMantineLineColor } from '../config/trainLineRules';
import {
  getScheduledTrainById,
  getCurrentRailwaySeconds,
  toRailwaySeconds,
  ScheduledTrain,
} from '../utils/trainPosition';

interface TrainDetailSheetProps {
  trainId: string | null;
  onClose: () => void;
  onSelectStation: (station: Station) => void;
}

type TrainStatus =
  | { kind: 'before' }
  | { kind: 'stopped'; index: number }
  | { kind: 'running'; index: number }
  | { kind: 'arrived' };

/** 現在時刻から列車の運行状況（発車前 / 停車中 / 駅間走行中 / 到着済）を判定 */
function getTrainStatus(train: ScheduledTrain, nowSec: number): TrainStatus {
  const stops = train.stops;
  if (!stops || stops.length === 0) return { kind: 'before' };

  // 始発発車時刻がある場合はその時刻を発車前判定の基準にする
  const originDepSec = train.originDepartureTime
    ? toRailwaySeconds(train.originDepartureTime)
    : toRailwaySeconds(stops[0].dep);

  if (nowSec < originDepSec) return { kind: 'before' };

  for (let i = 0; i < stops.length; i++) {
    const arr = toRailwaySeconds(stops[i].arr);
    const dep = toRailwaySeconds(stops[i].dep);
    if (nowSec >= arr && nowSec <= dep) return { kind: 'stopped', index: i };
    if (i < stops.length - 1 && nowSec > dep && nowSec < toRailwaySeconds(stops[i + 1].arr)) {
      return { kind: 'running', index: i };
    }
  }

  // 最後の駅の到着時刻を過ぎている場合
  const lastArr = toRailwaySeconds(stops[stops.length - 1].arr);
  if (nowSec > lastArr) {
    return { kind: 'arrived' };
  }

  // 区間内最初の駅の到着前（直通運転中）
  return { kind: 'running', index: -1 };
}

export const TrainDetailSheet: React.FC<TrainDetailSheetProps> = ({
  trainId,
  onClose,
  onSelectStation,
}) => {
  const [activeTrain, setActiveTrain] = useState<ScheduledTrain | null>(null);

  // 閉じるフラグと DOM ref（StationDetailSheet と完全同一のGPU高速アニメーション）
  const isClosingRef = useRef(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 開いている間は現在位置を10秒ごとに更新
  const [nowSec, setNowSec] = useState(() => getCurrentRailwaySeconds());
  useEffect(() => {
    if (!trainId) return;
    setNowSec(getCurrentRailwaySeconds());
    const timer = setInterval(() => setNowSec(getCurrentRailwaySeconds()), 10000);
    return () => clearInterval(timer);
  }, [trainId]);

  // コンポーネント破棄時にタイマーをクリーンアップ
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
    };
  }, []);

  // 列車IDが切り替わったときの初期化処理（StationDetailSheet と完全同期）
  useEffect(() => {
    if (trainId) {
      const t = getScheduledTrainById(trainId);
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      isClosingRef.current = false;
      setActiveTrain(t);
      if (sheetRef.current) {
        sheetRef.current.classList.add('m3-sheet-enter');
        sheetRef.current.style.removeProperty('transform');
        sheetRef.current.style.removeProperty('transition');
        sheetRef.current.style.removeProperty('animation');
      }
      if (scrimRef.current) {
        scrimRef.current.classList.add('m3-scrim-enter');
        scrimRef.current.style.removeProperty('opacity');
        scrimRef.current.style.removeProperty('transition');
        scrimRef.current.style.removeProperty('animation');
      }
    } else {
      isClosingRef.current = false;
      setActiveTrain(null);
    }
  }, [trainId]);

  // Material 3 準拠のスムーズな閉じる処理（ボタンタップ・背景タップ・スワイプ共通）
  const handleClose = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    const sheet = sheetRef.current;
    const scrim = scrimRef.current;

    if (sheet) {
      sheet.style.animation = 'none';
      sheet.classList.remove('m3-sheet-enter');
      sheet.style.setProperty('transition', 'transform 260ms cubic-bezier(0.3, 0.0, 0.8, 0.15)', 'important');
      sheet.style.setProperty('transform', 'translate3d(0, 100%, 0)', 'important');
    }
    if (scrim) {
      scrim.style.animation = 'none';
      scrim.classList.remove('m3-scrim-enter');
      scrim.style.setProperty('transition', 'opacity 240ms cubic-bezier(0.3, 0.0, 0.8, 0.15)', 'important');
      scrim.style.setProperty('opacity', '0', 'important');
    }

    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      if (sheet) {
        sheet.removeEventListener('transitionend', onTransitionEnd);
      }
      onClose();
      setActiveTrain(null);
      isClosingRef.current = false;
    };

    const onTransitionEnd = (e: TransitionEvent) => {
      if (e.target === sheet && e.propertyName === 'transform') {
        cleanup();
      }
    };

    if (sheet) {
      sheet.addEventListener('transitionend', onTransitionEnd);
    }

    closeTimeoutRef.current = setTimeout(() => {
      cleanup();
    }, 280);
  }, [onClose]);

  const dismissWithSwipe = handleClose;

  // ポインター・タッチ連動による「指に吸い付く」自由ドラッグ・スワイプ連動処理
  useEffect(() => {
    const header = headerRef.current;
    const content = contentRef.current;
    const sheet = sheetRef.current;
    if (!sheet || !activeTrain) return;

    let isTouching = false;
    let startY = 0;
    let lastY = 0;
    let lastTime = 0;
    let currentDeltaY = 0;
    let velocity = 0;

    const getVisibleSheetHeight = () => {
      const totalH = sheet.offsetHeight || window.innerHeight * 0.75;
      return Math.max(300, totalH - 180);
    };

    const checkShouldDismiss = (delta: number, vel: number) => {
      const visibleH = getVisibleSheetHeight();
      const distanceThreshold = visibleH * 0.18;
      const flickThreshold = Math.max(25, visibleH * 0.05);
      return delta > distanceThreshold || (delta > flickThreshold && vel > 0.3);
    };

    // ヘッダーでの操作（Pointer Events）
    const onPointerDown = (e: PointerEvent) => {
      if (isClosingRef.current) return;
      if ((e.target as HTMLElement).closest('button')) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;

      try {
        header?.setPointerCapture(e.pointerId);
      } catch (_) {}

      isTouching = true;
      startY = e.clientY;
      lastY = startY;
      lastTime = Date.now();
      currentDeltaY = 0;
      velocity = 0;

      sheet.style.animation = 'none';
      sheet.classList.remove('m3-sheet-enter');
      sheet.style.setProperty('transition', 'none', 'important');
      if (scrimRef.current) scrimRef.current.style.setProperty('transition', 'none', 'important');
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isTouching || isClosingRef.current) return;
      const clientY = e.clientY;
      const delta = clientY - startY;

      if (delta > 0) {
        currentDeltaY = delta;
        sheet.style.setProperty('transform', `translate3d(0, ${delta}px, 0)`, 'important');
        if (scrimRef.current) {
          const visibleH = getVisibleSheetHeight();
          const fade = Math.max(0, 1 - delta / (visibleH * 0.6));
          scrimRef.current.style.setProperty('opacity', String(fade), 'important');
        }
      } else {
        const damp = Math.max(-100, delta * 0.18);
        currentDeltaY = damp;
        sheet.style.setProperty('transform', `translate3d(0, ${damp}px, 0)`, 'important');
      }

      const now = Date.now();
      const dt = now - lastTime;
      if (dt > 10) {
        velocity = (clientY - lastY) / dt;
        lastY = clientY;
        lastTime = now;
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isTouching) return;
      isTouching = false;
      try {
        header?.releasePointerCapture(e.pointerId);
      } catch (_) {}

      const delta = currentDeltaY;
      if (checkShouldDismiss(delta, velocity)) {
        dismissWithSwipe();
      } else {
        sheet.style.setProperty('transition', 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1)', 'important');
        sheet.style.setProperty('transform', 'translate3d(0, 0, 0)', 'important');
        if (scrimRef.current) {
          scrimRef.current.style.setProperty('transition', 'opacity 260ms cubic-bezier(0.16, 1, 0.3, 1)', 'important');
          scrimRef.current.style.removeProperty('opacity');
        }
        currentDeltaY = 0;
      }
    };

    // ヘッダーでの操作（Touch Events）
    const onHeaderTouchStart = (e: TouchEvent) => {
      if (isClosingRef.current || e.touches.length !== 1) return;
      if ((e.target as HTMLElement).closest('button')) return;
      isTouching = true;
      startY = e.touches[0].clientY;
      lastY = startY;
      lastTime = Date.now();
      currentDeltaY = 0;
      velocity = 0;

      sheet.style.animation = 'none';
      sheet.classList.remove('m3-sheet-enter');
      sheet.style.setProperty('transition', 'none', 'important');
      if (scrimRef.current) scrimRef.current.style.setProperty('transition', 'none', 'important');
    };

    const onHeaderTouchMove = (e: TouchEvent) => {
      if (!isTouching || isClosingRef.current || e.touches.length !== 1) return;
      e.preventDefault();
      const clientY = e.touches[0].clientY;
      const delta = clientY - startY;

      if (delta > 0) {
        currentDeltaY = delta;
        sheet.style.setProperty('transform', `translate3d(0, ${delta}px, 0)`, 'important');
        if (scrimRef.current) {
          const visibleH = getVisibleSheetHeight();
          const fade = Math.max(0, 1 - delta / (visibleH * 0.6));
          scrimRef.current.style.setProperty('opacity', String(fade), 'important');
        }
      } else {
        const damp = Math.max(-100, delta * 0.18);
        currentDeltaY = damp;
        sheet.style.setProperty('transform', `translate3d(0, ${damp}px, 0)`, 'important');
      }

      const now = Date.now();
      const dt = now - lastTime;
      if (dt > 10) {
        velocity = (clientY - lastY) / dt;
        lastY = clientY;
        lastTime = now;
      }
    };

    const onHeaderTouchEnd = () => {
      if (!isTouching) return;
      isTouching = false;
      const delta = currentDeltaY;
      if (checkShouldDismiss(delta, velocity)) {
        dismissWithSwipe();
      } else {
        sheet.style.setProperty('transition', 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1)', 'important');
        sheet.style.setProperty('transform', 'translate3d(0, 0, 0)', 'important');
        if (scrimRef.current) {
          scrimRef.current.style.setProperty('transition', 'opacity 260ms cubic-bezier(0.16, 1, 0.3, 1)', 'important');
          scrimRef.current.style.removeProperty('opacity');
        }
        currentDeltaY = 0;
      }
    };

    // コンテンツ領域でのプルダウン連動
    let isContentPulling = false;
    let contentStartY = 0;

    const onContentTouchStart = (e: TouchEvent) => {
      if (isClosingRef.current || e.touches.length !== 1) return;
      contentStartY = e.touches[0].clientY;
      lastY = contentStartY;
      lastTime = Date.now();
      isContentPulling = false;
    };

    const onContentTouchMove = (e: TouchEvent) => {
      if (isClosingRef.current || e.touches.length !== 1) return;
      const clientY = e.touches[0].clientY;
      const scrollTop = content?.scrollTop ?? 0;

      if (isContentPulling) {
        const pullDelta = clientY - contentStartY;
        if (pullDelta > 0) {
          e.preventDefault();
          currentDeltaY = pullDelta;
          sheet.style.setProperty('transform', `translate3d(0, ${pullDelta}px, 0)`, 'important');
          if (scrimRef.current) {
            const visibleH = getVisibleSheetHeight();
            const fade = Math.max(0, 1 - pullDelta / (visibleH * 0.6));
            scrimRef.current.style.setProperty('opacity', String(fade), 'important');
          }
        } else {
          currentDeltaY = 0;
          sheet.style.setProperty('transform', 'translate3d(0, 0, 0)', 'important');
          if (scrimRef.current) scrimRef.current.style.removeProperty('opacity');
          if (pullDelta < -10) isContentPulling = false;
        }
      } else {
        if (scrollTop <= 0 && clientY > contentStartY + 5) {
          isContentPulling = true;
          contentStartY = clientY;
          currentDeltaY = 0;
          sheet.style.animation = 'none';
          sheet.classList.remove('m3-sheet-enter');
          sheet.style.setProperty('transition', 'none', 'important');
          if (scrimRef.current) scrimRef.current.style.setProperty('transition', 'none', 'important');
          e.preventDefault();
        } else if (scrollTop > 0) {
          contentStartY = clientY;
        }
      }

      const now = Date.now();
      const dt = now - lastTime;
      if (dt > 10) {
        velocity = (clientY - lastY) / dt;
        lastY = clientY;
        lastTime = now;
      }
    };

    const onContentTouchEnd = () => {
      if (!isContentPulling) return;
      isContentPulling = false;
      const delta = currentDeltaY;
      if (checkShouldDismiss(delta, velocity)) {
        dismissWithSwipe();
      } else {
        sheet.style.setProperty('transition', 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1)', 'important');
        sheet.style.setProperty('transform', 'translate3d(0, 0, 0)', 'important');
        if (scrimRef.current) {
          scrimRef.current.style.setProperty('transition', 'opacity 260ms cubic-bezier(0.16, 1, 0.3, 1)', 'important');
          scrimRef.current.style.removeProperty('opacity');
        }
        currentDeltaY = 0;
      }
    };

    const supportsPointerEvents = typeof window !== 'undefined' && 'PointerEvent' in window;

    if (header) {
      if (supportsPointerEvents) {
        header.addEventListener('pointerdown', onPointerDown);
        header.addEventListener('pointermove', onPointerMove);
        header.addEventListener('pointerup', onPointerUp);
        header.addEventListener('pointercancel', onPointerUp);
      } else {
        header.addEventListener('touchstart', onHeaderTouchStart, { passive: true });
        header.addEventListener('touchmove', onHeaderTouchMove, { passive: false });
        header.addEventListener('touchend', onHeaderTouchEnd, { passive: true });
        header.addEventListener('touchcancel', onHeaderTouchEnd, { passive: true });
      }
    }

    if (content) {
      content.addEventListener('touchstart', onContentTouchStart, { passive: true });
      content.addEventListener('touchmove', onContentTouchMove, { passive: false });
      content.addEventListener('touchend', onContentTouchEnd, { passive: true });
      content.addEventListener('touchcancel', onContentTouchEnd, { passive: true });
    }

    return () => {
      if (header) {
        if (supportsPointerEvents) {
          header.removeEventListener('pointerdown', onPointerDown);
          header.removeEventListener('pointermove', onPointerMove);
          header.removeEventListener('pointerup', onPointerUp);
          header.removeEventListener('pointercancel', onPointerUp);
        } else {
          header.removeEventListener('touchstart', onHeaderTouchStart);
          header.removeEventListener('touchmove', onHeaderTouchMove);
          header.removeEventListener('touchend', onHeaderTouchEnd);
          header.removeEventListener('touchcancel', onHeaderTouchEnd);
        }
      }
      if (content) {
        content.removeEventListener('touchstart', onContentTouchStart);
        content.removeEventListener('touchmove', onContentTouchMove);
        content.removeEventListener('touchend', onContentTouchEnd);
        content.removeEventListener('touchcancel', onContentTouchEnd);
      }
    };
  }, [activeTrain, handleClose]);

  const status = useMemo(
    () => (activeTrain ? getTrainStatus(activeTrain, nowSec) : ({ kind: 'before' } as TrainStatus)),
    [activeTrain, nowSec]
  );

  const handleStopClick = (stationId: string) => {
    const st = STATIONS.find((s) => s.id === stationId);
    if (st) {
      handleClose();
      onSelectStation(st);
    }
  };

  if (!activeTrain) return null;

  const train = activeTrain;
  const lineColor = getLineColor(train.line);
  const mantineColor = getMantineLineColor(train.line);

  const originStation = train.originStation || train.stops[0]?.stationName || '';
  const originDepTime = train.originDepartureTime || train.stops[0]?.dep || '';
  const lastStop = train.stops[train.stops.length - 1];

  // Timeline の到達済みインデックス
  const activeIndex =
    status.kind === 'before'
      ? -1
      : status.kind === 'arrived'
      ? train.stops.length - 1
      : status.index;

  const statusText = (() => {
    switch (status.kind) {
      case 'before':
        return `${originStation} ${originDepTime} 発車予定`;
      case 'stopped':
        return `${train.stops[status.index].stationName}駅に停車中`;
      case 'running':
        if (status.index === -1) {
          return `${originStation} → ${train.stops[0].stationName} 間（直通区間）を走行中`;
        }
        return `${train.stops[status.index].stationName} → ${train.stops[status.index + 1].stationName} 間を走行中`;
      case 'arrived':
        return `${lastStop?.stationName || train.destination}に到着済み`;
    }
  })();

  // 下り列車等で始発駅が名取より手前（直通運転）の場合
  const isThroughService =
    train.stops.length > 0 &&
    originStation &&
    originStation !== train.stops[0].stationName;

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end pt-[calc(env(safe-area-inset-top,0px)+3.5rem)] overflow-hidden">
      {/* 背景スクリム */}
      <div
        ref={scrimRef}
        onAnimationEnd={(e) => {
          if (e.animationName === 'm3ScrimEnter' && scrimRef.current) {
            scrimRef.current.classList.remove('m3-scrim-enter');
          }
        }}
        className="fixed inset-0 bg-slate-900/15 dark:bg-black/40 m3-scrim m3-scrim-enter"
        onClick={handleClose}
      />

      {/* ボトムシート（StationDetailSheet 準拠のガラスサーフェス仕様） */}
      <div
        ref={sheetRef}
        onAnimationEnd={(e) => {
          if (e.animationName === 'm3SheetEnter' && sheetRef.current) {
            sheetRef.current.classList.remove('m3-sheet-enter');
          }
        }}
        className="relative z-50 w-full max-w-md mx-auto glass-surface-strong rounded-t-3xl shadow-glass-lg flex flex-col h-[calc(78vh+180px)] h-[calc(100dvh-5.5rem+180px)] -mb-[180px] border-t border-white/80 dark:border-slate-700/80 m3-bottom-sheet m3-sheet-enter"
      >
        {/* シートヘッダー（ドラッグ／下スワイプで閉じられる領域） */}
        <div
          ref={headerRef}
          className="pt-2.5 pb-3 px-4 bg-transparent rounded-t-3xl border-b border-[var(--mantine-color-default-border)] shrink-0 touch-none select-none cursor-grab active:cursor-grabbing"
        >
          {/* ドラッグハンドルバー */}
          <div
            className="w-12 h-1.5 rounded-full mx-auto mb-2.5 pointer-events-none"
            style={{ backgroundColor: 'var(--mantine-color-default-border)' }}
          />

          <Group justify="space-between" wrap="nowrap">
            <Group gap={8} align="center" wrap="nowrap" className="pointer-events-none">
              <Box w={4} h={18} style={{ backgroundColor: lineColor, borderRadius: 2 }} />
              <Title order={2} fz={18} fw={800} className="tracking-tight">
                {train.lineName ?? '列車詳細'}
              </Title>
              <Text fz="xs" c="dimmed" fw={700}>
                {train.trainNumber}
              </Text>
            </Group>

            <CloseButton
              size="lg"
              radius="xl"
              variant="default"
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              aria-label="閉じる"
              className="pointer-events-auto"
            />
          </Group>
        </div>

        {/* コンテンツ領域 */}
        <div ref={contentRef} className="p-4 overflow-y-auto space-y-4 overscroll-contain">
          <Stack gap="md">
            {/* 種別・行先 */}
            <Group gap={8} align="center" wrap="nowrap">
              <Badge size="lg" radius="sm" color={mantineColor} variant="filled" tt="none">
                {train.trainType ?? '普通'}
              </Badge>
              <Title order={3} fw={800} style={{ whiteSpace: 'nowrap' }}>
                {train.destination}
                <Text component="span" fz="md" fw={700} ml={4}>
                  行
                </Text>
              </Title>
              {train.calendar === 'weekday' && (
                <Badge size="sm" radius="sm" color="gray" variant="light" tt="none" ml="auto">
                  土休日運休
                </Badge>
              )}
            </Group>

            {/* 現在の運行状況 */}
            <Paper
              withBorder
              radius="md"
              px="sm"
              py={10}
              style={{
                borderColor: lineColor,
                backgroundColor: 'var(--mantine-color-body)',
              }}
            >
              <Group gap={8} wrap="nowrap" align="center">
                <Box
                  w={8}
                  h={8}
                  style={{
                    backgroundColor: lineColor,
                    borderRadius: '50%',
                    flexShrink: 0,
                  }}
                />
                <Text fz="sm" fw={700}>
                  {statusText}
                </Text>
              </Group>
            </Paper>

            {/* 基本情報 */}
            <SimpleGrid cols={3} spacing="xs">
              <InfoCell label="列車番号" value={train.trainNumber} />
              <InfoCell label="両数" value={`${train.cars}両`} />
              <InfoCell
                label="始発駅"
                value={originStation ? `${originStation} ${originDepTime}` : '-'}
              />
            </SimpleGrid>

            {/* 停車駅時刻表 */}
            <Box>
              <Group justify="space-between" align="baseline" mb={8} wrap="nowrap">
                <Text fz="xs" fw={700} c="dimmed">
                  当アプリ区間の停車駅・時刻
                </Text>
                {isThroughService && (
                  <Text fz={10.5} c="dimmed" fw={600}>
                    ※{originStation}始発（直通運転）
                  </Text>
                )}
              </Group>

              <Timeline active={activeIndex} bulletSize={14} lineWidth={3} color={mantineColor}>
                {train.stops.map((s, i) => {
                  const isFirst = i === 0;
                  const isLast = i === train.stops.length - 1;
                  const isCurrent = status.kind === 'stopped' && status.index === i;
                  const passed = i <= activeIndex && !isCurrent;
                  const sameTime = s.arr === s.dep;
                  return (
                    <Timeline.Item
                      key={`${s.stationId}-${i}`}
                      lineVariant={status.kind === 'running' && status.index === i ? 'dashed' : 'solid'}
                    >
                      <UnstyledButton onClick={() => handleStopClick(s.stationId)} w="100%">
                        <Group justify="space-between" wrap="nowrap" gap="xs">
                          <Group gap={6} wrap="nowrap">
                            <Text fz="sm" fw={isCurrent ? 800 : 700} c={passed ? 'dimmed' : undefined}>
                              {s.stationName}
                            </Text>
                            {isCurrent && (
                              <Badge size="xs" radius="sm" color={mantineColor} variant="light" tt="none">
                                停車中
                              </Badge>
                            )}
                          </Group>
                          <Group gap={8} wrap="nowrap">
                            <Text fz="sm" fw={600} c={passed ? 'dimmed' : undefined} className="tabular-nums">
                              {isFirst && !isThroughService
                                ? `${s.dep} 発`
                                : isLast
                                ? `${s.arr} 着`
                                : sameTime
                                ? `${s.dep} 発`
                                : `${s.arr} 着 / ${s.dep} 発`}
                            </Text>
                            {s.track && (
                              <Text fz="xs" c="dimmed" w={32} ta="right" style={{ whiteSpace: 'nowrap' }}>
                                {s.track}番線
                              </Text>
                            )}
                          </Group>
                        </Group>
                      </UnstyledButton>
                    </Timeline.Item>
                  );
                })}
              </Timeline>
            </Box>
          </Stack>

          {/* 最下部スクロール時の余白 */}
          <div className="h-48 pb-safe bg-transparent" />
        </div>
      </div>
    </div>
  );
};

const InfoCell: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <Paper withBorder radius="md" px={8} py={6} style={{ backgroundColor: 'var(--mantine-color-body)' }}>
    <Text fz={10} c="dimmed" fw={700}>
      {label}
    </Text>
    <Text fz="sm" fw={800} style={{ whiteSpace: 'nowrap' }}>
      {value}
    </Text>
  </Paper>
);

export default TrainDetailSheet;
