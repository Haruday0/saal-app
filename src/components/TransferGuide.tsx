import React, { useState, useEffect } from 'react';
import { Paper, Stack, Group, Text, Divider, Button, UnstyledButton } from '@mantine/core';
import { Station } from '../types';
import { JisSubway, JisBus } from './icons';
import { Icon } from './Icon';
import { SubwayStationMark } from './SubwayStationMark';
import { SubwayTimetableModal } from './SubwayTimetableModal';
import {
  SubwayDirectionKey,
  SUBWAY_DIRECTIONS,
  getSubwayStationNameById,
  getAvailableSubwayDirections,
  getUpcomingSubwayTrains,
} from '../utils/subwaySchedule';

interface TransferGuideProps {
  station: Station;
}

interface RowProps {
  label: React.ReactNode;
  time: string;
}

/** 1行（路線・方面 ／ 時刻） */
const Row: React.FC<RowProps> = ({ label, time }) => (
  <Group justify="space-between" wrap="nowrap" gap="xs">
    <Text fz={12} c="dimmed" className="min-w-0">
      {label}
    </Text>
    <Text fz={12} fw={600} className="font-english tabular-nums shrink-0">
      {time}
    </Text>
  </Group>
);

/** 事業者ブロック（見出し＋内容カード） */
const Block: React.FC<{
  icon: React.ReactNode;
  title: string;
  rightAction?: React.ReactNode;
  children: React.ReactNode;
}> = ({ icon, title, rightAction, children }) => (
  <Stack gap={6}>
    <Group justify="space-between" align="center" wrap="nowrap">
      <Group gap={6} wrap="nowrap">
        {icon}
        <Text fz="xs" fw={700}>
          {title}
        </Text>
      </Group>
      {rightAction}
    </Group>
    <Paper p="xs" radius="md" bg="var(--mantine-color-default-hover)">
      <Stack gap={4}>{children}</Stack>
    </Paper>
  </Stack>
);

