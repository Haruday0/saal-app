import React from 'react';
import { UnstyledButton, Badge } from '@mantine/core';
import { BusRouteBadge } from './BusRouteBadge';
import { Icon } from './Icon';

export interface BusDepartureRowProps {
  /** 系統番号・略号（例: 420, まち01, 宮交） */
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
 * - 左側: 発車時刻カラム（固定幅58px・等幅欧文数字・遅延時は定時取消線＋予想時刻）
 * - 中央: 経由（上段小文字） ＋ 系統バッジ（ピル形状）＋行先（太字） ＋ のりば・路線名・遅延バッジ（下段）
 * - 右側: 詳細遷移シェブロンアイコン
 * - 次便: 左端カラーアクセントバー ＋ ほのかなハイライト背景
 * - 過去便: 控えめな減光表示（opacity: 0.55）
 */
export const BusDepartureRow: React.FC<BusDepartureRowProps> = ({
  routeCode,
  routeColor = '#a3d742',
  routeTextColor,
  headsign,
  via,
  platform,
  lineName,
  departureTime,
  isDelayed = false,
  delayMinutes = 0,
  expectedTime,
  isNext = false,
  isPast = false,
  onClick,
  title,
  isLast = false,
}) => {
  const displayHeadsign = formatHeadsign(headsign);
  const showDelay = isDelayed && Boolean(expectedTime);

  return (
    <UnstyledButton
      onClick={onClick}
      w="100%"
      title={title || `${departureTime}発 [${routeCode}] ${displayHeadsign}`}
      className="transition-colors text-left select-none relative hover:bg-black/5 dark:hover:bg-white/5"
      style={{
        display: 'flex',
        alignItems: 'stretch',
        padding: '11px 14px',
        gap: 10,
        borderBottom: isLast
          ? 'none'
          : '1px solid var(--mantine-color-default-border)',
        opacity: isPast ? 0.55 : 1,
        backgroundColor: isNext
          ? 'var(--mantine-color-default-hover)'
          : undefined,
      }}
    >
      {/* 次発強調: 左端カラーインジケーターバー */}
      {isNext && (
        <span
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 4,
            backgroundColor: routeColor,
            borderTopLeftRadius: 'var(--mantine-radius-sm)',
            borderBottomLeftRadius: 'var(--mantine-radius-sm)',
          }}
        />
      )}

      {/* 左カラム: 発車時刻（固定幅58px・中央揃え・等幅数字・sendai-bus-map-v2 .item-time 準拠） */}
      <div
        className="font-english tabular-nums shrink-0"
        style={{
          width: 58,
          minWidth: 58,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          minHeight: 46,
        }}
      >
        {showDelay ? (
          <div
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              lineHeight: 1.15,
            }}
          >
            <del
              style={{
                fontSize: 13,
                color: 'var(--mantine-color-dimmed)',
                textDecoration: 'line-through',
                textDecorationThickness: 2,
              }}
            >
              {departureTime}
            </del>
            <span
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--mantine-color-red-6)',
                letterSpacing: '-0.03em',
              }}
            >
              {expectedTime}
            </span>
          </div>
        ) : (
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: isNext ? 'var(--mantine-color-blue-filled)' : 'var(--mantine-color-text)',
              letterSpacing: '-0.03em',
            }}
          >
            {departureTime}
          </span>
        )}
      </div>

      {/* 中央カラム: 経由・系統バッジ・行先・のりば情報 */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        {/* 経由地（上段・12px・dimmed・sendai-bus-map-v2 .item-via） */}
        {via && (
          <div
            className="truncate"
            style={{
              fontSize: 12,
              color: 'var(--mantine-color-dimmed)',
              marginBottom: 2,
              fontWeight: 400,
              lineHeight: 1.2,
            }}
          >
            {via} 経由
          </div>
        )}

        {/* 行先行: 系統番号バッジ ＋ 行先名称 (sendai-bus-map-v2 .item-destination-row) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            width: '100%',
            minWidth: 0,
          }}
        >
          <BusRouteBadge
            routeCode={routeCode}
            color={routeColor}
            textColor={routeTextColor}
            size="sm"
          />
          <span
            className="truncate"
            style={{
              fontSize: 15,
              fontWeight: 700,
              lineHeight: 1.3,
              color: 'var(--mantine-color-text)',
            }}
          >
            {displayHeadsign}
          </span>
        </div>

        {/* 補足行: のりば番号・路線名・遅延バッジ・次便バッジ (sendai-bus-map-v2 .item-platform) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 2,
            flexWrap: 'nowrap',
            overflow: 'hidden',
          }}
        >
          {platform && (
            <span
              className="shrink-0"
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: 'var(--mantine-color-dimmed)',
              }}
            >
              {platform.includes('のりば') || platform.includes('口') || platform.includes('方面')
                ? platform
                : `${platform}番のりば`}
            </span>
          )}

          {lineName && (
            <span
              className="truncate"
              style={{
                fontSize: 11,
                color: 'var(--mantine-color-dimmed)',
              }}
            >
              {lineName}
            </span>
          )}

          {showDelay && (
            <Badge
              size="xs"
              color="red"
              variant="light"
              radius="sm"
              tt="none"
              fw={700}
              className="shrink-0"
            >
              +{delayMinutes}分遅れ
            </Badge>
          )}

          {isNext && !showDelay && (
            <Badge
              size="xs"
              variant="light"
              color="blue"
              radius="sm"
              tt="none"
              fw={700}
              className="shrink-0"
            >
              次発
            </Badge>
          )}
        </div>
      </div>

      {/* 右端: 詳細遷移アフォーダンスアイコン */}
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
