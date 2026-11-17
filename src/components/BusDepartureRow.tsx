import React from 'react';
import { ListBox, Skeleton } from '@heroui/react';
import { BusRouteBadge } from './BusRouteBadge';
import { Icon } from './Icon';

export interface BusDepartureRowProps {
  /** 系統番号・略号（例: 420, まち01） */
  routeCode: string;
  /** 路線シンボルカラー（デフォルト: #a3d742） */
  routeColor?: string;
  /** 系統バッジ文字色（省略時は自動計算） */
  routeTextColor?: string;
  /** 行先（例: 交通局大学病院前, 名取駅西口） */
  headsign: string;
  /** 経由地（例: 県庁市役所） */
  via?: string | null;
  /** のりば番号またはバス停補助名（例: 5, 西口） */
  platform?: string | null;
  /** 路線名または方面名（例: まちなか循環線） */
  lineName?: string | null;
  /** 定時発車時刻（HH:mm） */
  departureTime: string;
  /** 遅延有無 */
  isDelayed?: boolean;
  /** 遅延分数（分） */
  delayMinutes?: number;
  /** 遅延予想発車時刻（HH:mm） */
  expectedTime?: string;
  /** 遅延表示（取消線＋予想時刻）を行うか（デフォルト: true。時刻表一覧等では false にして定時時刻のみ表示） */
  showDelay?: boolean;
  /** 直近の次便かどうか */
  isNext?: boolean;
  /** 過去の便かどうか */
  isPast?: boolean;
  /** 行タップ時のコールバック */
  onClick?: () => void;
  /** ツールチップ・アクセシビリティ用タイトル */
  title?: string;
  /** 最後の行かどうか（下線非表示用） */
  isLast?: boolean;
  /** リストアイテムID */
  id?: string;
  /** アクセシビリティ・スクリーンリーダー用テキスト */
  textValue?: string;
  /** レンダリング要素（デフォルト: 'list-item'） */
  as?: 'list-item' | 'button';
}

/** 行先表示のフォーマット（sendai-bus-map-v2 準拠） */
export function formatHeadsign(headsign: string): string {
  if (!headsign || headsign.trim().length === 0) return '';
  if (
    headsign.includes('循環') ||
    headsign.endsWith('行') ||
    headsign.endsWith('行き')
  ) {
    return headsign;
  }
  return `${headsign}行`;
}

/**
 * sendai-bus-map-v2 のバス停時刻表行（stop-timetable-row）と
 * 完全に同一のレイアウト・情報順・視認性を持つ共通バス発車行コンポーネント
 *
 * - HeroUI の ListBox.Item を使用してリスト内で統一
 * - 左側: 発車時刻カラム（固定幅58px・等幅欧文数字・遅延時は定時取消線＋予想時刻）
 * - 中央: 経由（上段小文字） ＋ 系統バッジ（ピル形状）＋行先（太字） ＋ のりば・路線名（下段）
 * - 右側: 詳細遷移シェブロンアイコン
 * - 過去便: 控えめな減光表示（opacity: 0.55）
 */
