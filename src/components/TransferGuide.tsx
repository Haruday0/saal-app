import React, { useState, useEffect, useCallback } from 'react';
import {
  Paper,
  Stack,
  Group,
  Text,
  Badge,
  Button,
  UnstyledButton,
  Box,
  Divider,
  Loader,
} from '@mantine/core';
import { Station } from '../types';
import { JisSubway, JisBus } from './icons';
import { Icon } from './Icon';
import { BusDepartureRow, BusDepartureRowSkeleton } from './BusDepartureRow';
import { SubwayDepartureRow } from './SubwayDepartureRow';
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

/** 共通事業者セクションヘッダー */
interface TransportSectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  badgeLabel?: string;
  rightAction?: React.ReactNode;
}

const TransportSectionHeader: React.FC<TransportSectionHeaderProps> = ({
  icon,
  title,
  badgeLabel,
  rightAction,
}) => (
  <Group
    justify="space-between"
    align="center"
    wrap="nowrap"
    px="sm"
    py={8}
    style={{
      borderBottom: '1px solid var(--mantine-color-default-border)',
      backgroundColor: 'var(--mantine-color-default-hover)',
    }}
  >
    <Group gap={8} wrap="nowrap" align="center">
      <span className="text-black dark:text-white shrink-0 flex items-center">
        {icon}
      </span>
      <Text fw={800} fz="sm" c="var(--mantine-color-text)">
        {title}
      </Text>
      {badgeLabel && (
        <Badge size="xs" variant="light" color="gray" radius="sm" fw={700}>
          {badgeLabel}
        </Badge>
      )}
    </Group>
    {rightAction}
  </Group>
);

