import React from 'react';
import { UnstyledButton } from '@mantine/core';
import { SubwayStationMark } from './SubwayStationMark';
import { Icon } from './Icon';
import { SubwayLineId } from '../utils/subwaySchedule';

export interface SubwayDepartureRowProps {
  /** 路線ID ('namboku' | 'tozai') */
  lineId: SubwayLineId;
  /** 路線名 (例: 南北線, 東西線) */
  lineName: string;
  /** 発着番線 (例: 1, 2) */
  track: string;
  /** 行先終着駅名 (例: 泉中央, 富沢, 荒井, 八木山動物公園) */
  destination: string;
  /** 行先終着駅コード (例: N01, N17, T13, T01) */
  destinationCode?: string;
  /** 発車時刻 (HH:mm) */
  departureTime: string;
  /** 行タップ時のコールバック */
  onClick?: () => void;
  /** 最後の行かどうか (下線非表示用) */
  isLast?: boolean;
}

/**
 * 地下鉄発車行コンポーネント (1便 = 1行、市営バスや各駅発車案内と統一された文法)
 *
 * - 左側: 発車時刻カラム (固定幅58px・黒文字・等幅欧文数字・18px太字)
 * - 中央: 行き先駅ナンバリングマーク + 行先「〇〇行」(「行」は小さく下揃え) + のりば「○番線」
 * - 右側: 詳細遷移シェブロンアイコン
 */
export const SubwayDepartureRow: React.FC<SubwayDepartureRowProps> = ({
  lineId,
  lineName,
  track,
  destination,
  destinationCode,
  departureTime,
  onClick,
  isLast = false,
}) => {
  const markCode = destinationCode || (lineId === 'namboku' ? 'N' : 'T');

  return (
    <UnstyledButton
      onClick={onClick}
      w="100%"
      title={`${lineName} ${departureTime}発 ${destination}行 (${track}番線) の詳細を表示`}
      className="transition-colors text-left select-none relative hover:bg-black/5 dark:hover:bg-white/5"
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '10px 12px',
        gap: 10,
        borderBottom: isLast
          ? 'none'
          : '1px solid var(--mantine-color-default-border)',
      }}
    >
      {/* 左カラム: 発車時刻（固定幅58px・中央揃え・等幅数字・黒文字18px太字） */}
      <div
        className="font-english tabular-nums shrink-0"
        style={{
          width: 58,
          minWidth: 58,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        <span
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--mantine-color-text)',
            letterSpacing: '-0.03em',
            lineHeight: 1,
          }}
        >
          {departureTime}
        </span>
      </div>

      {/* 中央カラム: 行き先駅マーク ＋ 行先「〇〇行」(「行」は小さく下揃え) ＋ のりば */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <SubwayStationMark line={lineId} code={markCode} size={22} />
        
        {/* 行先表示（駅名は15px太字、「行」は0.72emでベースライン下揃え） */}
        <span
          className="truncate inline-flex items-baseline"
          style={{
            fontSize: 15,
            fontWeight: 700,
            lineHeight: 1.3,
            color: 'var(--mantine-color-text)',
          }}
        >
          <span>{destination}</span>
          <span
            style={{
              fontSize: '0.72em',
              marginLeft: 1.5,
              fontWeight: 600,
              color: 'var(--mantine-color-dimmed)',
            }}
          >
            行
          </span>
        </span>

        {/* のりば番号 */}
        <span
          className="shrink-0"
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--mantine-color-dimmed)',
            marginLeft: 2,
          }}
        >
          {track}番線
        </span>
      </div>

      {/* 右端: 詳細・停車駅遷移アフォーダンスアイコン */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingLeft: 4,
        }}
      >
        <Icon
          name="chevron_right"
          size={16}
          className="text-slate-400 dark:text-slate-500 shrink-0"
        />
      </div>
    </UnstyledButton>
  );
};

export default SubwayDepartureRow;
