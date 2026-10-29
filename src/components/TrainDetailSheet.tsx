import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import {
  Group,
  Stack,
  Text,
  Title,
  Badge,
  Box,
  Timeline,
  UnstyledButton,
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
  ScheduledFullStop,
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

/** 全停車駅（allStops または stops）に基づき現在時刻の運行状況を判定 */
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

  // 10秒ごとに現在時刻を更新
  const [nowSec, setNowSec] = useState(() => getCurrentRailwaySeconds());
  useEffect(() => {
    if (!trainId) return;
    setNowSec(getCurrentRailwaySeconds());
    const timer = setInterval(() => setNowSec(getCurrentRailwaySeconds()), 10000);
    return () => clearInterval(timer);
  }, [trainId]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
    };
  }, []);

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

  // Material 3 準拠のスムーズな閉じる処理
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

  // ポインター・タッチ連動
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

  // 停車駅リスト: 始発〜終着の全駅（allStops）を使用
  const stopsToShow = useMemo(() => {
    if (!activeTrain) return [];
    if (activeTrain.allStops && activeTrain.allStops.length > 0) {
      return activeTrain.allStops;
    }
    return activeTrain.stops;
  }, [activeTrain]);

  const status = useMemo(
    () => (activeTrain ? getTrainStatus(nowSec, stopsToShow) : ({ kind: 'before' } as TrainStatus)),
    [activeTrain, nowSec, stopsToShow]
  );

  const handleStopClick = (stationId?: string) => {
    if (!stationId) return;
    const st = STATIONS.find((s) => s.id === stationId);
    if (st) {
      handleClose();
      onSelectStation(st);
    }
  };

  // Mantine Timeline の到達済みアクティブインデックス
  const activeIndex = useMemo(() => {
    return status.kind === 'before'
      ? -1
      : status.kind === 'arrived'
      ? stopsToShow.length - 1
      : status.index;
  }, [status, stopsToShow.length]);

  // 開いた瞬間（activeTrain セット直後）、現在走行位置または停車駅が画面に出てくるよう即時スクロール
  // 直前の過去停車駅（1〜2駅）が画面上部に見えるスクロール位置に合わせる
  useEffect(() => {
    if (!activeTrain) return;

    const scrollToCurrentStop = () => {
      const content = contentRef.current;
      if (!content) return;

      // 始発前なら最上部（運行状況カードが見える位置）
      if (status.kind === 'before') {
        content.scrollTop = 0;
        return;
      }

      // 現在走行中または停車中の対象駅インデックス
      const targetIndex = status.kind === 'running' ? status.index : activeIndex;
      if (targetIndex <= 0) {
        content.scrollTop = 0;
        return;
      }

      const targetEl = content.querySelector<HTMLElement>(`[data-stop-index="${targetIndex}"]`);
      if (targetEl) {
        // content コンテナ内での正確な相対Y座標
        const contentRect = content.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();
        let relativeTop = targetRect.top - contentRect.top + content.scrollTop;

        // 初期描画直後で rect が取得できていない場合のフォールバック（offsetTop積算）
        if (Math.abs(relativeTop - content.scrollTop) < 2) {
          let totalOffset = 0;
          let cur: HTMLElement | null = targetEl;
          while (cur && cur !== content) {
            totalOffset += cur.offsetTop;
            cur = cur.offsetParent as HTMLElement | null;
          }
          if (totalOffset > 0) {
            relativeTop = totalOffset;
          }
        }

        // 過去駅（1〜2駅）が上部に見えるよう、約85px上にオフセットして即時スクロール
        const targetScroll = Math.max(0, relativeTop - 85);
        content.scrollTop = targetScroll;
      }
    };

    // 初期表示・アニメーション開始〜完了までの各タイミングで確実に即時適用
    scrollToCurrentStop();
    const rafId = requestAnimationFrame(scrollToCurrentStop);
    const t1 = setTimeout(scrollToCurrentStop, 50);
    const t2 = setTimeout(scrollToCurrentStop, 150);
    const t3 = setTimeout(scrollToCurrentStop, 300);
    const t4 = setTimeout(scrollToCurrentStop, 460);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [activeTrain?.id, status.kind, activeIndex]);

  if (!activeTrain) return null;

  const train = activeTrain;
  const lineColor = getLineColor(train.line);
  const mantineColor = getMantineLineColor(train.line);

  const cleanDestination = cleanStationName(train.destination);

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

      {/* ボトムシート */}
      <div
        ref={sheetRef}
        onAnimationEnd={(e) => {
          if (e.animationName === 'm3SheetEnter' && sheetRef.current) {
            sheetRef.current.classList.remove('m3-sheet-enter');
          }
        }}
        className="relative z-50 w-full max-w-md mx-auto glass-surface-strong rounded-t-3xl shadow-glass-lg flex flex-col h-[calc(78vh+180px)] h-[calc(100dvh-5.5rem+180px)] -mb-[180px] border-t border-white/80 dark:border-slate-700/80 m3-bottom-sheet m3-sheet-enter"
      >
        {/* シートヘッダー */}
        <div
          ref={headerRef}
          className="pt-2 pb-2.5 px-4 bg-transparent rounded-t-3xl border-b border-[var(--mantine-color-default-border)] shrink-0 touch-none select-none cursor-grab active:cursor-grabbing"
        >
          {/* ドラッグハンドルバー */}
          <div
            className="w-12 h-1.5 rounded-full mx-auto mb-2 pointer-events-none"
            style={{ backgroundColor: 'var(--mantine-color-default-border)' }}
          />

          <Group justify="space-between" align="center" wrap="nowrap">
            <Stack gap={3} style={{ minWidth: 0, flex: 1 }} className="pointer-events-none">
              {/* 1行目: 路線カラーバー + 路線名 + 列車番号 (+ 土休日運休) */}
              <Group gap={6} align="center" wrap="nowrap">
                <Box w={3.5} h={14} style={{ backgroundColor: lineColor, borderRadius: 2, flexShrink: 0 }} />
                <Text fz="xs" fw={800} c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                  {train.lineName ?? '列車詳細'}
                </Text>
                <Text fz="xs" c="dimmed" fw={700} style={{ whiteSpace: 'nowrap' }}>
                  {train.trainNumber}
                </Text>
                {train.calendar === 'weekday' && (
                  <Badge size="xs" radius="xs" color="gray" variant="light" tt="none">
                    土休日運休
                  </Badge>
                )}
              </Group>

              {/* 2行目: 種別 + 行先 + 右に両数 */}
              <Group gap={8} align="center" wrap="nowrap">
                <Badge size="md" radius="sm" color={mantineColor} variant="filled" tt="none" style={{ flexShrink: 0 }}>
                  {train.trainType ?? '普通'}
                </Badge>
                <Title order={2} fz={19} fw={800} style={{ whiteSpace: 'nowrap', lineHeight: 1.2 }}>
                  {cleanDestination}
                  <Text component="span" fz="xs" fw={700} ml={3} c="dimmed">
                    行
                  </Text>
                </Title>
                <Badge size="sm" radius="sm" variant="default" fw={700} style={{ flexShrink: 0 }}>
                  {train.cars}両
                </Badge>
              </Group>
            </Stack>

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
              style={{ flexShrink: 0 }}
            />
          </Group>
        </div>

        {/* コンテンツ領域 */}
        <div ref={contentRef} className="relative p-4 overflow-y-auto space-y-4 overscroll-contain">
          <Stack gap="md">
            {/* Mantine Timeline による洗練された全区間時刻表 */}
            <Box>
              <Group justify="space-between" align="baseline" mb={12} wrap="nowrap">
                <Text fz="xs" fw={700} c="dimmed">
                  停車駅・時刻（全区間）
                </Text>
                <Text fz={10.5} c="dimmed" fw={600}>
                  {stopsToShow.length}駅
                </Text>
              </Group>

              <Timeline
                active={activeIndex}
                bulletSize={18}
                lineWidth={2.5}
                color={mantineColor}
              >
                {stopsToShow.map((s, i) => {
                  const isFirst = i === 0;
                  const isLast = i === stopsToShow.length - 1;
                  const isStoppedHere = status.kind === 'stopped' && status.index === i;
                  const isRunningAfterThis = status.kind === 'running' && status.index === i;
                  const isCurrent = isStoppedHere;
                  const passed = i <= activeIndex && !isCurrent;
                  const isSelectable = !!s.stationId;

                  // 駅の bullet（停車中は五角形電車アイコン、それ以外は標準）
                  const customBullet = isStoppedHere ? (
                    <PentagonIcon lineColor={lineColor} size={14} />
                  ) : undefined;

                  return (
                    <Timeline.Item
                      key={`${s.stationName}-${i}`}
                      bullet={customBullet}
                      lineVariant={isRunningAfterThis ? 'dashed' : 'solid'}
                    >
                      <UnstyledButton
                        data-stop-index={i}
                        onClick={() => handleStopClick(s.stationId)}
                        style={{
                          cursor: isSelectable ? 'pointer' : 'default',
                          width: '100%',
                        }}
                      >
                        <Group justify="space-between" wrap="nowrap" gap="xs">
                          {/* 駅名 ＋ バッジ */}
                          <Group gap={6} wrap="nowrap" align="center">
                            <Text
                              fz={isSelectable ? 'sm' : 'xs'}
                              fw={isStoppedHere ? 800 : isSelectable ? 700 : 500}
                              c={passed ? 'dimmed' : undefined}
                              style={{ whiteSpace: 'nowrap' }}
                            >
                              {cleanStationName(s.stationName)}
                            </Text>

                            {isStoppedHere && (
                              <Badge size="xs" radius="xs" color={mantineColor} variant="filled" tt="none">
                                停車中
                              </Badge>
                            )}
                            {isFirst && !isStoppedHere && (
                              <Badge size="xs" radius="xs" color="gray" variant="light" tt="none">
                                始発
                              </Badge>
                            )}
                            {isLast && !isStoppedHere && (
                              <Badge size="xs" radius="xs" color="gray" variant="light" tt="none">
                                終着
                              </Badge>
                            )}
                          </Group>

                          {/* 到着時刻・発車時刻 ＆ 番線（全駅で縦一直線に揃う固定幅カラム設計） */}
                          <Group gap={6} wrap="nowrap" align="center" justify="flex-end" style={{ flexShrink: 0 }}>
                            {/* 到着・出発時刻スタック（全駅で着時刻と発時刻を明瞭に表示） */}
                            <Stack gap={1} align="flex-end" justify="center" style={{ minWidth: 54 }}>
                              {isFirst ? (
                                <Text
                                  fz="xs"
                                  fw={isStoppedHere ? 800 : 700}
                                  c={passed ? 'dimmed' : undefined}
                                  className="tabular-nums"
                                  style={{ whiteSpace: 'nowrap' }}
                                >
                                  {formatStopTime(s.dep)} 発
                                </Text>
                              ) : isLast ? (
                                <Text
                                  fz="xs"
                                  fw={isStoppedHere ? 800 : 700}
                                  c={passed ? 'dimmed' : undefined}
                                  className="tabular-nums"
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
                                    className="tabular-nums"
                                    lh={1.2}
                                    style={{ whiteSpace: 'nowrap' }}
                                  >
                                    {formatStopTime(s.arr)} 着
                                  </Text>
                                  <Text
                                    fz="xs"
                                    fw={isStoppedHere ? 800 : 700}
                                    c={passed ? 'dimmed' : undefined}
                                    className="tabular-nums"
                                    lh={1.2}
                                    style={{ whiteSpace: 'nowrap' }}
                                  >
                                    {formatStopTime(s.dep)} 発
                                  </Text>
                                </>
                              )}
                            </Stack>

                            {/* 番線カラム（固定幅42pxで必ず保持し、番線がない駅でも右端ラインを崩さない） */}
                            <Box w={42} style={{ flexShrink: 0, textAlign: 'right' }}>
                              {s.track ? (
                                <Text fz="xs" c="dimmed" fw={600} style={{ whiteSpace: 'nowrap' }}>
                                  {s.track}番線
                                </Text>
                              ) : null}
                            </Box>
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

export default TrainDetailSheet;
