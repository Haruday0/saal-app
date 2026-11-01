import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Station, DepartureTrain } from '../types';
import { LedDepartureBoard } from './LedDepartureBoard';
import { TrainVision } from './TrainVision';
import { TransferGuide } from './TransferGuide';
import { FareTable } from './FareTable';
import { JisStairs } from './icons';
import { Icon } from './Icon';
import { DebugControlPanel } from './DebugControlPanel';
import { Group, Text, Title, CloseButton, Paper, UnstyledButton, Collapse, Box } from '@mantine/core';

interface StationDetailSheetProps {
  station: Station | null;
  onClose: () => void;
}

interface StationSheetContentProps {
  station: Station;
  selectedTrain: DepartureTrain | null;
  onSelectTrain: (train: DepartureTrain) => void;
}

// コンテンツ部分を memo 化して、アニメーション中やヘッダー操作時の不要な仮想DOM再計算を完全防止
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
        <Text fz="xs" fw={700} c="dimmed" mb={6} px={2}>
          発車案内
        </Text>
        {/* デバッグモード（?debug=1）時のみ表示される電光掲示板直上操作パネル */}
        <DebugControlPanel variant="sheet" isSendai={station.id === 'sendai'} />
        <LedDepartureBoard
          stationId={station.id}
          selectedTrain={selectedTrain}
          onSelectTrain={onSelectTrain}
        />
      </section>

      {/* 2. 乗り換え案内 */}
      <section>
        <Text fz="xs" fw={700} c="dimmed" mb={6} px={2}>
          接続路線・バス
        </Text>
        <TransferGuide station={station} />
      </section>

      {/* 3. 運賃一覧 */}
      <section>
        <Text fz="xs" fw={700} c="dimmed" mb={6} px={2}>
          きっぷ・IC運賃表
        </Text>
        <FareTable currentStation={station} />
      </section>

      {/* 4. 階段・改札口案内（折りたたみ式・初期状態は閉） */}
      <section className="pb-4">
        <Text fz="xs" fw={700} c="dimmed" mb={6} px={2}>
          階段・改札口案内
        </Text>
        <Paper withBorder radius="lg" style={{ overflow: 'hidden' }}>
          <UnstyledButton
            onClick={() => setIsTrainVisionOpen((prev) => !prev)}
            w="100%"
            px={14}
            py={10}
            aria-expanded={isTrainVisionOpen}
          >
            <Group justify="space-between" wrap="nowrap" gap="xs">
              <Group gap="xs" wrap="nowrap">
                <JisStairs size={16} />
                <Text fw={800} fz="xs">
                  {station.name}駅の階段・改札口・設備位置
                </Text>
              </Group>
              <Icon
                name="expand_more"
                size={18}
                className={`text-slate-400 transition-transform duration-200 ${
                  isTrainVisionOpen ? 'rotate-180' : ''
                }`}
              />
            </Group>
          </UnstyledButton>
          <Collapse expanded={isTrainVisionOpen}>
            <Box
              p="xs"
              style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
            >
              <TrainVision
                station={station}
                selectedTrain={selectedTrain}
              />
            </Box>
          </Collapse>
        </Paper>
      </section>

      {/* 最下部スクロール時の余白（最下部までスクロールして上に引っ張ったときは同色背景が自然に追従） */}
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

  // 閉じるフラグを ref で管理し、アニメーション中の React 再レンダリング（メインスレッド占有）を完全ゼロ化
  const isClosingRef = useRef(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSelectTrain = useCallback((train: DepartureTrain) => {
    setSelectedTrain(train);
  }, []);

  // コンポーネント破棄時にタイマーをクリーンアップ
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
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
      isClosingRef.current = false;
      setActiveStation(station);
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
      // 駅を開いた時は初期選択を null にし、各駅の現在時刻以降の直近列車を自動反映
      setSelectedTrain(null);
    } else {
      isClosingRef.current = false;
      setActiveStation(null);
    }
  }, [station]);

  // Material 3 準拠のスムーズな閉じる処理
  // ボタン等（fromSwipe = false）: 260ms M3 Emphasized Accelerate
  // スワイプ終了時（fromSwipe = true）: 200ms 減速カーブ cubic-bezier(0.16, 1, 0.3, 1) で指の初速を活かして即時クローズ
  const handleClose = useCallback((fromSwipe = false) => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    const sheet = sheetRef.current;
    const scrim = scrimRef.current;

    const isSwipe = fromSwipe === true;
    const duration = isSwipe ? 200 : 260;
    const scrimDuration = isSwipe ? 180 : 240;
    const timeoutMs = isSwipe ? 220 : 280;
    const easing = isSwipe
      ? 'cubic-bezier(0.16, 1, 0.3, 1)'
      : 'cubic-bezier(0.3, 0.0, 0.8, 0.15)';

    if (sheet) {
      sheet.style.animation = 'none';
      sheet.classList.remove('m3-sheet-enter');
      sheet.style.setProperty('transition', `transform ${duration}ms ${easing}`, 'important');
      sheet.style.setProperty('transform', 'translate3d(0, 100%, 0)', 'important');
    }
    if (scrim) {
      scrim.style.animation = 'none';
      scrim.classList.remove('m3-scrim-enter');
      scrim.style.setProperty('transition', `opacity ${scrimDuration}ms ${easing}`, 'important');
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
      setActiveStation(null);
      isClosingRef.current = false;
    };

    // transitionend イベントによるアニメーション完了検知
    const onTransitionEnd = (e: TransitionEvent) => {
      if (e.target === sheet && e.propertyName === 'transform') {
        cleanup();
      }
    };

    if (sheet) {
      sheet.addEventListener('transitionend', onTransitionEnd);
    }

    // transitionend が万一発火しない場合の完全同期フォールバック
    closeTimeoutRef.current = setTimeout(() => {
      cleanup();
    }, timeoutMs);
  }, [onClose]);

  // スワイプ終了時の専用減速クローズ処理
  const dismissWithSwipe = useCallback(() => {
    handleClose(true);
  }, [handleClose]);

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
      // 指を上向きに戻している最中（vel < -0.04）、または最高引き下げ位置から10px以上上へ戻した場合は閉じない
      if (vel < -0.04 || delta < maxDelta - 10) {
        return false;
      }
      const visibleH = getVisibleSheetHeight();
      const distanceThreshold = Math.min(90, Math.max(60, visibleH * 0.12));
      const isFlick = (delta > 22 && vel > 0.28) || (delta > 12 && vel > 0.55);
      return delta > distanceThreshold || isFlick;
    };

    // シートのインライン変位を即座にドラッグ状態にセット
    const prepareSheetForDrag = () => {
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
    // 1. ヘッダーでのドラッグ操作（Pointer Events）
    // ====================================================
    const onPointerDown = (e: PointerEvent) => {
      if (isClosingRef.current) return;
      if ((e.target as HTMLElement).closest('button')) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;

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
      if (!isHeaderDragging) return;
      isHeaderDragging = false;
      try {
        header?.releasePointerCapture(e.pointerId);
      } catch (_) {}

      if (performance.now() - lastVelTime > 80) {
        velocity = 0;
      }

      if (currentDeltaY > 0 && checkShouldDismiss(currentDeltaY, maxDeltaY, velocity)) {
        dismissWithSwipe();
      } else {
        snapBackToZero();
      }
    };

    // レガシー環境向け TouchEvent フォールバック（PointerEvent 非対応環境のみ）
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
        dismissWithSwipe();
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
        dismissWithSwipe();
      } else {
        snapBackToZero();
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
  }, [activeStation, dismissWithSwipe]);

  if (!activeStation) return null;

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end pt-[calc(env(safe-area-inset-top,0px)+3.5rem)] overflow-hidden">
      {/* 背景オーバーレイ（背後の路線図はぼかさず、ボトムシート自身のすりガラス効果で屈折させる） */}
      <div
        ref={scrimRef}
        onAnimationEnd={(e) => {
          if (e.animationName === 'm3ScrimEnter' && scrimRef.current) {
            scrimRef.current.classList.remove('m3-scrim-enter');
          }
        }}
        className="fixed inset-0 bg-slate-900/15 dark:bg-black/40 m3-scrim m3-scrim-enter"
        onClick={() => handleClose(false)}
      />

      {/* ボトムシート（sendai-bus-map-v2 #bottom-panel 準拠のガラスサーフェス仕様） */}
      <div
        ref={sheetRef}
        onAnimationEnd={(e) => {
          if (e.animationName === 'm3SheetEnter' && sheetRef.current) {
            sheetRef.current.classList.remove('m3-sheet-enter');
          }
        }}
        className="relative z-50 w-full max-w-md mx-auto glass-surface-strong rounded-t-3xl shadow-glass-lg flex flex-col h-[78vh] h-[calc(100dvh-5.5rem)] border-t border-white/80 dark:border-slate-700/80 m3-bottom-sheet m3-sheet-enter"
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
            <div className="pointer-events-none">
              <Group gap={8} align="baseline" wrap="nowrap">
                <Title order={2} fz={20} fw={800} className="tracking-tight">
                  {activeStation.name}駅
                </Title>
                <Text fz="xs" c="dimmed">
                  {activeStation.nameKana}
                </Text>
              </Group>
              <Text fz={11} c="dimmed" className="font-english">
                {activeStation.nameEn} Station
              </Text>
            </div>

            {/* 閉じるボタン（Mantine CloseButton） */}
            <CloseButton
              size="lg"
              radius="xl"
              variant="default"
              onClick={(e) => {
                e.stopPropagation();
                handleClose(false);
              }}
              aria-label="閉じる"
              className="pointer-events-auto"
            />
          </Group>
        </div>

        {/* コンテンツ領域 */}
        <div ref={contentRef} className="flex-1 min-h-0 p-3.5 pb-8 overflow-y-auto space-y-4 overscroll-contain">
          <StationSheetContent
            station={activeStation}
            selectedTrain={selectedTrain}
            onSelectTrain={handleSelectTrain}
          />
        </div>

        {/* シート引き上げ時の下端隙間防止エクステンション */}
        <div className="absolute top-full inset-x-0 h-[120px] pointer-events-none glass-surface-strong" aria-hidden="true" />
      </div>
    </div>
  );
};
