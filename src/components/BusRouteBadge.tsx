import React from 'react';

/**
 * YIQ 輝度計算によるコントラスト文字色判定
 * sendai-bus-map-v2 準拠:
 * 明るい背景（黄緑 #a3d742、黄色等）では #1b4406
 * 暗い背景（緑 #00703c / #059669、赤 #b91c1c、橙 #d97706 等）では #ffffff
 */
export function getRouteBadgeTextColor(bgColor: string): string {
  const clean = bgColor.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16) || 0;
    const g = parseInt(clean[1] + clean[1], 16) || 0;
    const b = parseInt(clean[2] + clean[2], 16) || 0;
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 150 ? '#1b4406' : '#ffffff';
  }
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? '#1b4406' : '#ffffff';
}

export interface BusRouteBadgeProps {
  /** 系統番号・略号（例: 420, まち01, K610, 宮交） */
  routeCode: string;
  /** 路線シンボルカラー（デフォルト: #00703c） */
  color?: string;
  /** 文字色（省略時は背景色の明暗に応じた自動決定） */
  textColor?: string;
  /** サイズ（sm: 13px / md: 14px） */
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * sendai-bus-map-v2 の .route-badge と完全に同一の仕様・寸法の系統番号バッジ
 * - 形状: 完全ピル（border-radius: 999px）
 * - パディング: 2px 8px（md: 3px 9px）
 * - フォント: 13px（md: 14px）、太字 700、字間 0.01em、行高 1.2
 * - ドロップシャドウ: 0 1px 3px rgba(0, 0, 0, 0.12)
 */
export const BusRouteBadge: React.FC<BusRouteBadgeProps> = ({
  routeCode,
  color = '#00703c',
  textColor,
  size = 'sm',
  className = '',
}) => {
  const bg = color.startsWith('#') ? color : `#${color}`;
  const computedTextColor = textColor
    ? textColor.startsWith('#')
      ? textColor
      : `#${textColor}`
    : getRouteBadgeTextColor(bg);

  const isMd = size === 'md';

  return (
    <span
      className={`route-badge select-none ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMd ? '3px 9px' : '2px 8px',
        borderRadius: 999,
        fontSize: isMd ? 14 : 13,
        fontWeight: 700,
        letterSpacing: '0.01em',
        whiteSpace: 'nowrap',
        lineHeight: 1.2,
        backgroundColor: bg,
        color: computedTextColor,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.14)',
        flexShrink: 0,
      }}
    >
      {routeCode}
    </span>
  );
};
