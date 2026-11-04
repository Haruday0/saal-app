import React, { useState, useEffect, useRef, useCallback } from 'react';
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
 * 電光掲示板 専用全画面表示コンポーネント
 * 画面の向きの強制固定は行わず、端末の自然な向きに合わせて全画面最大表示。
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
  const [scale, setScale] = useState<number>(1);

  // 安全に全画面を終了するハンドラー
  const handleClose = useCallback(() => {
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    } catch (_) {}
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const updateScale = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const baseWidth = STATION_BOARD_BASE_WIDTHS[stationId] || 400;

      let bHeight = 130;
      if (boardRef.current && boardRef.current.offsetHeight > 0) {
        bHeight = boardRef.current.offsetHeight;
      }

      // 上下左右に安全マージン（横8%、縦14%）を確保して画面いっぱいに相似拡大
      const scaleW = (w * 0.92) / baseWidth;
      const scaleH = (h * 0.86) / bHeight;
      const target = Math.min(scaleW, scaleH);
      const rounded = Math.round(Math.max(target, 0.4) * 100) / 100;

      setScale((prev) => (Math.abs(prev - rounded) > 0.01 ? rounded : prev));
    };

    updateScale();
    const timer = setTimeout(updateScale, 80);

    window.addEventListener('resize', updateScale);
    window.addEventListener('orientationchange', updateScale);

    // キーボード Esc 対応
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateScale);
      window.removeEventListener('orientationchange', updateScale);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, stationId, handleClose]);

  if (!isOpen) return null;

  const baseWidth = STATION_BOARD_BASE_WIDTHS[stationId] || 400;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] bg-[#000000] flex items-center justify-center overflow-hidden select-none"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 閉じるボタン（右上に常時配置・タップで確実に終了） */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleClose();
        }}
        aria-label="全画面表示を閉じる"
        className="absolute top-4 right-4 z-50 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-white flex items-center justify-center backdrop-blur-md transition-colors border border-white/15 cursor-pointer shadow-lg"
      >
        <Icon name="close" size={24} />
      </button>

      {/* 電光掲示板ボード本体（画面サイズに合わせて最大フィット） */}
      <div
        ref={boardRef}
        style={{
          width: `${baseWidth}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
        className="shrink-0 flex items-center justify-center"
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
    </div>,
    document.body
  );
};
