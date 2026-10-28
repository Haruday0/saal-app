import React, { useMemo } from 'react';
import dotFonts from '../data/dotFonts.json';
import stationLedData from '../data/stationLedData.json';

export type DigitFontScope = 'nagamachi' | 'sendai' | 'minami-sendai' | 'sat';

export interface FontDefinition {
  stationType?: string;
  width?: number;
  height?: number;
  colonWidth?: number;
  characters?: Record<string, string[]>;
}

export interface DotLedTextProps {
  text: string;
  stationId?: string;
  className?: string;
  targetWidth?: number; // 枠全体のドット幅（指定時は中央揃え配置）
  fallback?: React.ReactNode;
  /** 描画スタイル: 'rounded' (実機高密度角丸LED素子・推奨デフォルト) | 'circle' (円形LED素子) */
  variant?: 'circle' | 'rounded';
  /** 角丸素子の角丸半径 / 円形LED半径 (variant='rounded'時: 0.20, variant='circle'時: 0.41) */
  dotRadius?: number;
  /** 素子のサイズ (variant='rounded'時、デフォルト: 0.94) */
  dotSize?: number;
  /** SVG preserveAspectRatio (デフォルト: "xMidYMid meet") */
  preserveAspectRatio?: string;
}

/**
 * 駅IDから対応する数字フォントスコープを取得
 * - nagamachi: 長町・太子堂・名取
 * - sendai: 仙台（コンコース・時刻96dot）
 * - minami-sendai: 南仙台（小型モジュール・時刻3文字幅）
 * - sat: 杜せきのした・美田園・仙台空港
 */
export function getDigitFontScope(stationId?: string): DigitFontScope | null {
  if (!stationId) return null;
  const s = stationId.trim().toLowerCase();

  if (
    s === 'nagamachi' || s === '長町' ||
    s === 'taishido' || s === '太子堂' ||
    s === 'natori' || s === '名取'
  ) {
    return 'nagamachi';
  }

  if (s === 'sendai' || s === '仙台') {
    return 'sendai';
  }

  if (s === 'minami-sendai' || s === '南仙台' || s === 'minamisendai') {
    return 'minami-sendai';
  }

  if (
    s === 'sat' ||
    s === 'morisekinoshita' || s === '杜せきのした' || s === 'moriseki' ||
    s === 'mitazono' || s === '美田園' ||
    s === 'sendai-airport' || s === '仙台空港' || s === 'airport'
  ) {
    return 'sat';
  }

  return null;
}

/**
 * 指定駅の数字フォント定義を取得する。未定義または空の場合は null を返す。
 */
export function getStationDigitFont(stationId?: string): FontDefinition | null {
  const scope = getDigitFontScope(stationId);
  if (!scope) return null;

  // 1. 新統合データ stationLedData.json から優先検索
  const unified = stationLedData as Record<string, any>;
  const uObj = unified[scope];
  if (
    uObj &&
    uObj.digits &&
    typeof uObj.digits === 'object' &&
    Object.keys(uObj.digits).length > 0
  ) {
    return {
      stationType: scope,
      width: uObj.digitWidth || 16,
      height: 24,
      colonWidth: uObj.colonWidth || 7,
      characters: uObj.digits,
    };
  }

  // 2. 従来データ dotFonts.json からフォールバック
  const data = dotFonts as Record<string, any>;
  const fontObj = data[scope];
  if (
    fontObj &&
    fontObj.characters &&
    typeof fontObj.characters === 'object' &&
    Object.keys(fontObj.characters).length > 0
  ) {
    return fontObj as FontDefinition;
  }
  return null;
}

/**
 * 発車標の時刻文字列を実機仕様に合わせて正規化する。
 * 0時〜9時の1桁時刻の場合、先頭に半角スペースを付与して5文字幅（右揃え）にする。
 * 例: "6:27" -> " 6:27", "06:27" -> " 6:27", "16:35" -> "16:35"
 */
export function formatDepartureTime(timeStr?: string): string {
  if (!timeStr) return '';
  const trimmed = timeStr.trim();
  const match = trimmed.match(/^(?:0?([0-9]))(:[0-9]{2})$/);
  if (match) {
    return ` ${match[1]}${match[2]}`;
  }
  return trimmed;
}

/**
 * 対象駅に数字フォント（または指定テキストの全文字）が定義されているか判定
 */
export function hasDotFont(stationId?: string, text?: string): boolean {
  const font = getStationDigitFont(stationId);
  if (!font || !font.characters || Object.keys(font.characters).length === 0) {
    return false;
  }
  if (text) {
    const formatted = text.includes(':') ? formatDepartureTime(text) : text;
    for (const ch of formatted) {
      if (ch === ' ' || ch === '\u2007') continue;
      if (!font.characters[ch]) return false;
    }
  }
  return true;
}

