import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Station, DepartureTrain } from '../types';
import { LedDepartureBoard } from './LedDepartureBoard';
import { TrainVision } from './TrainVision';
import { TransferGuide } from './TransferGuide';
import { FareTable } from './FareTable';
import { JisStairs } from './icons';
import { DebugControlPanel } from './DebugControlPanel';
import { SectionHeader } from './common/SectionHeader';
import { CloseButton, Card, Disclosure, Separator, ScrollShadow } from '@heroui/react';

interface StationDetailSheetProps {
  station: Station | null;
  onClose: () => void;
}

interface StationSheetContentProps {
  station: Station;
  selectedTrain: DepartureTrain | null;
  onSelectTrain: (train: DepartureTrain) => void;
}

// コンテンツ部分を memo 化して不要な再レンダリングを防止
const StationSheetContent = React.memo<StationSheetContentProps>(({
  station,
  selectedTrain,
  onSelectTrain,
}) => {
  const [isTrainVisionOpen, setIsTrainVisionOpen] = useState(false);

  useEffect(() => {
    setIsTrainVisionOpen(false);
  }, [station.id]);

  return (
    <>
      {/* 1. 発車案内 */}
      <section>
        <SectionHeader
          title="発車案内"
          indicatorColor="#2A5CAA"
        />
        {/* デバッグモード（?debug=1）時のみ表示される電光掲示板直上操作パネル */}
        <DebugControlPanel variant="sheet" isSendai={station.id === 'sendai'} />
        <LedDepartureBoard
          stationId={station.id}
          selectedTrain={selectedTrain}
          onSelectTrain={onSelectTrain}
        />
      </section>

      <Separator className="my-1 border-border" />

      {/* 2. 乗り換え案内 */}
      <section>
        <SectionHeader
          title="接続路線・バス"
          indicatorColor="#3CB371"
        />
        <TransferGuide station={station} />
      </section>

      <Separator className="my-1 border-border" />

      {/* 3. 運賃一覧 */}
      <section>
        <SectionHeader
          title="きっぷ・IC運賃表"
          indicatorColor="#0067C0"
        />
        <FareTable currentStation={station} />
      </section>

      <Separator className="my-1 border-border" />

      {/* 4. 階段・改札口案内（折りたたみ式・初期状態は閉） */}
      <section className="pb-4">
        <SectionHeader
          title="階段・改札口案内"
          indicatorColor="var(--muted)"
        />
        <Card className="gap-0 p-0 overflow-hidden border border-border rounded-2xl bg-surface">
          <Disclosure isExpanded={isTrainVisionOpen} onExpandedChange={setIsTrainVisionOpen}>
            <Disclosure.Heading>
              <Disclosure.Trigger className="w-full flex items-center justify-between px-3.5 py-2.5 text-left transition-colors hover:bg-surface-secondary cursor-pointer">
                <div className="flex items-center gap-2">
                  <JisStairs size={16} />
                  <span className="text-xs font-extrabold text-foreground">
                    {station.name}駅の階段・改札口・設備位置
                  </span>
                </div>
                <Disclosure.Indicator className="text-muted transition-transform duration-200" />
              </Disclosure.Trigger>
            </Disclosure.Heading>
            <Disclosure.Content>
              <Disclosure.Body className="p-2.5 border-t border-border">
                <TrainVision
                  station={station}
                  selectedTrain={selectedTrain}
                />
              </Disclosure.Body>
            </Disclosure.Content>
          </Disclosure>
        </Card>
      </section>

      {/* 最下部スクロール時の余白 */}
      <div className="h-4 pb-safe" />
    </>
  );
});

StationSheetContent.displayName = 'StationSheetContent';