export const TransferGuide: React.FC<TransferGuideProps> = ({ station }) => {
  const stationId = station.id;

  const hasSubway = stationId === 'sendai' || stationId === 'nagamachi';
  const hasSendaiBus = [
    'sendai',
    'nagamachi',
    'taishido',
    'minami-sendai',
  ].includes(stationId);
  const hasNatoringo = [
    'minami-sendai',
    'natori',
    'morisekinoshita',
    'sendai-airport',
  ].includes(stationId);

  // アプリ基準時刻（実時刻またはデバッグシミュレーション時刻）
  const { now } = useDebug();

  // 仙台市営バス API データ取得状態管理
  const [sendaiBusSchedule, setSendaiBusSchedule] =
    useState<SendaiBusStationSchedule | null>(null);
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
    setSelectedSendaiBusFilterKey(null);
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
  const [modalInitialTrainId, setModalInitialTrainId] = useState<string | null>(
    null
  );

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
  const [selectedSendaiBusFilterKey, setSelectedSendaiBusFilterKey] = useState<
    string | null
  >(null);
  const [sendaiBusInitialDepId, setSendaiBusInitialDepId] = useState<
    string | null
  >(null);

  const openSendaiBusTimetable = (
    departureId: string | null = null,
    filterKey: string | null = null
  ) => {
    setSendaiBusInitialDepId(departureId);
    if (filterKey !== null) {
      setSelectedSendaiBusFilterKey(filterKey);
    }
    setSendaiBusModalOpen(true);
  };

  // なとりん号時刻表モーダルの状態管理
  const [natoringoModalOpen, setNatoringoModalOpen] = useState(false);
  const [natoringoInitialStopId, setNatoringoInitialStopId] = useState<
    string | null
  >(null);
  const [natoringoInitialDepId, setNatoringoInitialDepId] = useState<
    string | null
  >(null);

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
      <Paper withBorder p="md" radius="lg">
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
    <Stack gap="sm">
      {/* 1. 仙台市地下鉄（南北線・東西線） */}
      {hasSubway && subwayStationName && (
        <Paper withBorder radius="lg" style={{ overflow: 'hidden' }}>
          <TransportSectionHeader
            icon={<JisSubway size={18} />}
            title="仙台市地下鉄"
            badgeLabel={`${subwayDirections.length}方面`}
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
          />

          <Stack gap={0}>
            {subwayDirections.map((dirKey, idx) => {
              const meta = SUBWAY_DIRECTIONS[dirKey];
              const upcoming = getUpcomingSubwayTrains(
                subwayStationName,
                dirKey,
                now,
                3
              );
              const showTozaiDivider = idx === 2 && dirKey === 'tozai-east';

              return (
                <React.Fragment key={dirKey}>
                  {showTozaiDivider && (
                    <Divider
                      label="東西線"
                      labelPosition="left"
                      styles={{
                        label: {
                          fontSize: 11,
                          fontWeight: 700,
                          color: 'var(--mantine-color-dimmed)',
                        },
                      }}
                    />
                  )}
                  <SubwayDepartureRow
                    lineId={meta.lineId}
                    lineName={meta.lineName}
                    lineCode={meta.lineCode}
                    track={meta.track}
                    directionLabel={meta.directionLabel}
                    mantineColor={meta.mantineColor}
                    upcomingTrains={upcoming}
                    onSelectDirection={() => openSubwayTimetable(dirKey, null)}
                    onSelectTrain={(trainId) =>
                      openSubwayTimetable(dirKey, trainId)
                    }
                    isLast={idx === subwayDirections.length - 1}
                  />
                </React.Fragment>
              );
            })}
          </Stack>
        </Paper>
      )}

      {/* 2. 仙台市営バス */}
      {hasSendaiBus && (
        <Paper withBorder radius="lg" style={{ overflow: 'hidden' }}>
          <TransportSectionHeader
            icon={<JisBus size={18} color={SENDAI_BUS_COLOR} />}
            title="仙台市営バス"
            badgeLabel={
              sendaiBusSchedule
                ? `${sendaiBusSchedule.stopIds.length}のりば`
                : 'リアルタイム'
            }
            rightAction={
              <Button
                size="compact-xs"
                variant="default"
                radius="xl"
                fw={700}
                leftSection={<Icon name="schedule" size={13} />}
                onClick={() => {
                  if (!sendaiBusSchedule && !sendaiBusLoading) {
                    loadSendaiBusData(true, false);
                  }
                  openSendaiBusTimetable(null, selectedSendaiBusFilterKey);
                }}
              >
                時刻表
              </Button>
            }
          />

          {/* sendai-bus-map-v2 準拠ののりば選択ピル（全のりば / 各のりば切り替え） */}
          {sendaiBusSchedule && sendaiBusSchedule.filterOptions.length > 1 && (
            <Box
              px={12}
              py={8}
              style={{
                backgroundColor: 'var(--mantine-color-default-hover)',
                borderBottom: '1px solid var(--mantine-color-default-border)',
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              <Group gap={6} wrap="nowrap">
                <Button
                  size="compact-xs"
                  radius="xl"
                  variant={selectedSendaiBusFilterKey === null ? 'filled' : 'default'}
                  style={
                    selectedSendaiBusFilterKey === null
                      ? {
                          backgroundColor: SENDAI_BUS_COLOR,
                          color: '#ffffff',
                        }
                      : undefined
                  }
                  onClick={() => setSelectedSendaiBusFilterKey(null)}
                  fw={700}
                  className="shrink-0"
                >
                  すべてのりば
                </Button>
                {sendaiBusSchedule.filterOptions.map((opt) => {
                  const isSelected = selectedSendaiBusFilterKey === opt.key;
                  return (
                    <Button
                      key={opt.key}
                      size="compact-xs"
                      radius="xl"
                      variant={isSelected ? 'filled' : 'default'}
                      style={
                        isSelected
                          ? {
                              backgroundColor: SENDAI_BUS_COLOR,
                              color: '#ffffff',
                            }
                          : undefined
                      }
                      onClick={() =>
                        setSelectedSendaiBusFilterKey(isSelected ? null : opt.key)
                      }
                      fw={700}
                      className="shrink-0"
                    >
                      {opt.label}
                    </Button>
                  );
                })}
              </Group>
            </Box>
          )}

          {sendaiBusLoading && !sendaiBusSchedule ? (
            <Stack gap={0} style={{ minHeight: 220 }}>
              <Box
                px="sm"
                py={6}
                style={{
                  borderBottom: '1px solid var(--mantine-color-default-border)',
                  backgroundColor: 'var(--mantine-color-default-hover)',
                }}
              >
                <Group gap={8} align="center" wrap="nowrap">
                  <Loader size="xs" color={SENDAI_BUS_COLOR} />
                  <Text fz={12} fw={600} c="dimmed">
                    市営バス直近発車・遅延情報を取得中...
                  </Text>
                </Group>
              </Box>
              <BusDepartureRowSkeleton />
              <BusDepartureRowSkeleton />
              <BusDepartureRowSkeleton isLast />
            </Stack>
          ) : sendaiBusError && !sendaiBusSchedule ? (
            <Group justify="space-between" align="center" p="sm" wrap="nowrap">
              <Text fz={12} c="dimmed">
                市営バス情報の取得に失敗しました
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
            (() => {
              const upcoming = getUpcomingSendaiBusDepartures(
                sendaiBusSchedule,
                now,
                6,
                selectedSendaiBusFilterKey
              );

              if (upcoming.length === 0) {
                return (
                  <Box py="md" px="sm">
                    <Text fz={12} c="dimmed" ta="center">
                      本日の運行は終了しました
                    </Text>
                  </Box>
                );
              }

              return (
                <Stack gap={0}>
                  {upcoming.map((dep, dIdx) => (
                    <BusDepartureRow
                      key={dep.id}
                      routeCode={dep.routeCode}
                      routeColor={dep.routeColor}
                      routeTextColor={dep.routeTextColor}
                      headsign={dep.headsign}
                      via={dep.via}
                      platform={dep.platform}
                      departureTime={dep.departureTime}
                      isDelayed={dep.isDelayed}
                      delayMinutes={dep.delayMinutes}
                      expectedTime={dep.expectedTime}
                      showDelay={true}
                      isNext={dIdx === 0}
                      onClick={() =>
                        openSendaiBusTimetable(dep.id, selectedSendaiBusFilterKey)
                      }
                      isLast={dIdx === upcoming.length - 1}
                    />
                  ))}
                </Stack>
              );
            })()
          ) : null}
        </Paper>
      )}

      {/* 3. 名取市コミュニティバス「なとりん号」 */}
      {hasNatoringo && natoringoStation && (
        <Paper withBorder radius="lg" style={{ overflow: 'hidden' }}>
          <TransportSectionHeader
            icon={<JisBus size={18} />}
            title="名取市 なとりん号"
            badgeLabel={`${natoringoStation.busStops.length}バス停`}
            rightAction={
              <Button
                size="compact-xs"
                variant="default"
                radius="xl"
                fw={700}
                leftSection={<Icon name="schedule" size={13} />}
                onClick={() =>
                  openNatoringoTimetable(
                    natoringoStation.busStops[0]?.stopId ?? null,
                    null
                  )
                }
              >
                時刻表
              </Button>
            }
          />

          <Stack gap={0}>
            {natoringoStation.busStops.map((busStop, sIdx) => {
              const limit = stationId === 'morisekinoshita' ? 4 : 3;
              const upcoming = getUpcomingNatoringoDepartures(
                stationId,
                busStop.stopId,
                now,
                limit
              );

              return (
                <Box key={busStop.stopId}>
                  {/* バス停サブヘッダー */}
                  <Box
                    py={4}
                    px={12}
                    style={{
                      backgroundColor: 'var(--mantine-color-default-hover)',
                      borderTop:
                        sIdx > 0
                          ? '1px solid var(--mantine-color-default-border)'
                          : undefined,
                      borderBottom:
                        '1px solid var(--mantine-color-default-border)',
                    }}
                  >
                    <Group justify="space-between" wrap="nowrap" align="center">
                      <Group gap={6} wrap="nowrap" className="min-w-0">
                        <Badge
                          size="xs"
                          radius="sm"
                          variant="filled"
                          color="gray"
                          fw={700}
                          tt="none"
                          className="shrink-0"
                        >
                          {busStop.stopName}
                        </Badge>
                        <Text
                          fz={11}
                          fw={500}
                          c="dimmed"
                          className="truncate"
                        >
                          {busStop.lines.map((l) => l.lineName).join('・')}
                        </Text>
                      </Group>

                      <UnstyledButton
                        onClick={() =>
                          openNatoringoTimetable(busStop.stopId, null)
                        }
                        className="shrink-0"
                      >
                        <Group gap={2} wrap="nowrap" align="center">
                          <Text fz={10.5} c="dimmed" fw={600}>
                            全便
                          </Text>
                          <Icon
                            name="chevron_right"
                            size={13}
                            className="text-slate-400 dark:text-slate-500"
                          />
                        </Group>
                      </UnstyledButton>
                    </Group>
                  </Box>

                  {/* 直近発車便リスト */}
                  {upcoming.length > 0 ? (
                    <div>
                      {upcoming.map((dep, dIdx) => (
                        <BusDepartureRow
                          key={dep.id}
                          routeCode={dep.routeCode}
                          routeColor={dep.routeColor}
                          headsign={dep.headsign}
                          lineName={dep.lineName}
                          platform={busStop.stopName}
                          departureTime={dep.departureTime}
                          isNext={dIdx === 0}
                          onClick={() =>
                            openNatoringoTimetable(busStop.stopId, dep.id)
                          }
                          isLast={
                            dIdx === upcoming.length - 1 &&
                            sIdx === natoringoStation.busStops.length - 1
                          }
                        />
                      ))}
                    </div>
                  ) : (
                    <Box
                      py={8}
                      px={14}
                      style={{
                        borderBottom:
                          sIdx === natoringoStation.busStops.length - 1
                            ? 'none'
                            : '1px solid var(--mantine-color-default-border)',
                      }}
                    >
                      <Group justify="space-between" align="center">
                        <Text fz={11.5} c="dimmed">
                          本日の運行は終了しました
                        </Text>
                        <UnstyledButton
                          onClick={() =>
                            openNatoringoTimetable(busStop.stopId, null)
                          }
                        >
                          <Text fz={11} fw={700} c="blue">
                            時刻表を見る →
                          </Text>
                        </UnstyledButton>
                      </Group>
                    </Box>
                  )}
                </Box>
              );
            })}
          </Stack>
        </Paper>
      )}

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
          stationName={station.name}
          isLoading={sendaiBusLoading}
          initialDepartureId={sendaiBusInitialDepId}
          initialFilterKey={selectedSendaiBusFilterKey}
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
    </Stack>
  );
};
