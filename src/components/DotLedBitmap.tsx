import React, { useMemo } from 'react';
import dotDestinationsData from '../data/dotDestinations.json';
import stationLedData from '../data/stationLedData.json';

export type DotBitmapObject = {
  dots: string[];
  width?: number;
  height?: number;
};

export type DotBitmapInput = string[] | DotBitmapObject | null | undefined;

export interface DotLedBitmapProps {
  /**
   * ドットパターンの文字列配列（'.' = 消灯, '#' = 全点灯, '+' または '*' = 半点灯）
   * または { dots: string[], width?: number, height?: number } オブジェクト
   */
  dots: DotBitmapInput;
  /** 追加のCSSクラス（例: "h-full w-auto"） */
  className?: string;
  /** 枠全体の目標ドット幅（指定された場合、中央揃えで配置） */
  targetWidth?: number;
  /**
   * 描画スタイル:
   * - 'rounded' (デフォルト): 実機高密度角丸LED素子（充填率約90%で色が濃く鮮明、ドット感を両立）
   * - 'circle': 実機の円形LED砲弾素子
   */
  variant?: 'circle' | 'rounded';
  /** 角丸素子の角丸半径 / 円形LED半径 (variant='rounded'時: 0.20, variant='circle'時: 0.41) */
  dotRadius?: number;
  /** 素子のサイズ (variant='rounded' 時、デフォルト: 0.94, 隙間: 0.06) */
  dotSize?: number;
  /** アクセシビリティ用ラベル */
  ariaLabel?: string;
  /** SVG preserveAspectRatio (デフォルト: "xMidYMid meet") */
  preserveAspectRatio?: string;
}

/** 駅IDエイリアス対応辞書（英語IDと日本語駅名の相互参照） */
export const STATION_KEY_ALIASES: Record<string, string[]> = {
  sendai: ['sendai', '仙台'],
  nagamachi: ['nagamachi', '長町'],
  taishido: ['taishido', '太子堂'],
  'minami-sendai': ['minami-sendai', '南仙台', 'minamisendai'],
  natori: ['natori', '名取'],
  morisekinoshita: ['morisekinoshita', '杜せきのした', 'moriseki'],
  mitazono: ['mitazono', '美田園'],
  'sendai-airport': ['sendai-airport', '仙台空港', 'airport'],
};

/** 半角全角を問わず安全にキーを検索するヘルパー */
function findMatchingEntry(
  dict: Record<string, any> | undefined | null,
  targetKey: string
): any | null {
  if (!dict || !targetKey) return null;
  if (dict[targetKey]) return dict[targetKey];

  // NFKC正規化で検索
  const nfkcKey = targetKey.normalize('NFKC');
  if (dict[nfkcKey]) return dict[nfkcKey];

  // 全角数字に置換して検索
  const fwKey = targetKey.replace(/[0-9]/g, s =>
    String.fromCharCode(s.charCodeAt(0) + 0xfee0)
  );
  if (dict[fwKey]) return dict[fwKey];

  // 半角数字に置換して検索
  const hwKey = targetKey.replace(/[０-９]/g, s =>
    String.fromCharCode(s.charCodeAt(0) - 0xfee0)
  );
  if (dict[hwKey]) return dict[hwKey];

  // 全キーを走査してNFKC一致を検索
  for (const k of Object.keys(dict)) {
    if (k.normalize('NFKC') === nfkcKey) {
      return dict[k];
    }
  }

  return null;
}

/**
 * stationLedData.json または dotDestinations.json から
 * 対象駅・パーツ名に対応するドットデータを取得する
 *
 * 【重要・共通化厳禁ルール】
 * 日本語フォントは以下の3系統に厳格分離され、グループ間の相互流用・共通化は一切行いません:
 * 1. 長町・太子堂・名取型 ('nagamachi')
 * 2. 仙台・南仙台型 ('sendai')
 * 3. アクセス線型 ('sat')
 */
