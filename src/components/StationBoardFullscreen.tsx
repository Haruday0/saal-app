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
 * 端末を縦持ち・横持ちどちらで持っていても、YouTubeのように確実に横画面として最大表示。
 * 画面回転やサイズ判定を100% CSSメディアクエリに委ねることで、JSのイベントループ・点滅・反復フリップを完全に防止。
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
      // 端末の向きに関わらず、長辺を横幅・短辺を縦幅として取得
      // これにより縦横回転時もavailWとavailHが変わらず、スケール計算が振動しない
      const w = window.innerWidth;
      const h = window.innerHeight;
      const availW = Math.max(w, h);
      const availH = Math.min(w, h);

      const baseWidth = STATION_BOARD_BASE_WIDTHS[stationId] || 400;
      let bHeight = 130;
      if (boardRef.current && boardRef.current.offsetHeight > 0) {
        bHeight = boardRef.current.offsetHeight;
      }

      // 上下左右に安全マージン（横8%、縦14%）を確保
      const scaleW = (availW * 0.92) / baseWidth;
      const scaleH = (availH * 0.84) / bHeight;
      const target = Math.min(scaleW, scaleH);
      const rounded = Math.round(Math.max(target, 0.4) * 100) / 100;

      setScale((prev) => (Math.abs(prev - rounded) > 0.01 ? rounded : prev));
    };

    updateScale();
    const timer = setTimeout(updateScale, 80);

    window.addEventListener('resize', updateScale);

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
        純粋なCSSによる横画面ステージ制御:
        縦持ち（portrait）時は 100dvh × 100dvw で 90度回転
        横持ち（landscape）時は 100dvw × 100dvh で 回転なし
        JSステートを介さないため、端末回転時も点滅やループが物理的に発生しない
      */}
      <style>{`
        .saal-fs-stage {
          width: 100dvw;
          height: 100dvh;
          transform: none;
          transform-origin: center center;
        }
        @media (orientation: portrait) {
          .saal-fs-stage {
            width: 100dvh !important;
            height: 100dvw !important;
            transform: rotate(90deg) !important;
            transform-origin: center center !important;
          }
        }
      `}</style>

      <div className="saal-fs-stage relative flex items-center justify-center shrink-0 overflow-hidden">
        {/* 閉じるボタン（横画面ステージ内の右上に常時配置・タップで確実に終了） */}
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

        {/* 電光掲示板ボード本体（最大スケール） */}
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
      </div>
    </div>,
    document.body
  );
};
