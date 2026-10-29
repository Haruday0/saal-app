import React, { useState, useEffect, useMemo } from 'react';
import { Station } from '../types';
import { STATIONS } from '../data/mockData';
import { Paper, Group, Text, Badge, Box, Stack, UnstyledButton } from '@mantine/core';
import { Icon } from './Icon';
import { JisTrain, JisSubway } from './icons';
import { getActiveMovingTrains, RealtimeMovingTrain } from '../utils/trainPosition';
import { LINE_COLORS } from '../config/trainLineRules';

interface RouteMapProps {
  selectedStationId: string | null;
  onSelectStation: (station: Station) => void;
  onSelectTrain?: (train: RealtimeMovingTrain) => void;
}

export const RouteMap: React.FC<RouteMapProps> = ({
  selectedStationId,
  onSelectStation,
  onSelectTrain,
}) => {
  // リアルタイム時計（1秒更新で駅間走行・停車位置を滑らかに計算）
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 時刻表データ（着時刻・発時刻）から現在走行中・停車中の列車をリアルタイム算出
  const movingTrains = useMemo(() => {
    return getActiveMovingTrains(now);
  }, [now]);

  const downTrains = useMemo(
    () => movingTrains.filter((t) => t.direction === 'down'),
    [movingTrains]
  );
  const upTrains = useMemo(
    () => movingTrains.filter((t) => t.direction === 'up'),
    [movingTrains]
  );

  const handleTrainClick = (train: RealtimeMovingTrain) => {
    if (onSelectTrain) {
      onSelectTrain(train);
    }
    const st = STATIONS.find((s) => s.id === train.currentStationId);
    if (st) {
      onSelectStation(st);
    }
  };

  return (
    <div className="flex-1 min-h-0 w-full max-w-md mx-auto px-2 sm:px-3 py-1 flex flex-col justify-between select-none overflow-hidden">
      {/* 路線ダイアグラム本体（スクロールなし・全8駅が画面下端まで完全均等フィット） */}
      <div className="relative flex-1 min-h-0 flex flex-col justify-between py-0.5 overflow-visible">
        {/* ================= 背景レールレイヤー（上から下まで絶対に途切れない完全連続SVG） ================= */}
        <svg
          className="absolute left-0 top-0 w-[68px] h-full pointer-events-none overflow-visible z-0"
          viewBox="0 0 68 800"
          preserveAspectRatio="none"
        >
          <defs>
            {/* 名取駅のJR線分岐フェードアウトグラデーション */}
            <linearGradient id="natoriBranchGradient" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={LINE_COLORS.tohoku} stopOpacity="1" />
              <stop offset="55%" stopColor={LINE_COLORS.tohoku} stopOpacity="0.85" />
              <stop offset="100%" stopColor={LINE_COLORS.tohoku} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* 1. 名取〜仙台間: 青と緑が極細の白い間を入れて1本の帯ストライプとして走る */}
          {/* （中心 X=50 が、駅ノードの中心 X=50 と100%完全一致） */}
          {/* 左: 緑線（JR東北本線・常磐線） */}
          <line
            x1="47.9"
            y1="50"
            x2="47.9"
            y2="440"
            stroke={LINE_COLORS.tohoku}
            strokeWidth="3.0"
            vectorEffect="non-scaling-stroke"
          />

          {/* 2. 名取駅でのJR線（緑）分岐カーブ: 名取中心(X=47.9, Y=440)から左下へ滑らかに逃げてフェードアウト */}
          <path
            d="M 47.9 440 C 47.9 458, 28 476, 8 486"
            fill="none"
            stroke="url(#natoriBranchGradient)"
            strokeWidth="3.0"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />

          {/* 3. 仙台空港アクセス線（青）: 仙台〜名取〜仙台空港まで完全一本の連続レール */}
          {/* 仙台〜名取(Y=50〜438)はX=52.1で緑線と並走、名取駅ノード裏(Y=438〜452)でスムーズに中央X=50へ合流、名取〜空港はX=50で直通 */}
          <path
            d="M 52.1 50 L 52.1 438 C 52.1 445, 50 447, 50 452 L 50 750"
            fill="none"
            stroke={LINE_COLORS.saal}
            strokeWidth="3.2"
            vectorEffect="non-scaling-stroke"
          />

          {/* 4. 名取〜仙台空港間の単独区間（太さ強調の青レールオーバーレイ: X=50） */}
          <line
            x1="50"
            y1="452"
            x2="50"
            y2="750"
            stroke={LINE_COLORS.saal}
            strokeWidth="4.0"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* ================= 下り列車（仙台方面）オーバーレイレーン ================= */}
        <div className="absolute left-[66px] top-0 bottom-0 w-[58px] pointer-events-none z-20">
          {downTrains.map((train) => (
            <TrainBadge key={train.id} train={train} onClick={() => handleTrainClick(train)} />
          ))}
        </div>

        {/* ================= 上り列車（空港・白石方面）オーバーレイレーン ================= */}
        <div className="absolute left-[124px] top-0 bottom-0 w-[58px] pointer-events-none z-20">
          {upTrains.map((train) => (
            <TrainBadge key={train.id} train={train} onClick={() => handleTrainClick(train)} />
          ))}
        </div>

        {STATIONS.map((station) => {
          const isSelected = selectedStationId === station.id;
          const isNatori = station.id === 'natori'; // 名取（JR分岐）

          return (
            <div
              key={station.id}
              className="relative flex-1 min-h-0 flex items-stretch my-[1px] z-10"
            >
              {/* ================= 1. 駅シンボルノード（線の中心 X=50px と100%完全一致） ================= */}
              <div className="relative w-[66px] shrink-0 flex items-center">
                {/* 名取駅の分岐ラベル（本線・カーブ線・ノードと一切被らない左側クリアスペースに配置） */}
                {isNatori && (
                  <div
                    className="absolute left-1 top-1/2 -translate-y-1/2 flex flex-col items-end pr-1 pointer-events-none z-20"
                    style={{ color: LINE_COLORS.tohoku }}
                  >
                    <span className="text-[7.5px] font-extrabold leading-none tracking-tight whitespace-nowrap">
                      東北本線
                    </span>
                    <span className="text-[7.5px] font-extrabold leading-none tracking-tight whitespace-nowrap mt-0.5">
                      常磐線 ↙
                    </span>
                  </div>
                )}

                {/* 駅シンボルノード（全8駅すべて完全に統一された白丸） */}
                <div className="absolute left-[50px] -translate-x-1/2 z-10 flex items-center justify-center">
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-[#2A5CAA] bg-white shadow-xs" />
                </div>
              </div>

              {/* ================= 2. 下り列車走行列スペース（仙台方面・幅 58px） ================= */}
              <div className="relative w-[58px] shrink-0 flex items-center justify-center px-1">
                {/* 走行ガイドライン（背景薄線） */}
                <div
                  className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-[1px] pointer-events-none"
                  style={{ backgroundColor: 'var(--mantine-color-default-border)', opacity: 0.6 }}
                />
              </div>

              {/* ================= 3. 上り列車走行列スペース（空港・東京方面・幅 58px） ================= */}
              <div className="relative w-[58px] shrink-0 flex items-center justify-center px-1">
                {/* 走行ガイドライン（背景薄線） */}
                <div
                  className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-[1px] pointer-events-none"
                  style={{ backgroundColor: 'var(--mantine-color-default-border)', opacity: 0.6 }}
                />
              </div>

              {/* ================= 4. 駅名 ＆ 接続情報ボタン（Mantine Paper / UnstyledButton） ================= */}
              <Paper
                component="button"
                type="button"
                onClick={() => onSelectStation(station)}
                withBorder
                radius="md"
                px={10}
                py={2}
                ml={4}
                className="flex-1 min-h-0 flex items-center justify-between text-left"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  color: 'var(--mantine-color-text)',
                  backgroundColor: isSelected ? 'var(--mantine-color-saal-light)' : undefined,
                  borderColor: isSelected ? 'var(--mantine-color-saal-filled)' : undefined,
                }}
              >
                {/* 駅名 */}
                <div className="min-w-0 pr-1">
                  <Group gap={6} wrap="nowrap" align="baseline">
                    <Text component="span" fw={800} fz={15} className="tracking-tight shrink-0">
                      {station.name}
                    </Text>
                    <Text component="span" fz={10} c="dimmed" className="font-english hidden xs:inline truncate">
                      {station.nameEn}
                    </Text>
                  </Group>

                  {/* 特徴タグ（新幹線・地下鉄の乗り換えのみ表示・JISピクトグラム付き） */}
                  {station.id === 'sendai' && (
                    <Badge
                      mt={2}
                      size="xs"
                      radius="sm"
                      variant="light"
                      color="gray"
                      leftSection={<JisTrain size={10} />}
                    >
                      新幹線・地下鉄
                    </Badge>
                  )}
                  {station.id === 'nagamachi' && (
                    <Badge
                      mt={2}
                      size="xs"
                      radius="sm"
                      variant="light"
                      color="green"
                      leftSection={<JisSubway size={10} />}
                    >
                      地下鉄
                    </Badge>
                  )}
                </div>

                {/* 詳細矢印 */}
                <Icon
                  name="chevron_right"
                  size={16}
                  className={`shrink-0 transition-transform ${isSelected ? 'rotate-90' : ''}`}
                />
              </Paper>
            </div>
          );
        })}
      </div>

    </div>
  );
};