export const BusDepartureRow: React.FC<BusDepartureRowProps> = ({
  routeCode,
  routeColor = '#a3d742',
  routeTextColor = '#1b4406',
  headsign,
  via,
  platform,
  lineName,
  departureTime,
  isDelayed = false,
  delayMinutes: _delayMinutes = 0,
  expectedTime,
  showDelay = true,
  isNext: _isNext,
  isPast = false,
  onClick,
  title,
  isLast = false,
  id,
  textValue,
  as = 'list-item',
}) => {
  const displayHeadsign = formatHeadsign(headsign);
  const shouldShowDelay = showDelay && isDelayed && Boolean(expectedTime);
  const itemTitle = title || `${departureTime}発 [${routeCode}] ${displayHeadsign}`;
  const itemId = id || `${departureTime}-${routeCode}-${headsign}`;
  const itemTextValue = textValue || `${departureTime}発 [${routeCode}] ${displayHeadsign}`;

  const rowContent = (
    <>
      {/* 左カラム: 発車時刻（固定幅58px・中央揃え・等幅数字） */}
      <div className="font-english tabular-nums shrink-0 w-[58px] min-w-[58px] flex flex-col items-center justify-center text-center min-h-[46px]">
        {shouldShowDelay ? (
          <div className="relative flex flex-col items-center justify-center w-full leading-tight">
            <del className="text-xs text-muted line-through">
              {departureTime}
            </del>
            <span className="text-lg font-bold text-foreground tracking-tight">
              {expectedTime}
            </span>
          </div>
        ) : (
          <span className="text-lg font-bold text-foreground tracking-tight">
            {departureTime}
          </span>
        )}
      </div>

      {/* 中央カラム: 経由・系統バッジ・行先・のりば情報 */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        {/* 経由地（上段・12px・muted） */}
        {via && (
          <div className="truncate text-xs text-muted mb-0.5 leading-tight">
            {via} 経由
          </div>
        )}

        {/* 行先行: 系統番号バッジ ＋ 行先名称 */}
        <div className="flex items-center gap-1.5 w-full min-w-0">
          <BusRouteBadge
            routeCode={routeCode}
            color={routeColor}
            textColor={routeTextColor}
            size="sm"
          />
          <span className="truncate text-[15px] font-bold text-foreground leading-snug">
            {displayHeadsign}
          </span>
        </div>

        {/* 補足行: のりば番号・路線名 */}
        <div className="flex items-center gap-1.5 mt-0.5 flex-nowrap overflow-hidden">
          {platform && (
            <span className="shrink-0 text-[11px] font-medium text-muted">
              {platform.includes('のりば') || platform.includes('口') || platform.includes('方面')
                ? platform
                : `${platform}番のりば`}
            </span>
          )}

          {lineName && (
            <span className="truncate text-[11px] text-muted">
              {lineName}
            </span>
          )}
        </div>
      </div>

      {/* 右端: 詳細遷移アフォーダンスアイコン */}
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
        className={`w-full transition-colors text-left select-none relative hover:bg-surface-secondary/60 flex items-center justify-between px-3.5 py-2.5 gap-2.5 cursor-pointer font-inherit text-foreground ${
          isLast ? '' : 'border-b border-border'
        } ${isPast ? 'opacity-55' : 'opacity-100'}`}
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
      className={`rounded-none px-3.5 py-2.5 w-full flex items-center justify-between gap-2.5 cursor-pointer font-inherit text-foreground select-none relative data-[hovered=true]:bg-surface-secondary/60 data-[pressed=true]:bg-surface-tertiary transition-colors ${
        isPast ? 'opacity-55' : 'opacity-100'
      }`}
    >
      {rowContent}
    </ListBox.Item>
  );
};

export interface BusDepartureRowSkeletonProps {
  /** 最後の行かどうか（下線非表示用） */
  isLast?: boolean;
}

/**
 * BusDepartureRow と同一のレイアウト・パディング・カラム幅を持つスケルトンローダー
 * レイアウトシフト（CLS）を徹底防止し、実データ読み込み完了時もガタつきなく遷移する
 */
export const BusDepartureRowSkeleton: React.FC<BusDepartureRowSkeletonProps> = ({
  isLast = false,
}) => {
  return (
    <div
      className={`flex items-stretch px-3.5 py-2.5 gap-2.5 min-h-[58px] ${
        isLast ? '' : 'border-b border-border'
      }`}
    >
      {/* 左カラム: 発車時刻スケルトン（固定幅58px・中央揃え） */}
      <div className="shrink-0 w-[58px] min-w-[58px] flex flex-col items-center justify-center min-h-[46px]">
        <Skeleton className="rounded-sm w-[50px] h-6" />
      </div>

      {/* 中央カラム: 経由・系統バッジ・行先・のりば情報 */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
        {/* 行先行: 系統番号バッジ ＋ 行先名称 */}
        <div className="flex items-center gap-1.5 w-full min-w-0">
          <Skeleton className="rounded-full shrink-0 w-11 h-5" />
          <Skeleton className="rounded-xs w-[45%] min-w-[120px] h-4.5" />
        </div>

        {/* 補足行: 経由・のりば番号 */}
        <div className="flex items-center gap-1.5 mt-0.5">
          <Skeleton className="rounded-xs w-[60px] h-3" />
        </div>
      </div>

      {/* 右端: 詳細遷移アフォーダンスアイコン枠 */}
      <div className="flex items-center justify-center pl-1 shrink-0">
        <Skeleton className="rounded-xs w-3 h-3" />
      </div>
    </div>
  );
};
