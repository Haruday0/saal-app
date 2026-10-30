import React from 'react';
import { SubwayLineId } from '../utils/subwaySchedule';

interface SubwayStationMarkProps {
  /** 路線ID ('namboku' | 'tozai') */
  line: SubwayLineId;
  /** 表示コード ('N' | 'T' または 'N01'〜'N17' / 'T01'〜'T13') */
  code?: string;
  /** アイコンのピクセルサイズ（デフォルト: 20） */
  size?: number;
  /** 通過済み駅などで控えめ表示にする場合 */
  dimmed?: boolean;
  className?: string;
}

const LINE_RING_COLORS: Record<SubwayLineId, string> = {
  namboku: '#009944',
  tozai: '#00A0DE',
};

/**
 * 仙台市地下鉄 公式サイン準拠 路線記号・駅ナンバリング丸枠マーク
 * - 太いラインカラー円リング（南北線 #009944 / 東西線 #00A0DE）
 * - 純白インナーサークル（#FFFFFF）＋ ダークモードでも境界が潰れない極細白アウターリム
 * - 引き締まった太字サンセリフ体（#111111）による路線記号（N / T）および駅番号（N10 / T07 等）
 */
export const SubwayStationMark: React.FC<SubwayStationMarkProps> = ({
  line,
  code,
  size = 20,
  dimmed = false,
  className = '',
}) => {
  const ringColor = LINE_RING_COLORS[line];
  const displayCode = (code || (line === 'namboku' ? 'N' : 'T')).trim();
  const isSingleChar = displayCode.length === 1;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 select-none ${className}`}
      style={{
        opacity: dimmed ? 0.55 : 1,
        verticalAlign: 'middle',
      }}
      aria-label={`仙台市地下鉄 ${displayCode}`}
    >
      {/* 外周の極細白縁（ダークモード背景やタイムライン実線上でも輪郭をくっきり際立たせる） */}
      <circle cx="50" cy="50" r="49" fill="#FFFFFF" />

      {/* 路線カラーの太い円リング（外径 r=47, 内径 r=32.5 -> リング厚 14.5） */}
      <circle cx="50" cy="50" r="47" fill={ringColor} />

      {/* 内部の白丸背景 */}
      <circle cx="50" cy="50" r="32.5" fill="#FFFFFF" />

      {/* 路線記号（N / T）または駅ナンバリング（N01〜N17 / T01〜T13） */}
      {isSingleChar ? (
        <text
          x="50"
          y="50"
          dy="0.36em"
          textAnchor="middle"
          fill="#111111"
          fontFamily="'Inter', 'Helvetica Neue', Arial, sans-serif"
          fontWeight="800"
          fontSize="47"
        >
          {displayCode}
        </text>
      ) : (
        <text
          x="50"
          y="50"
          dy="0.36em"
          textAnchor="middle"
          fill="#111111"
          fontFamily="'Inter', 'Barlow Condensed', 'Helvetica Neue', Arial, sans-serif"
          fontWeight="800"
          fontSize="30.5"
          letterSpacing="-1.8"
          textLength="54"
          lengthAdjust="spacingAndGlyphs"
        >
          {displayCode}
        </text>
      )}
    </svg>
  );
};

export default SubwayStationMark;
