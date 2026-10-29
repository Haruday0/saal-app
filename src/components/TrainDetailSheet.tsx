import React, { useEffect, useMemo, useState } from 'react';
import {
  Drawer,
  Group,
  Stack,
  Text,
  Title,
  Badge,
  Box,
  Paper,
  Timeline,
  UnstyledButton,
  SimpleGrid,
} from '@mantine/core';
import { Station } from '../types';
import { STATIONS } from '../data/mockData';
import { LINE_COLORS } from '../config/trainLineRules';
import {
  getScheduledTrainById,
  getCurrentRailwaySeconds,
  toRailwaySeconds,
  ScheduledStop,
} from '../utils/trainPosition';

interface TrainDetailSheetProps {
  trainId: string | null;
  onClose: () => void;
  onSelectStation: (station: Station) => void;
}

type TrainStatus =
  | { kind: 'before' }
  | { kind: 'stopped'; index: number }
  | { kind: 'running'; index: number }
  | { kind: 'arrived' };

/** 現在時刻から列車の運行状況（発車前 / 停車中 / 駅間走行中 / 到着済）を判定 */
function getTrainStatus(stops: ScheduledStop[], nowSec: number): TrainStatus {
  if (stops.length === 0) return { kind: 'before' };
  if (nowSec < toRailwaySeconds(stops[0].dep)) return { kind: 'before' };
  for (let i = 0; i < stops.length; i++) {
    const arr = toRailwaySeconds(stops[i].arr);
    const dep = toRailwaySeconds(stops[i].dep);
    if (nowSec >= arr && nowSec <= dep) return { kind: 'stopped', index: i };
    if (i < stops.length - 1 && nowSec > dep && nowSec < toRailwaySeconds(stops[i + 1].arr)) {
      return { kind: 'running', index: i };
    }
  }
  return { kind: 'arrived' };
}