/** 在線列車バッジ（四角形4辺ボーダー ＋ 進行方向接続ノーズ） */
const TrainBadge: React.FC<{ train: RealtimeMovingTrain; onClick: () => void }> = ({ train, onClick }) => {
  const topPercent = ((train.positionRatio + 0.5) / 8) * 100;
  const isSaal = train.line === 'saal';
  const lineColor = isSaal ? LINE_COLORS.saal : LINE_COLORS.tohoku;
  const mantineColor = isSaal ? 'saal' : 'green';
  const isDown = train.direction === 'down';
  const isCompact = !!train.isCompact;
  const noseH = isCompact ? 4 : 5;

  return (
    <UnstyledButton
      onClick={onClick}
      style={{
        position: 'absolute',
        top: `${topPercent}%`,
        left: 3,
        right: 3,
        transform: 'translateY(-50%)',
        pointerEvents: 'auto',
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 下り（仙台方面）: 上向き三角ノーズ */}
      {isDown && (
        <Box
          h={noseH}
          w="100%"
          style={{
            backgroundColor: lineColor,
            clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)',
            marginBottom: -1.5,
            position: 'relative',
            zIndex: 1,
          }}
        />
      )}

      {/* 4辺ボーダー付き本体四角形 */}
      <Paper
        withBorder
        shadow="none"
        px={3}
        py={isCompact ? 1 : 2}
        radius="xs"
        style={{
          borderColor: lineColor,
          borderWidth: 1.5,
          backgroundColor: 'var(--mantine-color-body)',
        }}
      >
        {isCompact ? (
          <Text
            component="div"
            ta="center"
            fw={800}
            fz={10.5}
            lh={1.15}
            style={{
              whiteSpace: 'nowrap',
              letterSpacing: train.destination.length >= 4 ? '-0.04em' : '0.04em',
            }}
          >
            {train.destination}
          </Text>
        ) : (
          <Stack gap={1.5} align="stretch">
            {/* 1段目: 種別 + 両数 */}
            <Group justify="space-between" align="center" gap={2} wrap="nowrap">
              <Badge
                size="xs"
                variant="light"
                color={mantineColor}
                radius="xs"
                px={2.5}
                tt="none"
                styles={{
                  root: { height: 12, flexShrink: 0, border: 'none' },
                  label: { fontSize: 8, fontWeight: 800, lineHeight: 1 },
                }}
              >
                {train.trainType}
              </Badge>
              <Text
                component="span"
                fw={700}
                fz={8.5}
                lh={1}
                c="dimmed"
                style={{ whiteSpace: 'nowrap' }}
              >
                {train.cars}両
              </Text>
            </Group>

            {/* 2段目: 行先 */}
            <Text
              component="div"
              ta="center"
              fw={800}
              fz={10.5}
              lh={1.15}
              style={{
                whiteSpace: 'nowrap',
                letterSpacing: train.destination.length >= 4 ? '-0.04em' : '0.04em',
              }}
            >
              {train.destination}
            </Text>
          </Stack>
        )}
      </Paper>

      {/* 上り（空港・白石方面）: 下向き三角ノーズ */}
      {!isDown && (
        <Box
          h={noseH}
          w="100%"
          style={{
            backgroundColor: lineColor,
            clipPath: 'polygon(0% 0%, 100% 0%, 50% 100%)',
            marginTop: -1.5,
            position: 'relative',
            zIndex: 1,
          }}
        />
      )}
    </UnstyledButton>
  );
};
