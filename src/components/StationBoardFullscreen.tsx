import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { DepartureTrain, DirectionType } from '../types';
import { StationBoard, STATION_BOARD_BASE_WIDTHS } from './StationBoard';
import { Icon } from './Icon';

export interface StationBoardFullscreenProps {
  isOpen: boolean;
  onClose: () => void;
  stationId: string;
  direction?: DirectionType;
  track?: string;
  trains: DepartureTrain[];
  selectedTrain?: DepartureTrain | null;
  onSelectTrain?: (train: DepartureTrain) => void;
  noticeText?: string;
}

/**
 * 電光掲示板（StationBoard）専用の全画面・横画面モーダル
 * 背景は純黒（#000000）で電光掲示板のみを最大化表示。
 * スマホが縦向きの場合は自動で90度回転（landscape化）し、
 * 横向きの場合はそのまま画面全体へアスペクト比を維持して最大フィット。
 */
export const StationBoardFullscreen: React.FC<StationBoardFullscreenProps> = ({
  isOpen,
  onClose,
  stationId,
  direction,
  track,
  trains,
  selectedTrain,
  onSelectTrain,
  noticeText,
}) => {
  const boardRef = useRef<HTMLDivElement>(null);
  const [isPortrait, setIsPortrait] = useState<boolean>(false);
  const [scale, setScale] = useState<number>(1);
  const [showControls, setShowControls] = useState<boolean>(true);
  const hideControlsTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Fullscreen API & Screen Orientation Lock (ブラウザサポート時)
    try {
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      if (screen.orientation && (screen.orientation as any).lock) {
        (screen.orientation as any).lock('landscape').catch(() => {});
      }
    } catch (_) {}

    const calculateLayout = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const portrait = h > w;
      setIsPortrait(portrait);

      // 横画面表示としての有効寸法（縦持ち時は h が横幅、w が縦幅になる）
      const effectiveWidth = portrait ? h : w;
      const effectiveHeight = portrait ? w : h;

      const baseWidth = STATION_BOARD_BASE_WIDTHS[stationId] || 400;

      // ボードの高さ（DOM計測、未描画時は概算120px）
      let bHeight = 120;
      if (boardRef.current) {
        const measured = boardRef.current.offsetHeight;
        if (measured > 0) bHeight = measured;
      }

      // 画面の上下左右に安全マージンを確保して相似拡大
      const scaleByWidth = (effectiveWidth * 0.94) / baseWidth;
      const scaleByHeight = (effectiveHeight * 0.88) / bHeight;
      const targetScale = Math.min(scaleByWidth, scaleByHeight);

      setScale(Math.max(targetScale, 0.5));
    };

    calculateLayout();
    const timer = setTimeout(calculateLayout, 60);

    window.addEventListener('resize', calculateLayout);
    window.addEventListener('orientationchange', calculateLayout);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // 4秒後に閉じるボタンを自動フェードアウト（タップで再表示）
    setShowControls(true);
    hideControlsTimerRef.current = setTimeout(() => {
      setShowControls(false);
    }, 4000);

    return () => {
      clearTimeout(timer);
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current);
      }
      window.removeEventListener('resize', calculateLayout);
      window.removeEventListener('orientationchange', calculateLayout);
      window.removeEventListener('keydown', handleKeyDown);

      // Fullscreen解除
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
        if (screen.orientation && (screen.orientation as any).unlock) {
          (screen.orientation as any).unlock();
        }
      } catch (_) {}
    };
  }, [isOpen, stationId, onClose]);

  const handleScreenTap = () => {
    // 画面タップでコントロールの表示/非表示をトグル
    setShowControls((prev) => {
      const next = !prev;
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current);
      }
      if (next) {
        hideControlsTimerRef.current = setTimeout(() => {
          setShowControls(false);
        }, 4000);
      }
      return next;
    });
  };

  if (!isOpen) return null;

  const baseWidth = STATION_BOARD_BASE_WIDTHS[stationId] || 400;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-[#000000] flex items-center justify-center overflow-hidden select-none animate-in fade-in duration-200"
      onClick={handleScreenTap}
    >
      {/* 閉じるボタン（Material 3 シンプルな丸型半透明アイコンボタン） */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        style={{
          top: 'max(1rem, env(safe-area-inset-top, 1rem))',
          right: 'max(1rem, env(safe-area-inset-right, 1rem))',
        }}
        aria-label="全画面表示を閉じる"
        className={`fixed z-[10000] w-11 h-11 rounded-full bg-neutral-900/80 hover:bg-neutral-800 text-white/90 hover:text-white flex items-center justify-center backdrop-blur-md transition-all duration-300 border border-white/10 shadow-lg ${
          showControls ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
        }`}
      >
        <Icon name="close" size={22} />
      </button>

      {/* 横画面回転＆相似拡大コンテナ */}
      <div
        style={{
          transform: isPortrait ? 'rotate(90deg)' : 'none',
          transformOrigin: 'center center',
          width: isPortrait ? '100dvh' : '100dvw',
          height: isPortrait ? '100dvw' : '100dvh',
        }}
        className="flex items-center justify-center pointer-events-none"
      >
        <div
          ref={boardRef}
          style={{
            width: `${baseWidth}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
          }}
          className="shrink-0 flex items-center justify-center transition-transform duration-150 pointer-events-auto shadow-2xl"
          onClick={(e) => {
            // ボード自体のタップでもコントロールトグルを発火
            e.stopPropagation();
            handleScreenTap();
          }}
        >
          <StationBoard
            stationId={stationId}
            direction={direction}
            track={track}
            trains={trains}
            selectedTrain={selectedTrain}
            onSelectTrain={onSelectTrain}
            noticeText={noticeText}
          />
        </div>
      </div>
    </div>,
    document.body
  );
};