export function getDestinationDots(
  stationId?: string,
  destination?: string
): string[] | null {
  if (!destination) return null;
  const cleanDest = destination.trim();
  if (!cleanDest) return null;

  const sId = (stationId || '').trim().toLowerCase();

  // 1. 駅IDから所属するフォント系統を判定（南仙台と仙台は文字幅3/4が異なるため完全分離）
  let groupKey: 'nagamachi' | 'sendai' | 'minami-sendai' | 'sat' | null = null;

  if (['nagamachi', 'taishido', 'natori'].includes(sId)) {
    groupKey = 'nagamachi';
  } else if (sId === 'sendai') {
    groupKey = 'sendai';
  } else if (sId === 'minami-sendai') {
    groupKey = 'minami-sendai';
  } else if (['morisekinoshita', 'mitazono', 'sendai-airport'].includes(sId)) {
    groupKey = 'sat';
  }

  if (!groupKey) return null;

  // 2. 新統合データ stationLedData.json から検索（自駅グループのみを厳格検索・相互流用厳禁）
  const unifiedData = stationLedData as unknown as Record<
    string,
    { parts?: Record<string, DotBitmapInput> }
  >;
  if (unifiedData[groupKey]?.parts) {
    const entry = findMatchingEntry(unifiedData[groupKey].parts, cleanDest);
    if (entry) return normalizeDotsArray(entry);
  }

  // 3. 従来データ dotDestinations.json から検索（互換用）
  const groupsData = dotDestinationsData as unknown as Record<
    string,
    Record<string, DotBitmapInput>
  >;
  const groupMap = groupsData[groupKey] || {};

  // 南仙台駅の場合、専用長体キー（南仙台_仙台空港 等）を最優先検索
  if (sId === 'minami-sendai') {
    const candidateKeys = [
      `南仙台_${cleanDest}`,
      `minami-sendai_${cleanDest}`,
      `南仙台${cleanDest}`,
    ];
    for (const key of candidateKeys) {
      const entry = findMatchingEntry(groupMap, key);
      if (entry) {
        return normalizeDotsArray(entry);
      }
    }
  }

  // 自グループ内の通常キーを検索
  const directEntry = findMatchingEntry(groupMap, cleanDest);
  if (directEntry) {
    return normalizeDotsArray(directEntry);
  }

  return null;
}

/** 行先の手打ちドットデータが存在するか判定 */
export function hasDestinationDots(
  stationId?: string,
  destination?: string
): boolean {
  return getDestinationDots(stationId, destination) !== null;
}

function normalizeDotsArray(input: DotBitmapInput): string[] | null {
  if (!input) return null;
  if (Array.isArray(input)) return input;
  if (typeof input === 'object' && Array.isArray((input as DotBitmapObject).dots)) {
    return (input as DotBitmapObject).dots;
  }
  return null;
}

export const DotLedBitmap: React.FC<DotLedBitmapProps> = ({
  dots,
  className = '',
  targetWidth,
  variant = 'rounded',
  dotRadius,
  dotSize = 0.94,
  ariaLabel,
  preserveAspectRatio = 'xMidYMid meet',
}) => {
  const normalized = useMemo(() => normalizeDotsArray(dots), [dots]);

  const { width, height, fullPathData, halfPathData } = useMemo(() => {
    if (!normalized || normalized.length === 0) {
      return { width: 0, height: 0, fullPathData: '', halfPathData: '' };
    }

    const h = normalized.length;
    let maxW = 0;
    for (let y = 0; y < h; y++) {
      if (normalized[y].length > maxW) {
        maxW = normalized[y].length;
      }
    }

    const fullPaths: string[] = [];
    const halfPaths: string[] = [];
    const isCircle = variant === 'circle';
    const effectiveRadius = dotRadius ?? (isCircle ? 0.41 : 0.20);
    const r = Math.min(Math.max(effectiveRadius, 0.05), 0.48);
    const d = 2 * r;
    const s = Math.min(Math.max(dotSize, 0.4), 0.98);
    const rx = Math.min(r, s / 3);
    const p = (1.0 - s) / 2; // 余白インセット (0.03)
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
        // 実機高密度角丸LED素子（size: 0.94, rx: 0.20）
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

    for (let y = 0; y < h; y++) {
      const row = normalized[y];
      const rowLen = row.length;
      for (let x = 0; x < rowLen; x++) {
        const char = row[x];
        if (char === '#') {
          fullPaths.push(renderDot(x, y));
        } else if (char === '+' || char === '*') {
          halfPaths.push(renderDot(x, y));
        }
      }
    }

    return {
      width: maxW,
      height: h,
      fullPathData: fullPaths.join(''),
      halfPathData: halfPaths.join(''),
    };
  }, [normalized, variant, dotRadius, dotSize]);

  if (!normalized || width === 0 || height === 0) {
    return null;
  }

  const viewWidth = Math.max(width, targetWidth || width);
  const offsetX = targetWidth ? Math.max(0, (targetWidth - width) / 2) : 0;

  return (
    <svg
      viewBox={`0 0 ${viewWidth} ${height}`}
      preserveAspectRatio={preserveAspectRatio}
      className={`block fill-current ${className}`}
      shapeRendering="geometricPrecision"
      aria-label={ariaLabel}
      role={ariaLabel ? 'img' : undefined}
    >
      <g transform={offsetX > 0 ? `translate(${offsetX}, 0)` : undefined}>
        <path d={fullPathData} fill="currentColor" />
        {halfPathData ? (
          /* 実物の半点灯: 主線の邪魔をせず角を滑らかに補間する控えめな光量（opacity 0.28） */
          <path d={halfPathData} fill="currentColor" opacity="0.28" />
        ) : null}
      </g>
    </svg>
  );
};

export default DotLedBitmap;
