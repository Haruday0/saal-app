import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CloseButton } from '@heroui/react';
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
 * 端末を縦持ちしている時も長辺（縦の高さ）をフルに使って90度回転・最大化表示。
 * 横持ち時には回転なしで画面幅いっぱいに最大化表示。
 * screen.orientation.lockは使用せず、安全かつ確実に画面全体に最大フィット。
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
  const [layout, setLayout] = useState<{
    isPortrait: boolean;
    scale: number;
    stageW: number;
    stageH: number;
  }>({
    isPortrait: false,
    scale: 1,
    stageW: typeof window !== 'undefined' ? window.innerWidth : 800,
    stageH: typeof window !== 'undefined' ? window.innerHeight : 600,
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

      // 画面の長辺を横幅、短辺を縦幅として常に最大領域を確保
      const landscapeW = Math.max(w, h);
      const landscapeH = Math.min(w, h);

      const baseWidth = STATION_BOARD_BASE_WIDTHS[stationId] || 400;

      let bHeight = 130;
      if (boardRef.current && boardRef.current.offsetHeight > 0) {
        bHeight = boardRef.current.offsetHeight;
      }

      // 横画面基準で上下左右に安全マージン（横6%、縦10%）を確保して最大相似拡大
      const scaleW = (landscapeW * 0.94) / baseWidth;
      const scaleH = (landscapeH * 0.90) / bHeight;
      const target = Math.min(scaleW, scaleH);
      const rounded = Math.round(Math.max(target, 0.4) * 100) / 100;

      setLayout((prev) => {
        if (
          prev.isPortrait === portrait &&
          prev.stageW === landscapeW &&
          prev.stageH === landscapeH &&
          Math.abs(prev.scale - rounded) < 0.01
        ) {
          return prev;
        }
        return {
          isPortrait: portrait,
          scale: rounded,
          stageW: landscapeW,
          stageH: landscapeH,
        };
      });
    };

    updateLayout();
    const timer = setTimeout(updateLayout, 80);

    window.addEventListener('resize', updateLayout);
    window.addEventListener('orientationchange', updateLayout);

    // キーボード Esc 対応
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateLayout);
      window.removeEventListener('orientationchange', updateLayout);
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
      {/* 
        横画面ステージコンテナ:
        - 縦持ち時（portrait）: 幅landscapeW, 高さlandscapeH で 90度回転。画面の縦の長さを横幅としてフル活用
        - 横持ち時（landscape）: 幅landscapeW, 高さlandscapeH で 回転なし。画面の横幅をフル活用
      */}
      <div
        style={{
          width: `${layout.stageW}px`,
          height: `${layout.stageH}px`,
          transform: layout.isPortrait ? 'rotate(90deg)' : 'none',
          transformOrigin: 'center center',
        }}
        className="relative flex items-center justify-center shrink-0 overflow-hidden"
      >
        {/* 閉じるボタン（横画面ステージ内の右上に常時配置・タップで確実に終了） */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute top-4 right-4 z-50"
        >
          <CloseButton
            onPress={handleClose}
            aria-label="全画面表示を閉じる"
            className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-white flex items-center justify-center backdrop-blur-md transition-colors border border-white/15 cursor-pointer shadow-lg"
          >
            <Icon name="close" size={24} />
          </CloseButton>
        </div>

        {/* 電光掲示板ボード本体（最大スケール表示） */}
        <div
          ref={boardRef}
          style={{
            width: `${baseWidth}px`,
            transform: `scale(${layout.scale})`,
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
      </div>
    </div>,
    document.body
  );
};
