import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { Chip, CloseButton, Link, ScrollShadow, Separator } from '@heroui/react';
import { Station } from '../types';
import { STATIONS } from '../data/mockData';
import { getLineColor } from '../config/trainLineRules';
import {
  getScheduledTrainById,
  getCurrentRailwaySeconds,
  toRailwaySeconds,
  ScheduledTrain,
  ScheduledFullStop,
} from '../utils/trainPosition';
import { useDebug } from '../context/DebugContext';
import { Icon } from './Icon';
import { RouteTimeline, PentagonIcon } from './RouteTimeline';
import {
  getTrainNoticeInfo,
  applySpecialOverrides,
} from '../config/specialScheduleOverrides';

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
  const { now } = useDebug();
  const [activeTrain, setActiveTrain] = useState<ScheduledTrain | null>(() =>
    trainId ? getScheduledTrainById(trainId, now) : null
  );
  const [isEntering, setIsEntering] = useState(true);

  // 閉じるフラグと DOM ref（StationDetailSheet と完全同一のGPU高速アニメーション）
  const isClosingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionEndHandlerRef = useRef<((e: TransitionEvent) => void) | null>(null);

  // 親（App.tsx）の再レンダリング（1秒ごとの時計更新等）で onClose や onSelectStation の参照が変わっても
  // handleClose や drag 用 useEffect が不必要に再生成されないよう ref で最新参照を保持
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const onSelectStationRef = useRef(onSelectStation);
  useEffect(() => {
    onSelectStationRef.current = onSelectStation;
  });

  // 進入アニメーション（450ms）完了後に isEntering を確実に false にリセット
  useEffect(() => {
    if (isEntering) {
      const timer = setTimeout(() => {
        setIsEntering(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isEntering]);

  // 10秒ごとに現在時刻を更新
  const [nowSec, setNowSec] = useState(() => getCurrentRailwaySeconds(now));
  useEffect(() => {
    if (!trainId) return;
    setNowSec(getCurrentRailwaySeconds(now));
    const timer = setInterval(() => setNowSec(getCurrentRailwaySeconds(now)), 10000);
    return () => clearInterval(timer);
  }, [trainId, now]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      if (sheetRef.current && transitionEndHandlerRef.current) {
        sheetRef.current.removeEventListener('transitionend', transitionEndHandlerRef.current);
        transitionEndHandlerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (trainId) {
      const t = getScheduledTrainById(trainId, now);
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      if (sheetRef.current && transitionEndHandlerRef.current) {
        sheetRef.current.removeEventListener('transitionend', transitionEndHandlerRef.current);
        transitionEndHandlerRef.current = null;
      }
      isClosingRef.current = false;
      setActiveTrain(t);
      setIsEntering(true);
      if (containerRef.current) {
        containerRef.current.style.removeProperty('pointer-events');
      }
      if (sheetRef.current) {
        sheetRef.current.style.removeProperty('transform');
        sheetRef.current.style.removeProperty('transition');
        sheetRef.current.style.removeProperty('animation');
        sheetRef.current.style.removeProperty('pointer-events');
      }
      if (scrimRef.current) {
        scrimRef.current.style.removeProperty('opacity');
        scrimRef.current.style.removeProperty('transition');
        scrimRef.current.style.removeProperty('animation');
        scrimRef.current.style.removeProperty('pointer-events');
      }
    } else {
      if (!isClosingRef.current) {
        setActiveTrain(null);
      }
    }
  }, [trainId]);

  // Material 3 準拠のスムーズな閉じる処理
  // ボタン等（fromSwipe = false）: 260ms M3 Emphasized Accelerate
  // スワイプ終了時（fromSwipe = true）: 200ms 減速カーブ cubic-bezier(0.16, 1, 0.3, 1) で指の初速を活かして即時クローズ
  const handleClose = useCallback((fromSwipe = false) => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    // 1. 閉じるアニメーション開始と同時にタッチイベントの遮断を即座に解除
    if (containerRef.current) {
      containerRef.current.style.setProperty('pointer-events', 'none', 'important');
    }

    // 2. 親の selectedTrainId を即座に null に同期更新
    onCloseRef.current();

    const sheet = sheetRef.current;
    const scrim = scrimRef.current;

    const isSwipe = fromSwipe === true;
    const duration = isSwipe ? 200 : 260;
    const scrimDuration = isSwipe ? 180 : 240;
    const timeoutMs = isSwipe ? 220 : 280;
    const easing = isSwipe
      ? 'cubic-bezier(0.16, 1, 0.3, 1)'
      : 'cubic-bezier(0.3, 0.0, 0.8, 0.15)';

    setIsEntering(false);
    if (sheet) {
      sheet.style.animation = 'none';
      sheet.classList.remove('m3-sheet-enter');
      sheet.style.setProperty('transition', `transform ${duration}ms ${easing}`, 'important');
      sheet.style.setProperty('transform', 'translate3d(0, 100%, 0)', 'important');
      sheet.style.setProperty('pointer-events', 'none', 'important');
    }
    if (scrim) {
      scrim.style.animation = 'none';
      scrim.classList.remove('m3-scrim-enter');
      scrim.style.setProperty('transition', `opacity ${scrimDuration}ms ${easing}`, 'important');
      scrim.style.setProperty('opacity', '0', 'important');
      scrim.style.setProperty('pointer-events', 'none', 'important');
    }

    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      if (sheet && transitionEndHandlerRef.current) {
        sheet.removeEventListener('transitionend', transitionEndHandlerRef.current);
        transitionEndHandlerRef.current = null;
      }
      setActiveTrain(null);
      isClosingRef.current = false;
    };

    const onTransitionEnd = (e: TransitionEvent) => {
      if (e.target === sheet && e.currentTarget === sheet && e.propertyName === 'transform') {
        cleanup();
      }
    };
    transitionEndHandlerRef.current = onTransitionEnd;

    if (sheet) {
      sheet.addEventListener('transitionend', onTransitionEnd);
    }

    closeTimeoutRef.current = setTimeout(() => {
      cleanup();
    }, timeoutMs);
  }, []);

  // スワイプ終了時の専用減速クローズ処理
  const dismissWithSwipe = useCallback(() => {
    handleClose(true);
  }, [handleClose]);

  const dismissWithSwipeRef = useRef(dismissWithSwipe);
  useEffect(() => {
    dismissWithSwipeRef.current = dismissWithSwipe;
  });

  // ポインター・タッチ連動による「指に吸い付く」自由ドラッグ・スワイプ連動処理
  useEffect(() => {
    const header = headerRef.current;
    const content = contentRef.current;
    const sheet = sheetRef.current;
    if (!sheet || !activeTrain) return;

    let isHeaderDragging = false;
    let mode: 'idle' | 'pending' | 'pull' | 'scroll' = 'idle';

    let startX = 0;
    let startY = 0;
    let pullStartY = 0;
    let lastVelY = 0;
    let lastVelTime = 0;
    let currentDeltaY = 0;
    let maxDeltaY = 0;
    let velocity = 0;

    const getVisibleSheetHeight = () => {
      return sheet.offsetHeight || window.innerHeight * 0.75;
    };

    // 閉じる判定ヘルパー
    const checkShouldDismiss = (delta: number, maxDelta: number, vel: number) => {
      const visibleH = getVisibleSheetHeight();
      const distanceThreshold = Math.min(90, Math.max(60, visibleH * 0.12));
      const deepThreshold = Math.min(180, Math.max(120, visibleH * 0.25));

      // 1. 深く引き下げられている場合（deepThreshold 以上）:
      // 明確な上向きフリック（vel < -0.35 かつ 35px 以上戻した）でない限り確実に閉じる
      if (delta >= deepThreshold) {
        if (vel < -0.35 && delta < maxDelta - 35) {
          return false;
        }
        return true;
      }

      // 2. 下向きフリック判定（移動量が小さくても下方向への勢いがあれば閉じる）
      const isFlickDown = (delta > 20 && vel > 0.28) || (delta > 12 && vel > 0.55);
      if (isFlickDown) {
        return true;
      }

      // 3. 通常の引き下げ閾値（distanceThreshold 以上）:
      // 指の離れ際の上向き微小反動（微小な負の速度 vel > -0.2）を許容し、
      // 意図的な上戻し（vel < -0.2 または 25px 以上戻した）でなければ閉じる
      if (delta > distanceThreshold) {
        if (vel < -0.2 || delta < maxDelta - 25) {
          return false;
        }
        return true;
      }

      return false;
    };

    // シートのインライン変位を即座にドラッグ状態にセット
    const prepareSheetForDrag = () => {
      setIsEntering(false);
      sheet.style.animation = 'none';
      sheet.classList.remove('m3-sheet-enter');
      sheet.style.setProperty('transition', 'none', 'important');
      if (scrimRef.current) {
        scrimRef.current.style.animation = 'none';
        scrimRef.current.classList.remove('m3-scrim-enter');
        scrimRef.current.style.setProperty('transition', 'none', 'important');
      }
    };

    // シート位置の描画更新
    const applySheetDelta = (delta: number) => {
      currentDeltaY = delta;
      if (delta > maxDeltaY) maxDeltaY = delta;
      sheet.style.setProperty('transform', `translate3d(0, ${delta}px, 0)`, 'important');
      if (scrimRef.current) {
        if (delta > 0) {
          const visibleH = getVisibleSheetHeight();
          const fade = Math.max(0, 1 - delta / (visibleH * 0.55));
          scrimRef.current.style.setProperty('opacity', String(fade), 'important');
        } else {
          scrimRef.current.style.removeProperty('opacity');
        }
      }
    };

    // 元の位置（0px）へスムーズに戻す処理
    const snapBackToZero = () => {
      if (isClosingRef.current) return;
      currentDeltaY = 0;
      maxDeltaY = 0;
      velocity = 0;
      sheet.style.setProperty('transition', 'transform 250ms cubic-bezier(0.16, 1, 0.3, 1)', 'important');
      sheet.style.setProperty('transform', 'translate3d(0, 0, 0)', 'important');
      if (scrimRef.current) {
        scrimRef.current.style.setProperty('transition', 'opacity 250ms cubic-bezier(0.16, 1, 0.3, 1)', 'important');
        scrimRef.current.style.removeProperty('opacity');
      }
    };

    const updateVelocity = (clientY: number) => {
      const now = performance.now();
      const dt = now - lastVelTime;
      if (dt > 8) {
        const instVel = (clientY - lastVelY) / dt;
        velocity = velocity * 0.3 + instVel * 0.7;
        lastVelY = clientY;
        lastVelTime = now;
      }
    };

    // ====================================================
    // 1. ヘッダーでのドラッグ操作
    // PCマウス: Pointer Events（pointerType === 'mouse' のみ）
    // スマホ・タッチ: Touch Events（コンテンツ領域と完全統一）
    // ====================================================
    const onPointerDown = (e: PointerEvent) => {
      // タッチ・ペン操作は TouchEvent で処理するため完全にスキップ（setPointerCapture によるタップ抑制バグを防止）
      if (e.pointerType !== 'mouse') return;
      if (isClosingRef.current || e.button !== 0) return;
      if ((e.target as HTMLElement).closest('button')) return;

      try {
        header?.setPointerCapture(e.pointerId);
      } catch (_) {}

      isHeaderDragging = true;
      startY = e.clientY;
      lastVelY = startY;
      lastVelTime = performance.now();
      currentDeltaY = 0;
      maxDeltaY = 0;
      velocity = 0;

      prepareSheetForDrag();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      if (!isHeaderDragging || isClosingRef.current) return;
      const clientY = e.clientY;
      const delta = clientY - startY;

      if (delta >= 0) {
        applySheetDelta(delta);
      } else {
        const damp = Math.max(-50, delta * 0.15);
        applySheetDelta(damp);
      }
      updateVelocity(clientY);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      if (!isHeaderDragging) return;
      isHeaderDragging = false;
      try {
        header?.releasePointerCapture(e.pointerId);
      } catch (_) {}

      if (performance.now() - lastVelTime > 80) {
        velocity = 0;
      }

      if (currentDeltaY > 0 && checkShouldDismiss(currentDeltaY, maxDeltaY, velocity)) {
        dismissWithSwipeRef.current();
      } else {
        snapBackToZero();
      }
    };

    // スマホ実機向け TouchEvent ハンドラ（コンテンツ領域と完全同一の安定実装）
    const onHeaderTouchStart = (e: TouchEvent) => {
      if (isClosingRef.current || e.touches.length !== 1) return;
      if ((e.target as HTMLElement).closest('button')) return;

      isHeaderDragging = true;
      startY = e.touches[0].clientY;
      lastVelY = startY;
      lastVelTime = performance.now();
      currentDeltaY = 0;
      maxDeltaY = 0;
      velocity = 0;

      prepareSheetForDrag();
    };

    const onHeaderTouchMove = (e: TouchEvent) => {
      if (!isHeaderDragging || isClosingRef.current || e.touches.length !== 1) return;
      const clientY = e.touches[0].clientY;
      const delta = clientY - startY;

      if (delta >= 0) {
        if (e.cancelable) e.preventDefault();
        applySheetDelta(delta);
      } else {
        const damp = Math.max(-50, delta * 0.15);
        applySheetDelta(damp);
      }
      updateVelocity(clientY);
    };

    const onHeaderTouchEnd = () => {
      if (!isHeaderDragging) return;
      isHeaderDragging = false;

      if (performance.now() - lastVelTime > 80) {
        velocity = 0;
      }

      if (currentDeltaY > 0 && checkShouldDismiss(currentDeltaY, maxDeltaY, velocity)) {
        dismissWithSwipeRef.current();
      } else {
        snapBackToZero();
      }
    };

    // ====================================================
    // 2. コンテンツ領域でのジェスチャー制御（スクロール ⇔ 引き下げ）
    // ====================================================
    const onContentTouchStart = (e: TouchEvent) => {
      if (isClosingRef.current || e.touches.length !== 1) {
        mode = 'idle';
        return;
      }
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-scrollable="true"]') || (content?.scrollTop ?? 0) > 1) {
        mode = 'scroll';
        return;
      }

      mode = 'pending';
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      pullStartY = t.clientY;
      lastVelY = t.clientY;
      lastVelTime = performance.now();
      currentDeltaY = 0;
      maxDeltaY = 0;
      velocity = 0;
    };

    const onContentTouchMove = (e: TouchEvent) => {
      if (mode === 'idle' || mode === 'scroll' || isClosingRef.current || e.touches.length !== 1) {
        return;
      }

      const t = e.touches[0];
      const clientX = t.clientX;
      const clientY = t.clientY;

      if (mode === 'pending') {
        const dx = clientX - startX;
        const dy = clientY - startY;
        if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;

        if (dy < 0 || Math.abs(dx) > Math.abs(dy) || (content?.scrollTop ?? 0) > 1 || !e.cancelable) {
          mode = 'scroll';
          return;
        }

        mode = 'pull';
        pullStartY = clientY;
        lastVelY = clientY;
        lastVelTime = performance.now();
        prepareSheetForDrag();
      }

      if (mode === 'pull') {
        if (!e.cancelable) {
          snapBackToZero();
          mode = 'scroll';
          return;
        }
        e.preventDefault();
        const rawDelta = clientY - pullStartY;
        if (rawDelta >= 0) {
          applySheetDelta(rawDelta);
        } else {
          const damp = Math.max(-30, rawDelta * 0.12);
          applySheetDelta(damp);
        }
        updateVelocity(clientY);
      }
    };

    const onContentTouchEnd = () => {
      const endedMode = mode;
      mode = 'idle';

      if (endedMode !== 'pull') {
        if (currentDeltaY !== 0 && !isClosingRef.current) {
          snapBackToZero();
        }
        return;
      }

      if (performance.now() - lastVelTime > 80) {
        velocity = 0;
      }

      if (currentDeltaY > 0 && checkShouldDismiss(currentDeltaY, maxDeltaY, velocity)) {
        dismissWithSwipeRef.current();
      } else {
        snapBackToZero();
      }
    };

    const supportsPointerEvents = typeof window !== 'undefined' && 'PointerEvent' in window;

    if (header) {
      // スマホ・タッチ端末用（コンテンツ領域と完全に同じ安定した TouchEvent）
      header.addEventListener('touchstart', onHeaderTouchStart, { passive: true });
      header.addEventListener('touchmove', onHeaderTouchMove, { passive: false });
      header.addEventListener('touchend', onHeaderTouchEnd, { passive: true });
      header.addEventListener('touchcancel', onHeaderTouchEnd, { passive: true });

      // PCマウス用（pointerType === 'mouse' のみフィルタリングして処理）
      if (supportsPointerEvents) {
        header.addEventListener('pointerdown', onPointerDown);
        header.addEventListener('pointermove', onPointerMove);
        header.addEventListener('pointerup', onPointerUp);
        header.addEventListener('pointercancel', onPointerUp);
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
        header.removeEventListener('touchstart', onHeaderTouchStart);
        header.removeEventListener('touchmove', onHeaderTouchMove);
        header.removeEventListener('touchend', onHeaderTouchEnd);
        header.removeEventListener('touchcancel', onHeaderTouchEnd);

        if (supportsPointerEvents) {
          header.removeEventListener('pointerdown', onPointerDown);
          header.removeEventListener('pointermove', onPointerMove);
          header.removeEventListener('pointerup', onPointerUp);
          header.removeEventListener('pointercancel', onPointerUp);
        }
      }
      if (content) {
        content.removeEventListener('touchstart', onContentTouchStart);
        content.removeEventListener('touchmove', onContentTouchMove);
        content.removeEventListener('touchend', onContentTouchEnd);
        content.removeEventListener('touchcancel', onContentTouchEnd);
      }
    };
  }, [activeTrain?.id]);

  // 臨時運行上書き適用（11/6〜11/8は両数・番線変更、それ以外は通常ダイヤ）
  const train = useMemo(() => {
    if (!activeTrain) return null;
    return applySpecialOverrides(activeTrain, now);
  }, [activeTrain, now]);

  // 対象便に対する告知案内情報（告知期間中のみ取得）
  const trainNotice = useMemo(() => {
    return getTrainNoticeInfo(train?.trainNumber, now);
  }, [train?.trainNumber, now]);

  // 停車駅リスト: 始発〜終着の全駅（allStops）を使用
  const stopsToShow: ScheduledFullStop[] = useMemo(() => {
    if (!train) return [];
    if (train.allStops && train.allStops.length > 0) {
      return train.allStops;
    }
    return train.stops.map((s) => ({
      stationId: s.stationId,
      stationName: s.stationName,
      arr: s.arr,
      dep: s.dep,
      track: s.track,
    }));
  }, [train]);

  const status = useMemo(() => {
    return train ? getTrainStatus(nowSec, stopsToShow) : ({ kind: 'before' } as TrainStatus);
  }, [train, nowSec, stopsToShow]);

  const handleStopClick = (stationId?: string) => {
    if (!stationId) return;
    const st = STATIONS.find((s) => s.id === stationId);
    if (st) {
      handleClose();
      onSelectStationRef.current(st);
    }
  };

  const activeIndex = useMemo(() => {
    return status.kind === 'before'
      ? -1
      : status.kind === 'arrived'
      ? stopsToShow.length - 1
      : status.index;
  }, [status, stopsToShow.length]);

  // 開いた瞬間（train セット直後）、現在走行位置または停車駅が画面に出てくるよう即時スクロール
  // 直前の過去停車駅（1〜2駅）が画面上部に見えるスクロール位置に合わせる
  useEffect(() => {
    if (!train) return;

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
  }, [train?.id, status.kind, activeIndex]);

  if (!train) return null;

  const lineColor = getLineColor(train.line);
  const cleanDestination = cleanStationName(train.destination);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[60] flex flex-col justify-end pt-[calc(env(safe-area-inset-top,0px)+3.5rem)] overflow-hidden"
    >
      {/* 背景スクリム */}
      <div
        ref={scrimRef}
        onAnimationEnd={(e) => {
          if (e.target === scrimRef.current && e.animationName === 'm3ScrimEnter') {
            setIsEntering(false);
          }
        }}
        className={`fixed inset-0 bg-backdrop m3-scrim ${isEntering ? 'm3-scrim-enter' : ''}`}
        onClick={() => handleClose(false)}
      />

      {/* ボトムシート */}
      <div
        ref={sheetRef}
        onAnimationEnd={(e) => {
          if (e.target === sheetRef.current && e.animationName === 'm3SheetEnter') {
            setIsEntering(false);
          }
        }}
        className={`relative z-[70] w-full max-w-md mx-auto bg-overlay text-overlay-foreground shadow-overlay border-t border-border rounded-t-3xl flex flex-col h-[78vh] h-[calc(100dvh-5.5rem)] m3-bottom-sheet ${isEntering ? 'm3-sheet-enter' : ''}`}
      >
        {/* シートヘッダー */}
        <div
          ref={headerRef}
          className="pt-2 pb-2.5 px-4 bg-transparent rounded-t-3xl shrink-0 touch-none select-none cursor-grab active:cursor-grabbing"
        >
          {/* ドラッグハンドルバー */}
          <div className="w-12 h-1.5 rounded-full mx-auto mb-2 pointer-events-none bg-muted/30" />

          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col gap-0.5 min-w-0 flex-1 pointer-events-none">
              {/* 1行目: 路線カラーバー + 路線名 + 列車番号 (+ 土休日運休) */}
              <div className="flex items-center gap-1.5 flex-nowrap">
                <span
                  className="w-[3.5px] h-[14px] rounded-[2px] shrink-0"
                  style={{ backgroundColor: lineColor }}
                />
                <span className="text-xs font-extrabold text-muted whitespace-nowrap">
                  {train.lineName ?? '列車詳細'}
                </span>
                <span className="text-xs font-bold text-muted whitespace-nowrap">
                  {train.trainNumber}
                </span>
                {train.calendar === 'weekday' && (
                  <Chip size="sm" variant="soft" color="default" className="text-[10px] px-1.5 py-0 h-4">
                    土休日運休
                  </Chip>
                )}
              </div>

              {/* 2行目: 種別 + 行先 + 右に両数 */}
              <div className="flex items-center gap-2 flex-nowrap">
                <Chip
                  size="sm"
                  variant="primary"
                  className="shrink-0 text-white font-bold text-xs px-2 py-0.5"
                  style={{ backgroundColor: lineColor }}
                >
                  {train.trainType ?? '普通'}
                </Chip>
                <h2 className="text-[19px] font-extrabold whitespace-nowrap leading-[1.2] text-foreground">
                  {cleanDestination}
                  <span className="text-xs font-bold ml-1 text-muted">
                    行
                  </span>
                </h2>
                <Chip size="sm" variant="secondary" className="shrink-0 font-bold text-xs">
                  {train.cars}両
                </Chip>
                {trainNotice && (
                  <Chip
                    size="sm"
                    variant="soft"
                    color="accent"
                    className="shrink-0 text-[10px] px-1.5 py-0 h-4 font-bold"
                  >
                    {trainNotice.cars ? '増結対象' : '番線変更'}
                  </Chip>
                )}
              </div>
            </div>

            <CloseButton
              onPress={() => handleClose(false)}
              aria-label="閉じる"
              className="pointer-events-auto shrink-0"
            />
          </div>
        </div>

        <Separator />

        {/* コンテンツ領域 */}
        <ScrollShadow ref={contentRef} className="relative flex-1 min-h-0 p-4 pb-8 overflow-y-auto space-y-4 overscroll-contain">
          <div className="flex flex-col gap-4">
            {/* 臨時ダイヤ・増結運転のお知らせバナー（HeroUI Link） */}
            {trainNotice && (
              <div>
                <Link
                  href={trainNotice.event.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block p-3 rounded-2xl border border-blue-200/80 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-950/25 hover:bg-blue-50/90 dark:hover:bg-blue-950/45 transition-colors shadow-xs no-underline w-full"
                >
                  <div className="flex items-start gap-2.5 w-full">
                    <span className="shrink-0 mt-0.5 text-accent">
                      <Icon name="campaign" size={18} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5 mb-1">
                        <div className="flex items-center gap-1.5 flex-nowrap">
                          <Chip
                            size="sm"
                            variant="primary"
                            className="text-[10px] font-bold text-white px-1.5 py-0 h-4"
                            style={{ backgroundColor: lineColor }}
                          >
                            {trainNotice.cars ? '増結運転のお知らせ' : '発着番線変更のお知らせ'}
                          </Chip>
                          <span className="text-[11px] font-bold text-muted">
                            {trainNotice.note}
                          </span>
                        </div>
                        <span className="shrink-0 text-muted group-hover:text-accent transition-colors">
                          <Icon name="open_in_new" size={15} />
                        </span>
                      </div>
                      <div className="text-[12.5px] font-bold text-accent leading-snug underline-offset-2 group-hover:underline">
                        {trainNotice.event.title}
                      </div>
                      {trainNotice.event.description && (
                        <p className="text-[11px] text-muted mt-1 leading-snug">
                          {trainNotice.event.description}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            )}

            {/* 全区間時刻表タイムライン */}
            <div>
              <div className="flex items-baseline justify-between mb-3">
                <span className="text-xs font-bold text-muted">
                  停車駅・時刻（全区間）
                </span>
                <span className="text-[10.5px] font-semibold text-muted">
                  {stopsToShow.length}駅
                </span>
              </div>

              <RouteTimeline
                items={stopsToShow}
                lineColor={lineColor}
                getItemKey={(s, i) => `${s.stationName}-${i}`}
                getDataAttributes={(_, i) => ({ 'data-stop-index': i })}
                isPassed={(_, i) =>
                  status.kind === 'arrived'
                    ? true
                    : status.kind === 'before'
                    ? false
                    : status.kind === 'stopped'
                    ? i < status.index
                    : i <= status.index
                }
                isVehiclePosition={(_, i) =>
                  status.kind === 'stopped' && status.index === i
                }
                showPing={(_, i) =>
                  status.kind === 'stopped' && status.index === i
                }
                renderAfterRow={(_, i) => {
                  const isRunningAfterThis = status.kind === 'running' && status.index === i;
                  if (!isRunningAfterThis) return null;
                  return (
                    <div className="relative flex items-center gap-2.5 px-2 py-1 z-10">
                      <div className="relative shrink-0 w-5 flex items-center justify-center">
                        <span
                          className="absolute w-4 h-4 rounded-full animate-ping opacity-60 pointer-events-none"
                          style={{ backgroundColor: lineColor }}
                        />
                        <PentagonIcon lineColor={lineColor} size={14} />
                      </div>
                      <span
                        className="text-[11px] font-bold"
                        style={{ color: lineColor }}
                      >
                        走行中
                      </span>
                    </div>
                  );
                }}
                renderContent={(s, i) => {
                  const isFirst = i === 0;
                  const isLast = i === stopsToShow.length - 1;
                  const isStoppedHere = status.kind === 'stopped' && status.index === i;
                  const passed =
                    status.kind === 'arrived'
                      ? true
                      : status.kind === 'before'
                      ? false
                      : status.kind === 'stopped'
                      ? i < status.index
                      : i <= status.index;
                  const isSelectable = !!s.stationId;

                  return (
                    <button
                      type="button"
                      onClick={() => handleStopClick(s.stationId)}
                      disabled={!isSelectable}
                      className={`w-full flex items-center justify-between text-left transition-colors rounded-lg px-2 py-1 -my-1 ${
                        isSelectable
                          ? 'hover:bg-surface-secondary cursor-pointer'
                          : 'cursor-default'
                      }`}
                    >
                      {/* 駅名 */}
                      <div className="min-w-0 flex-1 pr-2">
                        <span
                          className={`block truncate ${
                            isSelectable ? 'text-sm' : 'text-xs'
                          } ${
                            isStoppedHere
                              ? 'font-extrabold text-foreground'
                              : isSelectable
                              ? 'font-bold'
                              : 'font-medium'
                          } ${
                            passed
                              ? 'text-muted'
                              : 'text-foreground'
                          }`}
                        >
                          {cleanStationName(s.stationName)}
                        </span>
                      </div>

                      {/* 到着時刻・発車時刻 ＆ 番線 */}
                      <div className="flex items-center gap-1.5 shrink-0 justify-end">
                        <div className="flex flex-col items-end justify-center min-w-[54px]">
                          {isFirst ? (
                            <span
                              className={`text-xs tabular-nums whitespace-nowrap ${
                                isStoppedHere
                                  ? 'font-extrabold text-foreground'
                                  : 'font-bold'
                              } ${
                                passed
                                  ? 'text-muted'
                                  : 'text-foreground'
                              }`}
                            >
                              {formatStopTime(s.dep)} 発
                            </span>
                          ) : isLast ? (
                            <span
                              className={`text-xs tabular-nums whitespace-nowrap ${
                                isStoppedHere
                                  ? 'font-extrabold text-foreground'
                                  : 'font-bold'
                              } ${
                                passed
                                  ? 'text-muted'
                                  : 'text-foreground'
                              }`}
                            >
                              {formatStopTime(s.arr)} 着
                            </span>
                          ) : (
                            <>
                              <span className="text-[11px] font-medium text-muted tabular-nums whitespace-nowrap leading-[1.2]">
                                {formatStopTime(s.arr)} 着
                              </span>
                              <span
                                className={`text-xs tabular-nums whitespace-nowrap leading-[1.2] ${
                                  isStoppedHere
                                    ? 'font-extrabold text-foreground'
                                    : 'font-bold'
                                } ${
                                  passed
                                    ? 'text-muted'
                                    : 'text-foreground'
                                }`}
                              >
                                {formatStopTime(s.dep)} 発
                              </span>
                            </>
                          )}
                        </div>

                        {/* 番線カラム */}
                        <div className="w-[42px] shrink-0 text-right">
                          {s.track ? (
                            <span className="text-xs font-semibold text-muted whitespace-nowrap">
                              {s.track}番線
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  );
                }}
              />
            </div>
          </div>

          <div className="h-4 pb-safe" />
        </ScrollShadow>

        <div className="absolute top-full inset-x-0 h-[120px] pointer-events-none bg-overlay" aria-hidden="true" />
      </div>
    </div>
  );
};

export default TrainDetailSheet;
