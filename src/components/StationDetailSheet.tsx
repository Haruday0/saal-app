import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Station, DepartureTrain } from '../types';
import { LedDepartureBoard } from './LedDepartureBoard';
import { TrainVision } from './TrainVision';
import { TransferGuide } from './TransferGuide';
import { FareTable } from './FareTable';
import { JisStairs } from './icons';
import { Icon } from './Icon';
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
      <div className="h-48 pb-safe bg-transparent" />
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

  // Material 3 準拠のスムーズな閉じる処理（ボタンタップ・背景タップ・スワイプ共通）
  // React state を更新せず DOM の transform/opacity のみを直接起動することで、
  // 閉じる 260ms の間、メインスレッド JS 実行を完全 0ms にし GPU コンポジター単独で 60fps/120fps 化
  const handleClose = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    const sheet = sheetRef.current;
    const scrim = scrimRef.current;

    // M3 Emphasized Accelerate（cubic-bezier(0.3, 0.0, 0.8, 0.15)・260ms / scrim 240ms）で画面外へスライド
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

    // transitionend が万一発火しない場合の完全同期フォールバック（260ms完了後20msバッファの280ms）
    closeTimeoutRef.current = setTimeout(() => {
      cleanup();
    }, 280);
  }, [onClose]);

  // スワイプ終了時も同一の滑らかな handleClose に統合
  const dismissWithSwipe = handleClose;

  // ポインター・タッチ連動による「指に吸い付く」自由ドラッグ・スワイプ連動処理
  useEffect(() => {
    const header = headerRef.current;
    const content = contentRef.current;
    const sheet = sheetRef.current;
    if (!sheet || !activeStation) return;

    let isTouching = false;
    let startY = 0;
    let lastY = 0;
    let lastTime = 0;
    let currentDeltaY = 0;
    let velocity = 0;

    // 可視領域のシート高さを取得（画面外の180px延長部を除く）
    const getVisibleSheetHeight = () => {
      const totalH = sheet.offsetHeight || window.innerHeight * 0.75;
      return Math.max(300, totalH - 180);
    };

    // シート全体の可視高さに対する比率（%）で判定するヘルパー
    // ・ゆっくり操作時：シート高さの約 18%（スマホで約90〜115px）以上引き下げたら閉じる（それ未満は上に戻る）
    // ・素早いフリック時：わずか 5%（約25〜30px）でも下向きに勢いよく払えば閉じる
    const checkShouldDismiss = (delta: number, vel: number) => {
      const visibleH = getVisibleSheetHeight();
      const distanceThreshold = visibleH * 0.18;
      const flickThreshold = Math.max(25, visibleH * 0.05);
      return delta > distanceThreshold || (delta > flickThreshold && vel > 0.3);
    };

    // ヘッダーでの操作開始（Pointer Events）
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
        // 上に引っ張ったときは最大100pxまで弾性抵抗で引き上げ（画面外の180pxコンテンツが自然に現れる）
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

    // ヘッダーでの操作（Touch Eventsレガシーフォールバック）
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

    // コンテンツ領域でのプルダウン連動（最上部で下向きにスワイプしたときにシート連動）
    let isContentPulling = false;
    let contentStartY = 0;
    let isTouchOnScrollableChild = false;

    const onContentTouchStart = (e: TouchEvent) => {
      if (isClosingRef.current || e.touches.length !== 1) return;
      const target = e.target as HTMLElement | null;
      // 時刻表リスト（data-scrollable="true"）内部でのタッチ時のみ、シートのプルダウン判定を無効化
      if (target?.closest('[data-scrollable="true"]')) {
        isTouchOnScrollableChild = true;
        isContentPulling = false;
        return;
      }
      isTouchOnScrollableChild = false;
      contentStartY = e.touches[0].clientY;
      lastY = contentStartY;
      lastTime = Date.now();
      isContentPulling = false;
    };

    const onContentTouchMove = (e: TouchEvent) => {
      if (isClosingRef.current || isTouchOnScrollableChild || e.touches.length !== 1) return;
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
      isTouchOnScrollableChild = false;
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

    // window.PointerEvent をサポートしている環境では PointerEvent のみを使用し、
    // TouchEvent との重複登録・二重スタイル計算・メインスレッド過負荷を完全に防止
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
  }, [activeStation, handleClose]);

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
        onClick={handleClose}
      />

      {/* ボトムシート（sendai-bus-map-v2 #bottom-panel 準拠のガラスサーフェス仕様）
          ※底面に画面外180px分の実コンテンツ延長枠を持たせ、上に引っ張ったときに下のコンテンツが自然に現れる設計 */}
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
                handleClose();
              }}
              aria-label="閉じる"
              className="pointer-events-auto"
            />
          </Group>
        </div>

        {/* コンテンツ領域 */}
        <div ref={contentRef} className="p-3.5 overflow-y-auto space-y-4 overscroll-contain">
          <StationSheetContent
            station={activeStation}
            selectedTrain={selectedTrain}
            onSelectTrain={handleSelectTrain}
          />
        </div>
      </div>
    </div>
  );
};