export const TransferGuide: React.FC<TransferGuideProps> = ({ station }) => {
  const stationId = station.id;

  const hasSubway = stationId === 'sendai' || stationId === 'nagamachi';
  const hasSendaiBus = ['sendai', 'nagamachi', 'taishido', 'minami-sendai'].includes(stationId);
  const hasMiyakouBus = stationId === 'nagamachi' || stationId === 'minami-sendai';
  const hasNatoringo = ['minami-sendai', 'natori', 'morisekinoshita', 'sendai-airport'].includes(
    stationId
  );

  // 15秒ごとに現在時刻を自動更新
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    if (!hasSubway) return;
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(timer);
  }, [hasSubway, stationId]);

  // 地下鉄時刻表モーダルの状態管理
  const [subwayModalOpen, setSubwayModalOpen] = useState(false);
  const [modalDirectionKey, setModalDirectionKey] =
    useState<SubwayDirectionKey>('namboku-north');
  const [modalInitialTrainId, setModalInitialTrainId] = useState<string | null>(null);

  const openSubwayTimetable = (
    dirKey: SubwayDirectionKey = 'namboku-north',
    trainId: string | null = null
  ) => {
    setModalDirectionKey(dirKey);
    setModalInitialTrainId(trainId);
    setSubwayModalOpen(true);
  };

  if (stationId === 'mitazono') {
    return (
      <Paper withBorder p="sm" radius="lg">
        <Text fz="xs" c="dimmed" ta="center">
          美田園駅にはバス・他社線の乗り換えはありません
        </Text>
      </Paper>
    );
  }

  const subwayStationName = getSubwayStationNameById(stationId);
  const subwayDirections = getAvailableSubwayDirections(stationId);

  return (
    <Paper withBorder p="sm" radius="lg">
      <Stack gap="sm">
        {/* 仙台市地下鉄（リアルタイム直近3本 ＆ 全駅時刻表・停車駅タイムラインモーダル連携） */}
        {hasSubway && subwayStationName && (
          <Block
            icon={<JisSubway size={15} color="#009944" />}
            title="仙台市地下鉄"
            rightAction={
              <Button
                size="compact-xs"
                variant="default"
                radius="xl"
                fw={700}
                leftSection={<Icon name="schedule" size={13} />}
                onClick={() => openSubwayTimetable('namboku-north', null)}
              >
                時刻表
              </Button>
            }
          >
            {subwayDirections.map((dirKey, idx) => {
              const meta = SUBWAY_DIRECTIONS[dirKey];
              const upcoming = getUpcomingSubwayTrains(subwayStationName, dirKey, now, 3);
              const showTozaiDivider = idx === 2 && dirKey === 'tozai-east';

              return (
                <React.Fragment key={dirKey}>
                  {showTozaiDivider && <Divider my={2} />}
                  <Group
                    justify="space-between"
                    wrap="nowrap"
                    gap={6}
                    py={2}
                    px={4}
                    style={{ borderRadius: 'var(--mantine-radius-sm)' }}
                    className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    {/* 左側: 路線記号丸枠マーク (N / T) + 路線・のりば・方面（タップでその方面の時刻表一覧を開く） */}
                    <UnstyledButton
                      onClick={() => openSubwayTimetable(dirKey, null)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <Group gap={6} wrap="nowrap" align="center">
                        <SubwayStationMark line={meta.lineId} code={meta.lineCode} size={18} />
                        <Text
                          fz={12}
                          fw={600}
                          c="var(--mantine-color-text)"
                          className="truncate"
                        >
                          {meta.lineName} {meta.track}番線
                          <Text component="span" fz={11.5} fw={500} c="dimmed" ml={3}>
                            （{meta.directionLabel}）
                          </Text>
                        </Text>
                      </Group>
                    </UnstyledButton>

                    {/* 右側: 直近3本の発車時刻（各時刻タップでその便の全停車駅タイムラインを直接開く） */}
                    {upcoming.length > 0 ? (
                      <Group
                        gap={3}
                        wrap="nowrap"
                        align="center"
                        className="font-english tabular-nums shrink-0"
                      >
                        {upcoming.map((item, tIdx) => (
                          <React.Fragment key={item.train.id}>
                            {tIdx > 0 && (
                              <Text component="span" fz={11} c="dimmed">
                                /
                              </Text>
                            )}
                            <UnstyledButton
                              onClick={() => openSubwayTimetable(dirKey, item.train.id)}
                              px={3}
                              py={1}
                              style={{ borderRadius: 4 }}
                              className="hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                              title={`${item.departureTime}発 ${item.terminalStation}行の全停車駅時刻を表示`}
                            >
                              <Text
                                component="span"
                                fz={12}
                                fw={tIdx === 0 ? 800 : 600}
                                c={tIdx === 0 ? meta.mantineColor : undefined}
                              >
                                {item.departureTime}
                              </Text>
                            </UnstyledButton>
                          </React.Fragment>
                        ))}
                      </Group>
                    ) : (
                      <UnstyledButton
                        onClick={() => openSubwayTimetable(dirKey, null)}
                        className="shrink-0"
                      >
                        <Text fz={11} c="dimmed">
                          運転終了（時刻表）
                        </Text>
                      </UnstyledButton>
                    )}
                  </Group>
                </React.Fragment>
              );
            })}
          </Block>
        )}

        {/* 仙台市営バス */}
        {hasSendaiBus && (
          <Block icon={<JisBus size={15} color="#059669" />} title="仙台市営バス（直近発車）">
            <Row
              label={
                <>
                  <Text component="span" fz={12} fw={500} c="var(--mantine-color-text)">
                    [60] 交通局東北大学病院前行
                  </Text>
                  <Text component="span" fz={11} c="dimmed" ml={8}>
                    1番のりば
                  </Text>
                </>
              }
              time="15:45"
            />
          </Block>
        )}

        {/* 宮城交通バス */}
        {hasMiyakouBus && (
          <Block icon={<JisBus size={15} color="#b91c1c" />} title="宮城交通バス">
            <Row label="八木山動物公園駅・山田方面" time="15:50 / 16:15" />
          </Block>
        )}

        {/* なとりん号 */}
        {hasNatoringo && (
          <Block icon={<JisBus size={15} color="#d97706" />} title="コミュニティバス「なとりん号」">
            <Row label="閖上線（閖上方面）" time="15:40" />
            <Row label="愛島線（愛島台方面）" time="16:10" />
          </Block>
        )}
      </Stack>

      {/* 仙台市地下鉄 時刻表＆全停車駅タイムラインモーダル */}
      {hasSubway && (
        <SubwayTimetableModal
          isOpen={subwayModalOpen}
          onClose={() => setSubwayModalOpen(false)}
          stationId={stationId}
          initialDirectionKey={modalDirectionKey}
          initialTrainId={modalInitialTrainId}
          now={now}
        />
      )}
    </Paper>
  );
};