export const TrainDetailSheet: React.FC<TrainDetailSheetProps> = ({
  trainId,
  onClose,
  onSelectStation,
}) => {
  const train = useMemo(() => (trainId ? getScheduledTrainById(trainId) : null), [trainId]);

  // 開いている間は現在位置を10秒ごとに更新
  const [nowSec, setNowSec] = useState(() => getCurrentRailwaySeconds());
  useEffect(() => {
    if (!trainId) return;
    setNowSec(getCurrentRailwaySeconds());
    const timer = setInterval(() => setNowSec(getCurrentRailwaySeconds()), 10000);
    return () => clearInterval(timer);
  }, [trainId]);

  const status = useMemo(
    () => (train ? getTrainStatus(train.stops, nowSec) : ({ kind: 'before' } as TrainStatus)),
    [train, nowSec]
  );

  const isSaal = train?.line === 'saal';
  const lineColor = isSaal ? LINE_COLORS.saal : LINE_COLORS.tohoku;
  const mantineColor = isSaal ? 'saal' : 'green';

  const first = train?.stops[0];
  const last = train?.stops[train.stops.length - 1];

  // Timeline の到達済みインデックス
  const activeIndex =
    status.kind === 'before'
      ? -1
      : status.kind === 'arrived'
      ? (train?.stops.length ?? 1) - 1
      : status.index;

  const statusText = (() => {
    if (!train) return '';
    switch (status.kind) {
      case 'before':
        return `${first?.stationName} ${first?.dep} 発車予定`;
      case 'stopped':
        return `${train.stops[status.index].stationName}駅に停車中`;
      case 'running':
        return `${train.stops[status.index].stationName} → ${train.stops[status.index + 1].stationName} 間を走行中`;
      case 'arrived':
        return `${last?.stationName}に到着済み`;
    }
  })();

  const handleStopClick = (stationId: string) => {
    const st = STATIONS.find((s) => s.id === stationId);
    if (st) onSelectStation(st);
  };

  return (
    <Drawer
      opened={!!train}
      onClose={onClose}
      position="bottom"
      size="auto"
      radius="lg"
      withCloseButton
      title={
        train ? (
          <Group gap={6} wrap="nowrap">
            <Box w={4} h={18} style={{ backgroundColor: lineColor, borderRadius: 2 }} />
            <Text fz="sm" fw={700} c="dimmed">
              {train.lineName ?? ''}
            </Text>
          </Group>
        ) : null
      }
      styles={{
        content: {
          maxWidth: 448,
          marginInline: 'auto',
          maxHeight: 'calc(100dvh - 5.5rem)',
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
        },
        body: { paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' },
      }}
    >
      {train && (
        <Stack gap="md">
          {/* 種別・行先 */}
          <Group gap={8} align="center" wrap="nowrap">
            <Badge size="lg" radius="sm" color={mantineColor} variant="filled" tt="none">
              {train.trainType ?? '普通'}
            </Badge>
            <Title order={3} fw={800} style={{ whiteSpace: 'nowrap' }}>
              {train.destination}
              <Text component="span" fz="md" fw={700} ml={4}>
                行
              </Text>
            </Title>
            {train.calendar === 'weekday' && (
              <Badge size="sm" radius="sm" color="gray" variant="light" tt="none" ml="auto">
                土休日運休
              </Badge>
            )}
          </Group>

          {/* 現在の運行状況 */}
          <Paper withBorder radius="md" px="sm" py={8} style={{ borderColor: lineColor }}>
            <Text fz="sm" fw={700}>
              {statusText}
            </Text>
          </Paper>

          {/* 基本情報 */}
          <SimpleGrid cols={3} spacing="xs">
            <InfoCell label="列車番号" value={train.trainNumber} />
            <InfoCell label="両数" value={`${train.cars}両`} />
            <InfoCell
              label={isSaal ? '始発' : '当区間の始発'}
              value={first ? `${first.stationName} ${first.dep}` : '-'}
            />
          </SimpleGrid>

          {/* 停車駅時刻表 */}
          <Box>
            <Text fz="xs" fw={700} c="dimmed" mb={8}>
              停車駅・時刻
            </Text>
            <Timeline active={activeIndex} bulletSize={14} lineWidth={3} color={mantineColor}>
              {train.stops.map((s, i) => {
                const isFirst = i === 0;
                const isLast = i === train.stops.length - 1;
                const isCurrent = status.kind === 'stopped' && status.index === i;
                const passed = i <= activeIndex && !isCurrent;
                const sameTime = s.arr === s.dep;
                return (
                  <Timeline.Item
                    key={`${s.stationId}-${i}`}
                    lineVariant={status.kind === 'running' && status.index === i ? 'dashed' : 'solid'}
                  >
                    <UnstyledButton onClick={() => handleStopClick(s.stationId)} w="100%">
                      <Group justify="space-between" wrap="nowrap" gap="xs">
                        <Group gap={6} wrap="nowrap">
                          <Text fz="sm" fw={isCurrent ? 800 : 700} c={passed ? 'dimmed' : undefined}>
                            {s.stationName}
                          </Text>
                          {isCurrent && (
                            <Badge size="xs" radius="sm" color={mantineColor} variant="light" tt="none">
                              停車中
                            </Badge>
                          )}
                        </Group>
                        <Group gap={8} wrap="nowrap">
                          <Text fz="sm" fw={600} c={passed ? 'dimmed' : undefined} className="tabular-nums">
                            {isFirst
                              ? `${s.dep} 発`
                              : isLast
                              ? `${s.arr} 着`
                              : sameTime
                              ? `${s.dep} 発`
                              : `${s.arr} 着 / ${s.dep} 発`}
                          </Text>
                          {s.track && (
                            <Text fz="xs" c="dimmed" w={32} ta="right" style={{ whiteSpace: 'nowrap' }}>
                              {s.track}番線
                            </Text>
                          )}
                        </Group>
                      </Group>
                    </UnstyledButton>
                  </Timeline.Item>
                );
              })}
            </Timeline>
          </Box>
        </Stack>
      )}
    </Drawer>
  );
};

const InfoCell: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <Paper withBorder radius="md" px={8} py={6}>
    <Text fz={10} c="dimmed" fw={700}>
      {label}
    </Text>
    <Text fz="sm" fw={800} style={{ whiteSpace: 'nowrap' }}>
      {value}
    </Text>
  </Paper>
);

export default TrainDetailSheet;
