import React from 'react';
import { UnstyledButton, Badge, Group } from '@mantine/core';
import { SubwayStationMark } from './SubwayStationMark';
import { Icon } from './Icon';
import { SubwayTrain } from '../utils/subwaySchedule';

export interface SubwayDepartureItem {
  train: SubwayTrain;
  departureTime: string;
  terminalStation: string;
}

export interface SubwayDepartureRowProps {
  lineId: 'namboku' | 'tozai';
  lineName: string;
  track: string;
  directionLabel: string;
  destinationCode?: string;
  upcomingTrains: SubwayDepartureItem[];
  onSelectDirection: () => void;
  onSelectTrain: (trainId: string) => void;
  isLast?: boolean;
}

/**
 * バス行（BusDepartureRow）と完全に文法を揃えた地下鉄発車行コンポーネント
 *
 * - 左側: 直近発車時刻カラム（固定幅58px・他交通機関と統一した黒文字・等幅欧文数字）
 * - 中央: 行き先駅ナンバリングマーク（SubwayStationMark N01/N17/T01/T13） ＋ 方面・のりば ＋ 後続発車便ボタン
 * - 右側: 方面時刻表遷移シェブロンアイコン
 */
export const SubwayDepartureRow: React.FC<SubwayDepartureRowProps> = ({
  lineId,
  lineName,
  track,
  directionLabel,
  destinationCode,
  upcomingTrains,
  onSelectDirection,
  onSelectTrain,
  isLast = false,
}) => {
  const nextTrain = upcomingTrains[0] ?? null;
  const subsequentTrains = upcomingTrains.slice(1);
  const markCode = destinationCode || (lineId === 'namboku' ? 'N' : 'T');

  return (
    <UnstyledButton
      onClick={onSelectDirection}
      w="100%"
      title={`${lineName} ${track}番線 ${directionLabel}の時刻表を表示`}
      className="transition-colors text-left select-none relative hover:bg-black/5 dark:hover:bg-white/5"
      style={{
        display: 'flex',
        alignItems: 'stretch',
        padding: '10px 12px',
        gap: 10,
        borderBottom: isLast
          ? 'none'
          : '1px solid var(--mantine-color-default-border)',
      }}
    >
      {/* 左カラム: 次発時刻（固定幅58px・中央揃え・等幅数字・他交通機関と統一した黒文字） */}
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
        {nextTrain ? (
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--mantine-color-text)',
              letterSpacing: '-0.03em',
            }}
          >
            {nextTrain.departureTime}
          </span>
        ) : (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--mantine-color-dimmed)',
            }}
          >
            運転終了
          </span>
        )}
      </div>

      {/* 中央カラム: 路線記号・方面・のりば・後続便 */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        {/* 方面・行き先駅マーク・のりば行 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            width: '100%',
            minWidth: 0,
          }}
        >
          <SubwayStationMark line={lineId} code={markCode} size={22} />
          <span
            className="truncate"
            style={{
              fontSize: 14.5,
              fontWeight: 700,
              lineHeight: 1.3,
              color: 'var(--mantine-color-text)',
            }}
          >
            {directionLabel}
          </span>
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

        {/* 補足行: 後続便の時刻チップ（タップでその便の全停車駅タイムラインを直接開く） */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            marginTop: 3,
            overflow: 'hidden',
          }}
        >
          {subsequentTrains.length > 0 ? (
            <Group gap={4} wrap="nowrap" align="center">
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: 'var(--mantine-color-dimmed)',
                }}
              >
                後続:
              </span>
              {subsequentTrains.map((item) => (
                <UnstyledButton
                  key={item.train.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTrain(item.train.id);
                  }}
                  title={`${item.departureTime}発 ${item.terminalStation}行の全停車駅時刻を表示`}
                >
                  <Badge
                    size="xs"
                    variant="default"
                    radius="sm"
                    fw={700}
                    className="font-english tabular-nums hover:border-blue-500 transition-colors"
                    style={{ cursor: 'pointer' }}
                  >
                    {item.departureTime}
                  </Badge>
                </UnstyledButton>
              ))}
            </Group>
          ) : (
            <span
              style={{
                fontSize: 11,
                color: 'var(--mantine-color-dimmed)',
              }}
            >
              {nextTrain ? 'この方面の次発列車' : '本日の運行は終了しました'}
            </span>
          )}
        </div>
      </div>

      {/* 右端: 時刻表一覧遷移アフォーダンスアイコン */}
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