export const StationDetailSheet: React.FC<StationDetailSheetProps> = ({
  station,
  onClose,
}) => {
  const [activeStation, setActiveStation] = useState<Station | null>(station);
  const [selectedTrain, setSelectedTrain] = useState<DepartureTrain | null>(null);
  const [isEntering, setIsEntering] = useState(true);

  // 閉じるフラグを ref で管理し、アニメーション中の React 再レンダリング（メインスレッド占有）を完全ゼロ化
  const isClosingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionEndHandlerRef = useRef<((e: TransitionEvent) => void) | null>(null);

  // 親（App.tsx）の再レンダリング（1秒ごとの時計更新等）で onClose の参照が変わっても
  // handleClose や drag 用 useEffect が不必要に再生成されないよう ref で最新参照を保持
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const handleSelectTrain = useCallback((train: DepartureTrain) => {
    setSelectedTrain(train);
  }, []);

  // 進入アニメーション（450ms）完了後に isEntering を確実に false にリセット
  useEffect(() => {
    if (isEntering) {
      const timer = setTimeout(() => {
        setIsEntering(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isEntering]);

  // コンポーネント破棄時にタイマーおよびリスナーをクリーンアップ
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

  // 駅が切り替わったときの初期化処理
  useEffect(() => {
    if (station) {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      if (sheetRef.current && transitionEndHandlerRef.current) {
        sheetRef.current.removeEventListener('transitionend', transitionEndHandlerRef.current);
        transitionEndHandlerRef.current = null;
      }
      isClosingRef.current = false;
      setActiveStation(station);
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
      // 駅を開いた時は初期選択を null にし、各駅の現在時刻以降の直近列車を自動反映
      setSelectedTrain(null);
    } else {
      // 親コンポーネントで station が null になった場合
      // すでに自発的な閉じるアニメーション（isClosingRef = true）が進行中の場合は activeStation を保持し、
      // 外部要因で急に null にされた場合のみ即時 null にリセットする
      if (!isClosingRef.current) {
        setActiveStation(null);
      }
    }
  }, [station]);

  // Material 3 準拠のスムーズな閉じる処理
  // ボタン等（fromSwipe = false）: 260ms M3 Emphasized Accelerate
  // スワイプ終了時（fromSwipe = true）: 200ms 減速カーブ cubic-bezier(0.16, 1, 0.3, 1) で指の初速を活かして即時クローズ
  const handleClose = useCallback((fromSwipe = false) => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    // 1. 閉じるアニメーション開始と同時にタッチイベントの遮断を即座に解除
    // （背後の路線図や別駅ボタンへの1タップ目がアニメーション中に吸収されるのを完全に防止）
    if (containerRef.current) {
      containerRef.current.style.setProperty('pointer-events', 'none', 'important');
    }

    // 2. 親の selectedStation を即座に null に同期更新
    // これにより、閉じるアニメーション中やスワイプ完了直後にユーザーが同一駅または別駅をタップした際、
    // 親側で確実に値の変更（null -> station）として検知され、1タップ目で即座に新規オープンできる
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
      setActiveStation(null);
      isClosingRef.current = false;
    };

    // transitionend イベントによるアニメーション完了検知
    const onTransitionEnd = (e: TransitionEvent) => {
      if (e.target === sheet && e.currentTarget === sheet && e.propertyName === 'transform') {
        cleanup();
      }
    };
    transitionEndHandlerRef.current = onTransitionEnd;

    if (sheet) {
      sheet.addEventListener('transitionend', onTransitionEnd);
    }

    // transitionend が万一発火しない場合の完全同期フォールバック
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
    if (!sheet || !activeStation) return;

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
  }, [activeStation?.id]);

  if (!activeStation) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-40 flex flex-col justify-end pt-[calc(env(safe-area-inset-top,0px)+3.5rem)] overflow-hidden"
    >
      {/* 背景オーバーレイ */}
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
        className={`relative z-50 w-full max-w-md mx-auto bg-overlay text-overlay-foreground shadow-overlay border-t border-border rounded-t-3xl flex flex-col h-[78vh] h-[calc(100dvh-5.5rem)] m3-bottom-sheet ${isEntering ? 'm3-sheet-enter' : ''}`}
      >
        {/* シートヘッダー（ドラッグ／下スワイプで閉じられる領域） */}
        <div
          ref={headerRef}
          className="pt-2.5 pb-3 px-4 bg-transparent rounded-t-3xl shrink-0 touch-none select-none cursor-grab active:cursor-grabbing"
        >
          {/* ドラッグハンドルバー */}
          <div className="w-12 h-1.5 rounded-full mx-auto mb-2.5 pointer-events-none bg-muted/30" />

          <div className="flex items-center justify-between gap-2">
            <div className="pointer-events-none min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <h2 className="text-xl font-extrabold tracking-tight text-foreground">
                  {activeStation.name}駅
                </h2>
                <span className="text-xs text-muted">
                  {activeStation.nameKana}
                </span>
              </div>
              <p className="text-[11px] text-muted font-english">
                {activeStation.nameEn} Station
              </p>
            </div>

            {/* 閉じるボタン（HeroUI CloseButton） */}
            <CloseButton
              onPress={() => handleClose(false)}
              aria-label="閉じる"
              className="pointer-events-auto shrink-0"
            />
          </div>
        </div>

        <Separator />

        {/* コンテンツ領域 */}
        <ScrollShadow
          ref={contentRef}
          className="flex-1 min-h-0 p-3.5 pb-8 overflow-y-auto space-y-4 overscroll-contain"
        >
          <StationSheetContent
            station={activeStation}
            selectedTrain={selectedTrain}
            onSelectTrain={handleSelectTrain}
          />
        </ScrollShadow>

        {/* シート引き上げ時の下端隙間防止エクステンション */}
        <div className="absolute top-full inset-x-0 h-[120px] pointer-events-none bg-overlay" aria-hidden="true" />
      </div>
    </div>
  );
};

export default StationDetailSheet;
