import React from 'react';
import { SubwayLineId } from '../utils/subwaySchedule';

interface SubwayStationMarkProps {
  /** 路線ID ('namboku' | 'tozai') */
  line: SubwayLineId;
  /** 表示コード ('N01'〜'N17' / 'T01'〜'T13' または 'N' / 'T') */
  code?: string;
  /** アイコンのピクセルサイズ（デフォルト: 24） */
  size?: number;
  /** 通過済み駅などで控えめ表示にする場合 */
  dimmed?: boolean;
  className?: string;
}

const LINE_RING_COLORS: Record<SubwayLineId, string> = {
  namboku: '#168B50',
  tozai: '#009BBF',
};

const FONT_FAMILY = "'BIZ UDPGothic', 'Hiragino Kaku Gothic ProN', 'Inter', Arial, sans-serif";

/**
 * 仙台市地下鉄 公式駅ナンバリング仕様準拠 丸枠マーク（上下2段構成）
 * - 円リング比率: 外径に対してリング厚 約11%（viewBox 0 0 100 100 において外円 r=47.5、内側白円 r=36.5）
 * - 公式ラインカラー: 南北線 #168B50（緑） / 東西線 #009BBF（青）
 * - 上下2段のテキスト配置:
 *   - 上段: 路線記号 N または T（fontSize="24.5"、太字、白円上部中央 x=50, y=36）
 *   - 下段: 2桁の駅番号 01〜17（fontSize="42"、上段の約1.7倍、太字、白円下部中央 x=50, y=76、letterSpacing="-1"）
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

  // 'N10' -> prefix='N', num='10' に分割（1文字のみの場合は singleChar モード）
  const match = rawCode.match(/^([A-Za-z]+)(\d+)$/);
  const prefix = match ? match[1].toUpperCase() : rawCode.toUpperCase();
  const stationNum = match ? match[2] : null;

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
      aria-label={`仙台市地下鉄 ${rawCode}`}
    >
      {/* 外周の極細白縁（ダークモード背景やタイムライン実線上でも輪郭をくっきり際立たせる） */}
      <circle cx="50" cy="50" r="49" fill="#FFFFFF" />

      {/* 路線カラーの円リング（外径 r=47.5, 内径 r=36.5 -> リング厚 11.0） */}
      <circle cx="50" cy="50" r="47.5" fill={ringColor} />

      {/* 内部の白地円（r=36.5 で広い白地領域を確保） */}
      <circle cx="50" cy="50" r="36.5" fill="#FFFFFF" />

      {stationNum ? (
        <>
          {/* 上段: 路線記号（N / T） */}
          <text
            x="50"
            y="36"
            textAnchor="middle"
            fill="#111111"
            fontFamily={FONT_FAMILY}
            fontWeight="700"
            fontSize="24.5"
          >
            {prefix}
          </text>

          {/* 下段: 2桁の駅番号（01〜17） */}
          <text
            x="50"
            y="76"
            textAnchor="middle"
            fill="#111111"
            fontFamily={FONT_FAMILY}
            fontWeight="700"
            fontSize="42"
            letterSpacing="-1"
          >
            {stationNum}
          </text>
        </>
      ) : (
        /* 1文字のみ指定された場合 */
        <text
          x="50"
          y="50"
          dy="0.36em"
          textAnchor="middle"
          fill="#111111"
          fontFamily={FONT_FAMILY}
          fontWeight="700"
          fontSize="48"
        >
          {prefix}
        </text>
      )}
    </svg>
  );
};

export default SubwayStationMark;
