import React, { useState, useEffect, useRef } from 'react';
import { Station, DepartureTrain } from '../types';
import { MOCK_DEPARTURES } from '../data/mockData';
import { LedDepartureBoard } from './LedDepartureBoard';
import { TrainVision } from './TrainVision';
import { TransferGuide } from './TransferGuide';
import { FareTable } from './FareTable';
import { Icon } from './Icon';

interface StationDetailSheetProps {
  station: Station | null;
  onClose: () => void;
}

export const StationDetailSheet: React.FC<StationDetailSheetProps> = ({
  station,
  onClose,
}) => {
  const [activeStation, setActiveStation] = useState<Station | null>(station);
  const [isClosing, setIsClosing] = useState(false);
  const [selectedTrain, setSelectedTrain] = useState<DepartureTrain | null>(null);

  const sheetRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // 駅が切り替わったときの初期化処理
  useEffect(() => {
    if (station) {
      setActiveStation(station);
      setIsClosing(false);
      if (sheetRef.current) {
        sheetRef.current.style.transform = '';
        sheetRef.current.style.transition = '';
      }
      if (scrimRef.current) {
        scrimRef.current.style.opacity = '';
        scrimRef.current.style.transition = '';
      }
      const departures = MOCK_DEPARTURES[station.id];
      if (departures?.up?.length) {
        setSelectedTrain(departures.up[0]);
      } else if (departures?.down?.length) {
        setSelectedTrain(departures.down[0]);
      } else {
        setSelectedTrain(null);
      }
    } else {
      setActiveStation(null);
      setIsClosing(false);
    }
  }, [station]);

  // Material 3 準拠の閉じる処理（ボタン・背景タップ時）
  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    if (sheetRef.current) {
      sheetRef.current.style.animation = 'none';
      sheetRef.current.classList.remove('m3-sheet-enter');
      sheetRef.current.style.setProperty('transition', 'transform 240ms cubic-bezier(0.3, 0.0, 0.8, 0.15)', 'important');
      sheetRef.current.style.setProperty('transform', 'translate3d(0, 100%, 0)', 'important');
    }
    if (scrimRef.current) {
      scrimRef.current.style.setProperty('transition', 'opacity 240ms cubic-bezier(0.3, 0.0, 0.8, 0.15)', 'important');
      scrimRef.current.style.setProperty('opacity', '0', 'important');
    }
    setTimeout(() => {
      onClose();
      setActiveStation(null);
      setIsClosing(false);
      if (sheetRef.current) {
        sheetRef.current.style.removeProperty('transform');
        sheetRef.current.style.removeProperty('transition');
        sheetRef.current.style.removeProperty('animation');
      }
      if (scrimRef.current) {
        scrimRef.current.style.removeProperty('opacity');
        scrimRef.current.style.removeProperty('transition');
      }
    }, 250);
  };

  // スワイプによるスムーズな閉じ処理
  const dismissWithSwipe = () => {
    if (isClosing) return;
    setIsClosing(true);
    if (sheetRef.current) {
      sheetRef.current.style.animation = 'none';
      sheetRef.current.classList.remove('m3-sheet-enter');
      sheetRef.current.style.setProperty('transition', 'transform 220ms cubic-bezier(0.3, 0.0, 0.8, 0.15)', 'important');
      sheetRef.current.style.setProperty('transform', 'translate3d(0, 100%, 0)', 'important');
    }
    if (scrimRef.current) {
      scrimRef.current.style.setProperty('transition', 'opacity 220ms cubic-bezier(0.3, 0.0, 0.8, 0.15)', 'important');
      scrimRef.current.style.setProperty('opacity', '0', 'important');
    }
    setTimeout(() => {
      onClose();
      setActiveStation(null);
      setIsClosing(false);
      if (sheetRef.current) {
        sheetRef.current.style.removeProperty('transform');
        sheetRef.current.style.removeProperty('transition');
        sheetRef.current.style.removeProperty('animation');
      }
      if (scrimRef.current) {
        scrimRef.current.style.removeProperty('opacity');
        scrimRef.current.style.removeProperty('transition');
      }
    }, 230);
  };

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
      if (!isTouching) return;
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

    // ヘッダーでの操作（Touch Eventsフォールバック）
    const onHeaderTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
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
      if (!isTouching || e.touches.length !== 1) return;
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

    const onContentTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      contentStartY = e.touches[0].clientY;
      lastY = contentStartY;
      lastTime = Date.now();
      isContentPulling = false;
    };

    const onContentTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
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

    if (header) {
      header.addEventListener('pointerdown', onPointerDown);
      header.addEventListener('pointermove', onPointerMove);
      header.addEventListener('pointerup', onPointerUp);
      header.addEventListener('pointercancel', onPointerUp);

      header.addEventListener('touchstart', onHeaderTouchStart, { passive: true });
      header.addEventListener('touchmove', onHeaderTouchMove, { passive: false });
      header.addEventListener('touchend', onHeaderTouchEnd, { passive: true });
      header.addEventListener('touchcancel', onHeaderTouchEnd, { passive: true });
    }

    if (content) {
      content.addEventListener('touchstart', onContentTouchStart, { passive: true });
      content.addEventListener('touchmove', onContentTouchMove, { passive: false });
      content.addEventListener('touchend', onContentTouchEnd, { passive: true });
      content.addEventListener('touchcancel', onContentTouchEnd, { passive: true });
    }

    return () => {
      if (header) {
        header.removeEventListener('pointerdown', onPointerDown);
        header.removeEventListener('pointermove', onPointerMove);
        header.removeEventListener('pointerup', onPointerUp);
        header.removeEventListener('pointercancel', onPointerUp);

        header.removeEventListener('touchstart', onHeaderTouchStart);
        header.removeEventListener('touchmove', onHeaderTouchMove);
        header.removeEventListener('touchend', onHeaderTouchEnd);
        header.removeEventListener('touchcancel', onHeaderTouchEnd);
      }
      if (content) {
        content.removeEventListener('touchstart', onContentTouchStart);
        content.removeEventListener('touchmove', onContentTouchMove);
        content.removeEventListener('touchend', onContentTouchEnd);
        content.removeEventListener('touchcancel', onContentTouchEnd);
      }
    };
  }, [activeStation, isClosing]);

  if (!activeStation) return null;

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end pt-[calc(env(safe-area-inset-top,0px)+3.5rem)] overflow-hidden">
      {/* 背景オーバーレイ（M3 Scrim フェードイン・アウト） */}
      <div
        ref={scrimRef}
        className={`fixed inset-0 bg-black/45 backdrop-blur-[2px] ${
          isClosing ? 'm3-scrim-exit' : 'm3-scrim-enter'
        }`}
        onClick={handleClose}
      />

      {/* ボトムシート（URLバー被りを防ぐ安全マージン確保・M3 Emphasized スライドアップ・ダウン）
          ※底面に画面外180px分の実コンテンツ延長枠を持たせ、上に引っ張ったときに下のコンテンツが自然に現れる設計 */}
      <div
        ref={sheetRef}
        onAnimationEnd={() => {
          if (sheetRef.current) {
            sheetRef.current.classList.remove('m3-sheet-enter');
          }
        }}
        className={`relative z-50 w-full max-w-md mx-auto bg-slate-100 rounded-t-3xl shadow-2xl flex flex-col h-[calc(78vh+180px)] h-[calc(100dvh-5.5rem+180px)] -mb-[180px] border-t border-slate-300 ${
          isClosing ? 'm3-sheet-exit' : 'm3-sheet-enter'
        }`}
      >
        {/* シートヘッダー（ドラッグ／下スワイプで閉じられる領域） */}
        <div
          ref={headerRef}
          className="pt-2 pb-3 px-4 bg-white rounded-t-3xl border-b border-slate-200/90 shrink-0 touch-none select-none cursor-grab active:cursor-grabbing"
        >
          {/* ドラッグハンドルバー */}
          <div
            className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-2 pointer-events-none"
          />

          <div className="flex items-center justify-between">
            <div className="pointer-events-none">
              <div className="flex items-baseline gap-2">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  {activeStation.name}駅
                </h2>
                <span className="text-xs text-slate-400 font-normal">
                  {activeStation.nameKana}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                {activeStation.nameEn} Station
              </p>
            </div>

            {/* 閉じるボタン */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-500 flex items-center justify-center transition-colors cursor-pointer pointer-events-auto"
              aria-label="閉じる"
            >
              <Icon name="close" size={18} />
            </button>
          </div>
        </div>

        {/* コンテンツ領域 */}
        <div ref={contentRef} className="p-3.5 overflow-y-auto space-y-4 overscroll-contain">
          {/* ① 発車案内 */}
          <section>
            <div className="text-xs font-bold text-slate-700 mb-1.5 px-0.5">
              発車案内
            </div>
            <LedDepartureBoard
              stationId={activeStation.id}
              selectedTrain={selectedTrain}
              onSelectTrain={setSelectedTrain}
            />
          </section>

          {/* ② 階段・改札口案内 */}
          <section>
            <div className="text-xs font-bold text-slate-700 mb-1.5 px-0.5">
              階段・改札口案内
            </div>
            <TrainVision
              station={activeStation}
              selectedTrain={selectedTrain}
            />
          </section>

          {/* ③ 乗り換え案内 */}
          <section>
            <div className="text-xs font-bold text-slate-700 mb-1.5 px-0.5">
              接続路線・バス
            </div>
            <TransferGuide station={activeStation} />
          </section>

          {/* ④ 運賃一覧 */}
          <section className="pb-4">
            <div className="text-xs font-bold text-slate-700 mb-1.5 px-0.5">
              きっぷ・IC運賃表
            </div>
            <FareTable currentStation={activeStation} />
          </section>

          {/* 最下部スクロール時の余白（最下部までスクロールして上に引っ張ったときは同色背景が自然に追従） */}
          <div className="h-48 pb-safe bg-slate-100" />
        </div>
      </div>
    </div>
  );
};
