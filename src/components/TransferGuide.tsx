import React, { useState, useEffect, useCallback } from 'react';
import {
  Paper,
  Stack,
  Group,
  Text,
  Divider,
  Button,
  UnstyledButton,
  Badge,
  Loader,
  Skeleton,
} from '@mantine/core';
import { Station } from '../types';
import { JisSubway, JisBus } from './icons';
import { Icon } from './Icon';
import { SubwayStationMark } from './SubwayStationMark';
import { SubwayTimetableModal } from './SubwayTimetableModal';
import { NatoringoTimetableModal } from './NatoringoTimetableModal';
import { SendaiBusTimetableModal } from './SendaiBusTimetableModal';
import {
  SubwayDirectionKey,
  SUBWAY_DIRECTIONS,
  getSubwayStationNameById,
  getAvailableSubwayDirections,
  getUpcomingSubwayTrains,
} from '../utils/subwaySchedule';
import {
  getNatoringoStationSchedule,
  getUpcomingNatoringoDepartures,
} from '../utils/natoringoSchedule';
import {
  SENDAI_BUS_COLOR,
  SendaiBusStationSchedule,
  fetchSendaiBusStationSchedule,
  getUpcomingSendaiBusDepartures,
} from '../utils/sendaiBusApi';
import { useDebug } from '../context/DebugContext';

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

  // アプリ基準時刻（実時刻またはデバッグシミュレーション時刻）
  const { now } = useDebug();

  // 仙台市営バス API データ取得状態管理
  const [sendaiBusSchedule, setSendaiBusSchedule] = useState<SendaiBusStationSchedule | null>(
    null
  );
  const [sendaiBusLoading, setSendaiBusLoading] = useState<boolean>(false);
  const [sendaiBusError, setSendaiBusError] = useState<boolean>(false);

  const loadSendaiBusData = useCallback(
    async (isInitial: boolean, forceRefresh = false) => {
      if (!hasSendaiBus) return;
      if (isInitial) {
        setSendaiBusLoading(true);
        setSendaiBusError(false);
      }
      try {
        const data = await fetchSendaiBusStationSchedule(stationId, forceRefresh);
        setSendaiBusSchedule(data);
        setSendaiBusError(false);
      } catch {
        if (isInitial) {
          setSendaiBusError(true);
        }
      } finally {
        if (isInitial) {
          setSendaiBusLoading(false);
        }
      }
    },
    [hasSendaiBus, stationId]
  );

  useEffect(() => {
    if (!hasSendaiBus) {
      setSendaiBusSchedule(null);
      setSendaiBusLoading(false);
      setSendaiBusError(false);
      return;
    }

    let cancelled = false;
    setSendaiBusSchedule(null);
    setSendaiBusLoading(true);
    setSendaiBusError(false);

    fetchSendaiBusStationSchedule(stationId, false)
      .then((data) => {
        if (cancelled) return;
        setSendaiBusSchedule(data);
        setSendaiBusError(false);
      })
      .catch(() => {
        if (cancelled) return;
        setSendaiBusError(true);
      })
      .finally(() => {
        if (cancelled) return;
        setSendaiBusLoading(false);
      });

    // 30秒ごとにリアルタイム遅延情報をバックグラウンド更新
    const refreshTimer = setInterval(() => {
      fetchSendaiBusStationSchedule(stationId, false)
        .then((data) => {
          if (!cancelled && data) {
            setSendaiBusSchedule(data);
          }
        })
        .catch(() => {
          // バックグラウンド更新失敗時は既存表示を維持
        });
    }, 30000);

    return () => {
      cancelled = true;
      clearInterval(refreshTimer);
    };
  }, [hasSendaiBus, stationId]);

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

  // 仙台市営バス時刻表モーダルの状態管理
  const [sendaiBusModalOpen, setSendaiBusModalOpen] = useState(false);
  const [sendaiBusInitialGroupId, setSendaiBusInitialGroupId] = useState<string | null>(null);
  const [sendaiBusInitialDepId, setSendaiBusInitialDepId] = useState<string | null>(null);

  const openSendaiBusTimetable = (
    groupId: string | null = null,
    departureId: string | null = null
  ) => {
    setSendaiBusInitialGroupId(groupId);
    setSendaiBusInitialDepId(departureId);
    setSendaiBusModalOpen(true);
  };

  // なとりん号時刻表モーダルの状態管理
  const [natoringoModalOpen, setNatoringoModalOpen] = useState(false);
  const [natoringoInitialStopId, setNatoringoInitialStopId] = useState<string | null>(null);
  const [natoringoInitialDepId, setNatoringoInitialDepId] = useState<string | null>(null);

  const openNatoringoTimetable = (
    stopId: string | null = null,
    departureId: string | null = null
  ) => {
    setNatoringoInitialStopId(stopId);
    setNatoringoInitialDepId(departureId);
    setNatoringoModalOpen(true);
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
  const natoringoStation = getNatoringoStationSchedule(stationId);

  return (
    <Paper withBorder p="sm" radius="lg">
      <Stack gap="sm">
        {/* 仙台市地下鉄（リアルタイム直近3本 ＆ 全駅時刻表・停車駅タイムラインモーダル連携） */}
        {hasSubway && subwayStationName && (
          <Block
            icon={<JisSubway size={15} color="#168B50" />}
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
                        <SubwayStationMark line={meta.lineId} code={meta.lineCode} size={22} />
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

        {/* 仙台市営バス（Sendai Bus Map V2 API 連携・のりばグループ別直近発車・リアルタイム遅延・時刻表＆全停車バス停タイムライン） */}
        {hasSendaiBus && (
          <Block
            icon={<JisBus size={15} color={SENDAI_BUS_COLOR} />}
            title="仙台市営バス"
            rightAction={
              sendaiBusSchedule ? (
                <Button
                  size="compact-xs"
                  variant="default"
                  radius="xl"
                  fw={700}
                  leftSection={<Icon name="schedule" size={13} />}
                  onClick={() =>
                    openSendaiBusTimetable(
                      sendaiBusSchedule.groups[0]?.groupId ?? null,
                      null
                    )
                  }
                >
                  時刻表
                </Button>
              ) : undefined
            }
          >
            {sendaiBusLoading && !sendaiBusSchedule ? (
              <Stack gap={6} py={4} px={2}>
                <Group gap={8} align="center" wrap="nowrap">
                  <Loader size="sm" color={SENDAI_BUS_COLOR} />
                  <Text fz={11.5} fw={600} c="dimmed">
                    市営バス時刻・リアルタイム運行情報を取得中...
                  </Text>
                </Group>
                <Skeleton height={22} radius="sm" />
                <Skeleton height={22} radius="sm" />
              </Stack>
            ) : sendaiBusError && !sendaiBusSchedule ? (
              <Group justify="space-between" align="center" py={4} px={4} wrap="nowrap">
                <Text fz={11.5} c="dimmed">
                  市営バス運行情報の取得に失敗しました
                </Text>
                <Button
                  size="compact-xs"
                  variant="default"
                  radius="md"
                  fw={700}
                  leftSection={<Icon name="refresh" size={13} />}
                  onClick={() => loadSendaiBusData(true, true)}
                >
                  再試行
                </Button>
              </Group>
            ) : sendaiBusSchedule ? (
              sendaiBusSchedule.groups.map((group, gIdx) => {
                const upcoming = getUpcomingSendaiBusDepartures(group, now);

                return (
                  <React.Fragment key={group.groupId}>
                    {gIdx > 0 && <Divider my={4} />}
                    <Stack gap={3}>
                      {/* のりばグループ見出し行（タップでそのグループの全時刻表一覧を開く） */}
                      <UnstyledButton
                        onClick={() => openSendaiBusTimetable(group.groupId, null)}
                        py={2}
                        px={4}
                        style={{ borderRadius: 'var(--mantine-radius-sm)' }}
                        className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
                      >
                        <Group justify="space-between" wrap="nowrap" gap={6}>
                          <Group gap={6} wrap="nowrap" align="center" className="min-w-0">
                            <Badge
                              size="xs"
                              radius="sm"
                              variant="default"
                              fw={700}
                              tt="none"
                              className="shrink-0"
                            >
                              {group.shortTitle}
                            </Badge>
                            <Text fz={11} c="dimmed" className="truncate">
                              {group.title}
                            </Text>
                          </Group>
                          <Group gap={2} wrap="nowrap" align="center" className="shrink-0">
                            <Text fz={10.5} c="dimmed" fw={600}>
                              一覧
                            </Text>
                            <Icon
                              name="chevron_right"
                              size={13}
                              className="text-slate-400 dark:text-slate-500"
                            />
                          </Group>
                        </Group>
                      </UnstyledButton>

                      {/* 直近発車便リスト（各便タップで全停車バス停タイムラインを直接開く） */}
                      {upcoming.length > 0 ? (
                        <Stack gap={2}>
                          {upcoming.map((dep, dIdx) => (
                            <UnstyledButton
                              key={dep.id}
                              onClick={() => openSendaiBusTimetable(group.groupId, dep.id)}
                              py={3}
                              px={6}
                              style={{ borderRadius: 'var(--mantine-radius-sm)' }}
                              className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                              title={`${dep.departureTime}発 [${dep.routeCode}] ${dep.headsign}行の全停車バス停を表示`}
                            >
                              <Group justify="space-between" wrap="nowrap" gap={6}>
                                <Group
                                  gap={6}
                                  wrap="nowrap"
                                  align="center"
                                  className="min-w-0"
                                >
                                  <Badge
                                    size="xs"
                                    radius="sm"
                                    tt="none"
                                    fw={800}
                                    style={{
                                      backgroundColor: SENDAI_BUS_COLOR,
                                      color: '#ffffff',
                                      flexShrink: 0,
                                      minWidth: 42,
                                      textAlign: 'center',
                                    }}
                                  >
                                    {dep.routeCode}
                                  </Badge>
                                  <Text
                                    fz={12}
                                    fw={dIdx === 0 ? 700 : 500}
                                    c="var(--mantine-color-text)"
                                    className="truncate"
                                  >
                                    {dep.headsign}行
                                  </Text>
                                  {dep.via && (
                                    <Text
                                      fz={10.5}
                                      c="dimmed"
                                      className="truncate"
                                    >
                                      （{dep.via}）
                                    </Text>
                                  )}
                                  {dep.platform && (
                                    <Text
                                      fz={11}
                                      c="dimmed"
                                      fw={600}
                                      className="shrink-0"
                                    >
                                      {dep.platform}番のりば
                                    </Text>
                                  )}
                                </Group>

                                <Group
                                  gap={4}
                                  wrap="nowrap"
                                  align="center"
                                  className="font-english tabular-nums shrink-0"
                                >
                                  {dep.isDelayed && (
                                    <Badge
                                      size="xs"
                                      color="red"
                                      variant="light"
                                      radius="sm"
                                      tt="none"
                                      fw={700}
                                      className="shrink-0"
                                    >
                                      +{dep.delayMinutes}分遅れ
                                    </Badge>
                                  )}
                                  <Text
                                    fz={12.5}
                                    fw={dIdx === 0 ? 800 : 600}
                                    style={
                                      dep.isDelayed
                                        ? { color: 'var(--mantine-color-red-6)' }
                                        : dIdx === 0
                                          ? { color: SENDAI_BUS_COLOR }
                                          : undefined
                                    }
                                  >
                                    {dep.isDelayed ? dep.expectedTime : dep.departureTime}
                                  </Text>
                                  <Icon
                                    name="chevron_right"
                                    size={13}
                                    className="text-slate-400 dark:text-slate-500"
                                  />
                                </Group>
                              </Group>
                            </UnstyledButton>
                          ))}
                        </Stack>
                      ) : (
                        <UnstyledButton
                          onClick={() => openSendaiBusTimetable(group.groupId, null)}
                          py={2}
                          px={6}
                          style={{ borderRadius: 'var(--mantine-radius-sm)' }}
                          className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
                        >
                          <Text fz={11} c="dimmed">
                            本日の運行は終了しました（タップで時刻表を表示）
                          </Text>
                        </UnstyledButton>
                      )}
                    </Stack>
                  </React.Fragment>
                );
              })
            ) : null}
          </Block>
        )}

        {/* 宮城交通バス */}
        {hasMiyakouBus && (
          <Block icon={<JisBus size={15} color="#b91c1c" />} title="宮城交通バス">
            <Row label="八木山動物公園駅・山田方面" time="15:50 / 16:15" />
          </Block>
        )}

        {/* なとりん号（GTFSリアルタイム直近発車 ＆ 路線絞り込み付き時刻表・全停車バス停＆運賃タイムラインモーダル連携） */}
        {hasNatoringo && natoringoStation && (
          <Block
            icon={<JisBus size={15} color="#d97706" />}
            title="なとりん号"
            rightAction={
              <Button
                size="compact-xs"
                variant="default"
                radius="xl"
                fw={700}
                leftSection={<Icon name="schedule" size={13} />}
                onClick={() =>
                  openNatoringoTimetable(natoringoStation.busStops[0]?.stopId ?? null, null)
                }
              >
                時刻表
              </Button>
            }
          >
            {natoringoStation.busStops.map((busStop, sIdx) => {
              const limit = stationId === 'morisekinoshita' ? 4 : 3;
              const upcoming = getUpcomingNatoringoDepartures(
                stationId,
                busStop.stopId,
                now,
                limit
              );

              return (
                <React.Fragment key={busStop.stopId}>
                  {sIdx > 0 && <Divider my={4} />}
                  <Stack gap={3}>
                    {/* のりば見出し行（タップでそのバス停の全時刻表一覧を開く） */}
                    <UnstyledButton
                      onClick={() => openNatoringoTimetable(busStop.stopId, null)}
                      py={2}
                      px={4}
                      style={{ borderRadius: 'var(--mantine-radius-sm)' }}
                      className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
                    >
                      <Group justify="space-between" wrap="nowrap" gap={6}>
                        <Group gap={6} wrap="nowrap" align="center" className="min-w-0">
                          <Badge
                            size="xs"
                            radius="sm"
                            variant="default"
                            fw={700}
                            tt="none"
                            className="shrink-0"
                          >
                            {busStop.stopName}
                          </Badge>
                          <Text fz={11} c="dimmed" className="truncate">
                            {busStop.lines.map((l) => l.lineName).join('・')}
                          </Text>
                        </Group>
                        <Group gap={2} wrap="nowrap" align="center" className="shrink-0">
                          <Text fz={10.5} c="dimmed" fw={600}>
                            一覧
                          </Text>
                          <Icon
                            name="chevron_right"
                            size={13}
                            className="text-slate-400 dark:text-slate-500"
                          />
                        </Group>
                      </Group>
                    </UnstyledButton>

                    {/* 直近発車便リスト（各便タップで全停車バス停＆運賃タイムラインを直接開く） */}
                    {upcoming.length > 0 ? (
                      <Stack gap={2}>
                        {upcoming.map((dep, dIdx) => (
                          <UnstyledButton
                            key={dep.id}
                            onClick={() => openNatoringoTimetable(busStop.stopId, dep.id)}
                            py={3}
                            px={6}
                            style={{ borderRadius: 'var(--mantine-radius-sm)' }}
                            className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                            title={`${dep.departureTime}発 ${dep.routeCode} ${dep.headsign}行の全停車バス停・運賃を表示`}
                          >
                            <Group justify="space-between" wrap="nowrap" gap={6}>
                              <Group gap={6} wrap="nowrap" align="center" className="min-w-0">
                                <Badge
                                  size="xs"
                                  radius="sm"
                                  tt="none"
                                  fw={800}
                                  style={{
                                    backgroundColor: dep.routeColor,
                                    color: '#ffffff',
                                    flexShrink: 0,
                                    minWidth: 48,
                                    textAlign: 'center',
                                  }}
                                >
                                  {dep.routeCode}
                                </Badge>
                                <Text
                                  fz={12}
                                  fw={dIdx === 0 ? 700 : 500}
                                  c="var(--mantine-color-text)"
                                  className="truncate"
                                >
                                  {dep.headsign}行
                                </Text>
                                <Text
                                  fz={11}
                                  c="dimmed"
                                  className="truncate shrink-0"
                                >
                                  {dep.lineName}
                                </Text>
                              </Group>

                              <Group
                                gap={4}
                                wrap="nowrap"
                                align="center"
                                className="font-english tabular-nums shrink-0"
                              >
                                <Text
                                  fz={12.5}
                                  fw={dIdx === 0 ? 800 : 600}
                                  style={
                                    dIdx === 0 ? { color: dep.routeColor } : undefined
                                  }
                                >
                                  {dep.departureTime}
                                </Text>
                                <Icon
                                  name="chevron_right"
                                  size={13}
                                  className="text-slate-400 dark:text-slate-500"
                                />
                              </Group>
                            </Group>
                          </UnstyledButton>
                        ))}
                      </Stack>
                    ) : (
                      <UnstyledButton
                        onClick={() => openNatoringoTimetable(busStop.stopId, null)}
                        py={2}
                        px={6}
                        style={{ borderRadius: 'var(--mantine-radius-sm)' }}
                        className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
                      >
                        <Text fz={11} c="dimmed">
                          本日の運行は終了しました（タップで時刻表を表示）
                        </Text>
                      </UnstyledButton>
                    )}
                  </Stack>
                </React.Fragment>
              );
            })}
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

      {/* 仙台市営バス 時刻表＆全停車バス停タイムラインモーダル */}
      {hasSendaiBus && (
        <SendaiBusTimetableModal
          isOpen={sendaiBusModalOpen}
          onClose={() => setSendaiBusModalOpen(false)}
          stationSchedule={sendaiBusSchedule}
          initialGroupId={sendaiBusInitialGroupId}
          initialDepartureId={sendaiBusInitialDepId}
          now={now}
        />
      )}

      {/* なとりん号 時刻表＆全停車バス停・運賃タイムラインモーダル */}
      {hasNatoringo && (
        <NatoringoTimetableModal
          isOpen={natoringoModalOpen}
          onClose={() => setNatoringoModalOpen(false)}
          stationId={stationId}
          initialStopId={natoringoInitialStopId}
          initialDepartureId={natoringoInitialDepId}
          now={now}
        />
      )}
    </Paper>
  );
};
