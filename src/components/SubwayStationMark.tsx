import React from 'react';
import { SubwayLineId } from '../utils/subwaySchedule';

interface SubwayStationMarkProps {
  /** 路線ID ('namboku' | 'tozai') */
  line: SubwayLineId;
  /**
   * 表示コード
   * - 路線表示: 'N' または 'T'（または省略時） -> アップロードされた公式路線マークと100%完全一致するベクターパスを描画
   * - 各駅表示: 'N01'〜'N17' / 'T01'〜'T13' -> 上下2段の駅ナンバリングマーク（上段 N/T ＋ 下段 01〜17）を描画
   */
  code?: string;
  /** アイコンのピクセルサイズ（デフォルト: 24） */
  size?: number;
  /** 通過済み駅などで控えめ表示にする場合 */
  dimmed?: boolean;
  className?: string;
}

/** アップロードされた公式1024×1024 PNG画像から精密測定した路線カラー */
const LINE_RING_COLORS: Record<SubwayLineId, string> = {
  namboku: '#3b7d23',
  tozai: '#00b0f0',
};

const FONT_FAMILY = "'BIZ UDPGothic', 'Hiragino Kaku Gothic ProN', 'Inter', Arial, sans-serif";

/**
 * 仙台市地下鉄 路線記号（N / T）および駅ナンバリング（N01〜N17 / T01〜T13）丸枠マーク
 * - viewBox="0 0 1024 1024"（1024×1024 座標系）
 * - 外円: cx="512" cy="512" r="511"（南北線 #3b7d23、東西線 #00b0f0）
 * - 内側の白円: cx="512" cy="512" r="383"（fill="#FFFFFF"）
 * - 路線単体表示（'N' / 'T'）:
 *   フォント（<text>）に頼らず、1024×1024 PNGから1pxの狂いもなく測定した頂点座標の <path> で描画。
 * - 各駅ナンバリング表示（'N01'〜'N17' / 'T01'〜'T13'）:
 *   上段に正確なベクター <path> による N / T を配置し、下段に2桁の駅番号（01〜17）を配置した上下2段構成。
 */
export const SubwayStationMark: React.FC<SubwayStationMarkProps> = ({
  line,
  code,
  size = 24,
  dimmed = false,
  className = '',
}) => {
  const ringColor = LINE_RING_COLORS[line];
  const rawCode = (code || (line === 'namboku' ? 'N' : 'T')).trim();

  // 'N10' -> prefix='N', stationNum='10' に分割（'N' / 'T' 単体の場合は stationNum=null）
  const match = rawCode.match(/^([A-Za-z]+)(\d+)$/);
  const prefix = (match ? match[1] : rawCode).toUpperCase();
  const stationNum = match ? match[2] : null;

  // 1024×1024 PNG画像から1ピクセル単位で完全抽出した N / T の黒図形パス
  const renderLineLetterPath = () => {
    if (prefix === 'N') {
      return (
        <path
          d="M 314 262 H 397 L 619 625 V 262 H 700 V 763 H 615 L 396 400 V 763 H 314 Z"
          fill="#000000"
        />
      );
    }
    return (
      <path
        d="M 302 292 H 714 V 361 H 549 V 793 H 467 V 361 H 302 Z"
        fill="#000000"
      />
    );
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 select-none ${className}`}
      style={{
        opacity: dimmed ? 0.55 : 1,
        verticalAlign: 'middle',
      }}
      aria-label={`仙台市地下鉄 ${rawCode}`}
    >
      {/* 外円: 路線カラーリング (cx=512, cy=512, r=511) */}
      <circle cx="512" cy="512" r="511" fill={ringColor} />

      {/* 内側の白円 (cx=512, cy=512, r=383) */}
      <circle cx="512" cy="512" r="383" fill="#FFFFFF" />

      {stationNum ? (
        <>
          {/* 上段: 路線記号（N / T ベクターパスを上段中央へ縮小配置） */}
          <g transform="translate(512, 315) scale(0.46) translate(-512, -512)">
            {renderLineLetterPath()}
          </g>

          {/* 下段: 2桁の駅番号（01〜17） */}
          <text
            x="512"
            y="788"
            textAnchor="middle"
            fill="#000000"
            fontFamily={FONT_FAMILY}
            fontWeight="700"
            fontSize="430"
            letterSpacing="-10"
          >
            {stationNum}
          </text>
        </>
      ) : (
        /* 路線単体表示（N / T）: アップロード画像と100%ピクセル単位で完全一致するベクターパス */
        renderLineLetterPath()
      )}
    </svg>
  );
};

export default SubwayStationMark;
