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
 * 電光掲示板 専用全画面・横画面コンポーネント
 * Fullscreen API（ブラウザのアドレスバー・ステータスバー非表示）に対応。
 * YouTubeのように端末を縦持ち・横持ちどちらで持っても常に横画面として最大表示。
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
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
    isPortrait: boolean;
    scale: number;
  }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 800,
    height: typeof window !== 'undefined' ? window.innerHeight : 600,
    isPortrait: false,
    scale: 1,
  });

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

    const updateLayout = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const portrait = h > w;

      // 横画面としての長辺（横幅）と短辺（縦幅）
      const landscapeW = Math.max(w, h);
      const landscapeH = Math.min(w, h);

      const baseWidth = STATION_BOARD_BASE_WIDTHS[stationId] || 400;

      // ボードの高さ（DOM計測、未描画時は概算120px）
      let bHeight = 120;
      if (boardRef.current && boardRef.current.offsetHeight > 0) {
        bHeight = boardRef.current.offsetHeight;
      }

      // 画面の上下左右に安全マージン（約6%）を確保して最大相似拡大
      const scaleByWidth = (landscapeW * 0.94) / baseWidth;
      const scaleByHeight = (landscapeH * 0.88) / bHeight;
      const targetScale = Math.min(scaleByWidth, scaleByHeight);

      setDimensions({
        width: w,
        height: h,
        isPortrait: portrait,
        scale: Math.max(targetScale, 0.5),
      });
    };

    updateLayout();
    const timer = setTimeout(updateLayout, 60);

    window.addEventListener('resize', updateLayout);
    window.addEventListener('orientationchange', updateLayout);

    // キーボード Esc 対応
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // ブラウザのネイティブ全画面解除（Android戻るボタンやジェスチャー）との連動
    let hasEnteredFullscreen = !!document.fullscreenElement;
    const handleFullscreenChange = () => {
      if (document.fullscreenElement) {
        hasEnteredFullscreen = true;
        updateLayout();
      } else if (hasEnteredFullscreen) {
        // ネイティブ全画面から抜けた場合は閉じる
        onClose();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateLayout);
      window.removeEventListener('orientationchange', updateLayout);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [isOpen, stationId, onClose, handleClose]);

  if (!isOpen) return null;

  const baseWidth = STATION_BOARD_BASE_WIDTHS[stationId] || 400;
  const landscapeW = Math.max(dimensions.width, dimensions.height);
  const landscapeH = Math.min(dimensions.width, dimensions.height);

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] bg-[#000000] flex items-center justify-center overflow-hidden select-none"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 
        横画面ステージコンテナ:
        - 縦持ち時: 90度回転して画面中央に配置（長辺=landscapeW, 短辺=landscapeH）
        - 横持ち時: 回転なしで画面中央に配置
      */}
      <div
        style={{
          width: `${landscapeW}px`,
          height: `${landscapeH}px`,
          transform: dimensions.isPortrait ? 'rotate(90deg)' : 'none',
          transformOrigin: 'center center',
        }}
        className="relative flex items-center justify-center shrink-0 overflow-hidden"
      >
        {/* 閉じるボタン（横画面内の右上に常時配置・タップで確実に終了） */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          aria-label="全画面表示を閉じる"
          className="absolute top-3 right-3 z-50 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-white flex items-center justify-center backdrop-blur-md transition-colors border border-white/15 cursor-pointer shadow-lg"
        >
          <Icon name="close" size={24} />
        </button>

        {/* 電光掲示板ボード本体（最大スケール） */}
        <div
          ref={boardRef}
          style={{
            width: `${baseWidth}px`,
            transform: `scale(${dimensions.scale})`,
            transformOrigin: 'center center',
          }}
          className="shrink-0 flex items-center justify-center transition-transform duration-150"
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