export const DotLedText: React.FC<DotLedTextProps> = ({
  text,
  stationId,
  className = '',
  targetWidth,
  fallback,
  variant = 'rounded',
  dotRadius,
  dotSize = 0.94,
  preserveAspectRatio = 'xMidYMid meet',
}) => {
  const font = useMemo(() => getStationDigitFont(stationId), [stationId]);

  const formattedText = useMemo(() => {
    if (text && text.includes(':')) {
      return formatDepartureTime(text);
    }
    return text;
  }, [text]);

  const parsed = useMemo(() => {
    if (!font || !font.characters) {
      return null;
    }

    const charMap = font.characters;
    const defaultWidth = font.width || 16;
    const height = font.height || 24;

    // 全文字が存在するか検証
    for (const ch of formattedText) {
      if (ch === ' ' || ch === '\u2007') continue;
      if (!charMap[ch]) {
        return null;
      }
    }

    let currentX = 0;
    const fullPaths: string[] = [];
    const halfPaths: string[] = [];

    const scope = getDigitFontScope(stationId);
    const letterSpacing = scope === 'sendai' ? 1 : 0;

    // 先頭スペースのオフセット処理（数字1文字分 + 隙間1dot）
    const trimmed = formattedText.replace(/^\s+/, (spaces) => {
      currentX += spaces.length * (defaultWidth + letterSpacing);
      return '';
    });

    const isCircle = variant === 'circle';
    const effectiveRadius = dotRadius ?? (isCircle ? 0.41 : 0.18);
    const r = Math.min(Math.max(effectiveRadius, 0.05), 0.48);
    const d = 2 * r;
    const s = Math.min(Math.max(dotSize, 0.4), 0.98);
    const rx = Math.min(r, s / 3);
    const p = (1.0 - s) / 2;
    const edge = s - 2 * rx;

    const renderDot = (x: number, y: number): string => {
      if (isCircle) {
        const cx = x + 0.5;
        const cy = y + 0.5;
        return (
          `M${(cx - r).toFixed(2)} ${cy.toFixed(2)}` +
          `a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${d.toFixed(2)} 0` +
          `a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 -${d.toFixed(2)} 0z`
        );
      } else {
        // 実機高密度角丸素子 (size: 0.94, rx: 0.18)
        const x0 = x + p;
        const y0 = y + p;
        return (
          `M${(x0 + rx).toFixed(2)} ${y0.toFixed(2)}` +
          `h${edge.toFixed(2)}` +
          `a${rx.toFixed(2)} ${rx.toFixed(2)} 0 0 1 ${rx.toFixed(2)} ${rx.toFixed(2)}` +
          `v${edge.toFixed(2)}` +
          `a${rx.toFixed(2)} ${rx.toFixed(2)} 0 0 1 -${rx.toFixed(2)} ${rx.toFixed(2)}` +
          `h-${edge.toFixed(2)}` +
          `a${rx.toFixed(2)} ${rx.toFixed(2)} 0 0 1 -${rx.toFixed(2)} -${rx.toFixed(2)}` +
          `v-${edge.toFixed(2)}` +
          `a${rx.toFixed(2)} ${rx.toFixed(2)} 0 0 1 ${rx.toFixed(2)} -${rx.toFixed(2)}z`
        );
      }
    };

    for (let i = 0; i < trimmed.length; i++) {
      const ch = trimmed[i];
      if (ch === ' ' || ch === '\u2007') {
        currentX += defaultWidth;
        continue;
      }

      const grid = charMap[ch];
      if (!grid) {
        currentX += defaultWidth;
        continue;
      }

      const w = grid[0]?.length || defaultWidth;

      // 【高密度角丸LED素子 ＆ 多階調（全点灯/半点灯）レンダリング】
      // # = 全点灯 (100%発光)
      // + or * = 半点灯 (PWM調光 約48%減光、アンチエイリアス曲線用)
      for (let y = 0; y < grid.length; y++) {
        const row = grid[y];
        for (let x = 0; x < w; x++) {
          const char = row[x];
          if (char === '#') {
            fullPaths.push(renderDot(currentX + x, y));
          } else if (char === '+' || char === '*') {
            halfPaths.push(renderDot(currentX + x, y));
          }
        }
      }
      currentX += w;
      if (i < trimmed.length - 1) {
        currentX += letterSpacing;
      }
    }

    return {
      totalWidth: currentX,
      height,
      fullPathData: fullPaths.join(''),
      halfPathData: halfPaths.join(''),
    };
  }, [text, font, variant, dotRadius, dotSize]);

  if (!parsed) {
    return fallback ? <>{fallback}</> : null;
  }

  const { totalWidth, height, fullPathData, halfPathData } = parsed;
  const viewWidth = targetWidth || totalWidth || 71;
  const offsetX = targetWidth ? Math.max(0, (targetWidth - totalWidth) / 2) : 0;

  return (
    <svg
      viewBox={`0 0 ${viewWidth} ${height}`}
      preserveAspectRatio={preserveAspectRatio}
      className={`block fill-current ${className}`}
      shapeRendering="geometricPrecision"
      aria-label={text}
    >
      <g transform={offsetX > 0 ? `translate(${offsetX}, 0)` : undefined}>
        <path d={fullPathData} fill="currentColor" />
        {halfPathData ? (
          <path d={halfPathData} fill="currentColor" opacity="0.5" />
        ) : null}
      </g>
    </svg>
  );
};

export default DotLedText;
export { DotLedBitmap, getDestinationDots, hasDestinationDots } from './DotLedBitmap';
