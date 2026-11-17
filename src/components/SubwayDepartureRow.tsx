import React from 'react';
import { ListBox } from '@heroui/react';
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
  /** リストアイテムID */
  id?: string;
  /** アクセシビリティ・スクリーンリーダー用テキスト */
  textValue?: string;
  /** レンダリング要素（デフォルト: 'list-item'） */
  as?: 'list-item' | 'button';
}

/**
 * 地下鉄発車行コンポーネント (1便 = 1行、市営バスや各駅発車案内と統一された文法)
 *
 * - HeroUI の ListBox.Item を使用してリスト内で統一
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
  id,
  textValue,
  as = 'list-item',
}) => {
  const markCode = destinationCode || (lineId === 'namboku' ? 'N' : 'T');
  const itemId = id || `${departureTime}-${destination}`;
  const itemTextValue = textValue || `${departureTime}発 ${destination}行 (${track}番線)`;
  const itemTitle = `${lineName} ${departureTime}発 ${destination}行 (${track}番線) の詳細を表示`;

  const rowContent = (
    <>
      {/* 左カラム: 発車時刻（固定幅58px・中央揃え・等幅数字・18px太字） */}
      <div className="font-english tabular-nums shrink-0 w-[58px] min-w-[58px] flex items-center justify-center text-center">
        <span className="text-lg font-bold text-foreground tracking-tight leading-none">
          {departureTime}
        </span>
      </div>

      {/* 中央カラム: 行き先駅マーク ＋ 行先「〇〇行」(「行」は小さく下揃え) ＋ のりば */}
      <div className="flex-1 min-w-0 flex items-center gap-1.5">
        <SubwayStationMark line={lineId} code={markCode} size={22} />
        
        {/* 行先表示（駅名は15px太字、「行」は0.72emでベースライン下揃え） */}
        <span className="truncate inline-flex items-baseline text-[15px] font-bold text-foreground leading-snug">
          <span>{destination}</span>
          <span className="text-[0.72em] ml-0.5 font-semibold text-muted">
            行
          </span>
        </span>

        {/* のりば番号 */}
        <span className="shrink-0 text-[11px] font-semibold text-muted ml-0.5">
          {track}番線
        </span>
      </div>

      {/* 右端: 詳細・停車駅遷移アフォーダンスアイコン */}
      <div className="flex items-center justify-center pl-1 shrink-0">
        <Icon
          name="chevron_right"
          size={16}
          className="text-muted shrink-0"
        />
      </div>
    </>
  );

  if (as === 'button') {
    return (
      <button
        type="button"
        onClick={onClick}
        title={itemTitle}
        className={`rounded-none px-3.5 py-2.5 w-full flex items-center justify-between gap-2.5 cursor-pointer font-inherit text-foreground select-none relative hover:bg-surface-secondary/60 text-left transition-colors ${
          isLast ? '' : 'border-b border-border'
        }`}
      >
        {rowContent}
      </button>
    );
  }

  return (
    <ListBox.Item
      id={itemId}
      textValue={itemTextValue}
      onAction={onClick}
      className="rounded-none px-3.5 py-2.5 w-full flex items-center justify-between gap-2.5 cursor-pointer font-inherit text-foreground select-none relative data-[hovered=true]:bg-surface-secondary/60 data-[pressed=true]:bg-surface-tertiary transition-colors"
    >
      {rowContent}
    </ListBox.Item>
  );
};

export default SubwayDepartureRow;
