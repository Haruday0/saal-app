import React, { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Card,
  Chip,
  EmptyState,
  ListBox,
  Separator,
  Spinner,
  Surface,
} from '@heroui/react';
import { Station } from '../types';
import { JisSubway, JisBus } from './icons';
import { Icon } from './Icon';
import { SubwayStationMark } from './SubwayStationMark';
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
  MIN_SKELETON_TIME,
} from '../utils/sendaiBusApi';
export { MIN_SKELETON_TIME };
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
  <Surface
    variant="secondary"
    className="flex items-center justify-between px-3 py-2 border-b border-border"
  >
    <div className="flex items-center gap-2 flex-nowrap">
      <span className="text-foreground shrink-0 flex items-center">
        {icon}
      </span>
      <span className="font-extrabold text-sm text-foreground">
        {title}
      </span>
      {badgeLabel && (
        <Chip size="sm" variant="soft" color="default" className="text-[11px] font-bold">
          {badgeLabel}
        </Chip>
      )}
    </div>
    {rightAction}
  </Surface>
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
      const startTime = Date.now();
      try {
        const data = await fetchSendaiBusStationSchedule(stationId, forceRefresh);
        if (isInitial) {
          const elapsed = Date.now() - startTime;
          if (elapsed < MIN_SKELETON_TIME) {
            await new Promise((resolve) =>
              setTimeout(resolve, MIN_SKELETON_TIME - elapsed)
            );
          }
        }
        setSendaiBusSchedule(data);
        setSendaiBusError(false);
      } catch {
        if (isInitial) {
          const elapsed = Date.now() - startTime;
          if (elapsed < MIN_SKELETON_TIME) {
            await new Promise((resolve) =>
              setTimeout(resolve, MIN_SKELETON_TIME - elapsed)
            );
          }
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

    const startTime = Date.now();

    (async () => {
      try {
        const data = await fetchSendaiBusStationSchedule(stationId, false);
        const elapsed = Date.now() - startTime;
        if (elapsed < MIN_SKELETON_TIME) {
          await new Promise((resolve) =>
            setTimeout(resolve, MIN_SKELETON_TIME - elapsed)
          );
        }
        if (cancelled) return;
        setSendaiBusSchedule(data);
        setSendaiBusError(false);
      } catch {
        const elapsed = Date.now() - startTime;
        if (elapsed < MIN_SKELETON_TIME) {
          await new Promise((resolve) =>
            setTimeout(resolve, MIN_SKELETON_TIME - elapsed)
          );
        }
        if (cancelled) return;
        setSendaiBusError(true);
      } finally {
        if (!cancelled) {
          setSendaiBusLoading(false);
        }
      }
    })();

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
      <Card className="gap-0 p-6 border border-border rounded-2xl shadow-xs">
        <EmptyState className="p-0 text-center text-xs text-muted">
          美田園駅には他の公共交通機関（地下鉄・路線バス）の乗り換えはありません。
        </EmptyState>
      </Card>
    );
  }

  const subwayStationName = getSubwayStationNameById(stationId);
  const subwayDirections = getAvailableSubwayDirections(stationId);
  const nambokuDirections = subwayDirections.filter((k) => k.startsWith('namboku'));
  const tozaiDirections = subwayDirections.filter((k) => k.startsWith('tozai'));
  const natoringoStation = getNatoringoStationSchedule(stationId);

  return (
    <div className="flex flex-col gap-3">
      {/* 1. 仙台市地下鉄（南北線・東西線を1つのカード内で上品に区分け） */}
      {hasSubway && subwayStationName && (
        <Card className="gap-0 p-0 overflow-hidden border border-border rounded-2xl shadow-xs">
          <TransportSectionHeader
            icon={<JisSubway size={18} />}
            title="仙台市地下鉄"
            rightAction={
              <Button
                size="sm"
                variant="tertiary"
                className="h-7 px-2.5 text-xs font-bold rounded-full gap-1"
                onPress={() => openSubwayTimetable('namboku-north', null)}
              >
                <Icon name="schedule" size={13} />
                時刻表
              </Button>
            }
          />

          <div className="flex flex-col">
            {/* 南北線エリア */}
            {nambokuDirections.length > 0 && (
              <>
                <Surface
                  variant="secondary"
                  className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border"
                >
                  <SubwayStationMark line="namboku" code="N" size={18} />
                  <span className="text-xs font-extrabold text-foreground">
                    南北線
                  </span>
                  <Chip size="sm" variant="soft" color="success" className="text-[10px] font-bold px-1.5 py-0 h-4">
                    1・2番線
                  </Chip>
                </Surface>
                {nambokuDirections.map((dirKey, dIdx) => {
                  const meta = SUBWAY_DIRECTIONS[dirKey];
                  const upcoming = getUpcomingSubwayTrains(
                    subwayStationName,
                    dirKey,
                    now,
                    3
                  );

                  return (
                    <div key={dirKey}>
                      {dIdx > 0 && <Separator />}
                      {/* 方面サブヘッダー（どっち方面・何番線かを表示） */}
                      <Surface
                        variant="secondary"
                        className="flex items-center justify-between px-3 py-1.5 border-b border-border"
                      >
                        <div className="flex items-center gap-1.5 flex-nowrap">
                          <SubwayStationMark line="namboku" code={meta.destinationCode} size={18} />
                          <span className="text-[12.5px] font-bold text-foreground">
                            {meta.directionLabel}
                          </span>
                          <Chip size="sm" variant="soft" color="success" className="text-[10px] font-bold px-1.5 py-0 h-4">
                            {meta.track}番線
                          </Chip>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[11px] font-bold text-muted gap-1"
                          onPress={() => openSubwayTimetable(dirKey, null)}
                        >
                          <Icon name="schedule" size={12} />
                          時刻表
                        </Button>
                      </Surface>

                      {upcoming.length > 0 ? (
                        <ListBox
                          key={`tg-subway-${dirKey}`}
                          aria-label={`南北線 ${meta.directionLabel} 直近発車案内`}
                          selectionMode="none"
                          className="gap-0 p-0 divide-y divide-border"
                        >
                          {upcoming.map((item, idx) => (
                            <SubwayDepartureRow
                              key={`${item.train.id}-${item.departureTime}`}
                              id={`${item.train.id}-${item.departureTime}`}
                              textValue={`${item.departureTime}発 ${item.terminalStation}行`}
                              lineId="namboku"
                              lineName="南北線"
                              track={meta.track}
                              destination={item.terminalStation}
                              destinationCode={meta.destinationCode}
                              departureTime={item.departureTime}
                              onClick={() => openSubwayTimetable(dirKey, item.train.id)}
                              isLast={
                                tozaiDirections.length === 0 &&
                                dIdx === nambokuDirections.length - 1 &&
                                idx === upcoming.length - 1
                              }
                            />
                          ))}
                        </ListBox>
                      ) : (
                        <EmptyState className="py-3 px-3 text-center text-xs text-muted">
                          {meta.destination}行の運行は終了しました
                        </EmptyState>
                      )}
                    </div>
                  );
                })}
              </>
            )}

            {/* 東西線エリア（仙台駅） */}
            {tozaiDirections.length > 0 && (
              <>
                <Separator />
                <Surface
                  variant="secondary"
                  className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border"
                >
                  <SubwayStationMark line="tozai" code="T" size={18} />
                  <span className="text-xs font-extrabold text-foreground">
                    東西線
                  </span>
                  <Chip size="sm" variant="soft" color="accent" className="text-[10px] font-bold px-1.5 py-0 h-4">
                    3・4番線
                  </Chip>
                </Surface>
                {tozaiDirections.map((dirKey, dIdx) => {
                  const meta = SUBWAY_DIRECTIONS[dirKey];
                  const upcoming = getUpcomingSubwayTrains(
                    subwayStationName,
                    dirKey,
                    now,
                    3
                  );

                  return (
                    <div key={dirKey}>
                      {dIdx > 0 && <Separator />}
                      {/* 方面サブヘッダー（どっち方面・何番線かを表示） */}
                      <Surface
                        variant="secondary"
                        className="flex items-center justify-between px-3 py-1.5 border-b border-border"
                      >
                        <div className="flex items-center gap-1.5 flex-nowrap">
                          <SubwayStationMark line="tozai" code={meta.destinationCode} size={18} />
                          <span className="text-[12.5px] font-bold text-foreground">
                            {meta.directionLabel}
                          </span>
                          <Chip size="sm" variant="soft" color="accent" className="text-[10px] font-bold px-1.5 py-0 h-4">
                            {meta.track}番線
                          </Chip>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[11px] font-bold text-muted gap-1"
                          onPress={() => openSubwayTimetable(dirKey, null)}
                        >
                          <Icon name="schedule" size={12} />
                          時刻表
                        </Button>
                      </Surface>

                      {upcoming.length > 0 ? (
                        <ListBox
                          key={`tg-subway-${dirKey}`}
                          aria-label={`東西線 ${meta.directionLabel} 直近発車案内`}
                          selectionMode="none"
                          className="gap-0 p-0 divide-y divide-border"
                        >
                          {upcoming.map((item, idx) => (
                            <SubwayDepartureRow
                              key={`${item.train.id}-${item.departureTime}`}
                              id={`${item.train.id}-${item.departureTime}`}
                              textValue={`${item.departureTime}発 ${item.terminalStation}行`}
                              lineId="tozai"
                              lineName="東西線"
                              track={meta.track}
                              destination={item.terminalStation}
                              destinationCode={meta.destinationCode}
                              departureTime={item.departureTime}
                              onClick={() => openSubwayTimetable(dirKey, item.train.id)}
                              isLast={
                                dIdx === tozaiDirections.length - 1 &&
                                idx === upcoming.length - 1
                              }
                            />
                          ))}
                        </ListBox>
                      ) : (
                        <EmptyState className="py-3 px-3 text-center text-xs text-muted">
                          {meta.destination}行の運行は終了しました
                        </EmptyState>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </Card>
      )}

      {/* 2. 仙台市営バス */}
      {hasSendaiBus && (
        <Card className="gap-0 p-0 overflow-hidden border border-border rounded-2xl shadow-xs">
          <TransportSectionHeader
            icon={<JisBus size={18} color={SENDAI_BUS_COLOR} />}
            title="仙台市営バス"
            rightAction={
              <Button
                size="sm"
                variant="tertiary"
                className="h-7 px-2.5 text-xs font-bold rounded-full gap-1"
                onPress={() => {
                  if (!sendaiBusSchedule && !sendaiBusLoading) {
                    loadSendaiBusData(true, false);
                  }
                  openSendaiBusTimetable(null, selectedSendaiBusFilterKey);
                }}
              >
                <Icon name="schedule" size={13} />
                時刻表
              </Button>
            }
          />

          {/* sendai-bus-map-v2 準拠ののりば選択ピル（全のりば / 各のりば切り替え） */}
          {sendaiBusSchedule && sendaiBusSchedule.filterOptions.length > 1 && (
            <Surface
              variant="secondary"
              className="px-3 py-2 border-b border-border overflow-x-auto"
            >
              <div className="flex items-center gap-1.5 flex-nowrap">
                <Button
                  size="sm"
                  variant={selectedSendaiBusFilterKey === null ? 'primary' : 'tertiary'}
                  className="h-6 px-2.5 text-xs font-bold rounded-full shrink-0"
                  style={
                    selectedSendaiBusFilterKey === null
                      ? {
                          backgroundColor: SENDAI_BUS_COLOR,
                          color: '#ffffff',
                        }
                      : undefined
                  }
                  onPress={() => setSelectedSendaiBusFilterKey(null)}
                >
                  すべて
                </Button>
                {sendaiBusSchedule.filterOptions.map((opt) => {
                  const isSelected = selectedSendaiBusFilterKey === opt.key;
                  return (
                    <Button
                      key={opt.key}
                      size="sm"
                      variant={isSelected ? 'primary' : 'tertiary'}
                      className="h-6 px-2.5 text-xs font-bold rounded-full shrink-0"
                      style={
                        isSelected
                          ? {
                              backgroundColor: SENDAI_BUS_COLOR,
                              color: '#ffffff',
                            }
                          : undefined
                      }
                      onPress={() =>
                        setSelectedSendaiBusFilterKey(isSelected ? null : opt.key)
                      }
                    >
                      {opt.label}
                    </Button>
                  );
                })}
              </div>
            </Surface>
          )}

          {sendaiBusLoading && !sendaiBusSchedule ? (
            <div className="flex flex-col min-h-[220px]">
              <Surface
                variant="secondary"
                className="flex items-center gap-2 px-3 py-1.5 border-b border-border"
              >
                <Spinner size="sm" />
                <span className="text-xs font-semibold text-muted">
                  市営バス直近発車・遅延情報を取得中...
                </span>
              </Surface>
              <BusDepartureRowSkeleton />
              <BusDepartureRowSkeleton />
              <BusDepartureRowSkeleton isLast />
            </div>
          ) : sendaiBusError && !sendaiBusSchedule ? (
            <EmptyState className="flex items-center justify-between p-3 flex-nowrap text-xs text-muted">
              <span>市営バス情報の取得に失敗しました</span>
              <Button
                size="sm"
                variant="tertiary"
                className="h-7 px-2.5 text-xs font-bold rounded-lg gap-1"
                onPress={() => loadSendaiBusData(true, true)}
              >
                <Icon name="refresh" size={13} />
                再試行
              </Button>
            </EmptyState>
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
                  <EmptyState className="py-4 px-3 text-center text-xs text-muted">
                    本日の運行は終了しました
                  </EmptyState>
                );
              }

              return (
                <ListBox
                  key={`tg-sendai-bus-${stationId}`}
                  aria-label="仙台市営バス 直近の発車便"
                  selectionMode="none"
                  className="gap-0 p-0 divide-y divide-border"
                >
                  {upcoming.map((dep, dIdx) => (
                    <BusDepartureRow
                      key={dep.id}
                      id={dep.id}
                      textValue={`${dep.departureTime}発 [${dep.routeCode}] ${dep.headsign}行`}
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
                </ListBox>
              );
            })()
          ) : null}
        </Card>
      )}

      {/* 3. 名取市コミュニティバス「なとりん号」 */}
      {hasNatoringo && natoringoStation && (
        <Card className="gap-0 p-0 overflow-hidden border border-border rounded-2xl shadow-xs">
          <TransportSectionHeader
            icon={<JisBus size={18} />}
            title="名取市 なとりん号"
            rightAction={
              <Button
                size="sm"
                variant="tertiary"
                className="h-7 px-2.5 text-xs font-bold rounded-full gap-1"
                onPress={() =>
                  openNatoringoTimetable(
                    natoringoStation.busStops[0]?.stopId ?? null,
                    null
                  )
                }
              >
                <Icon name="schedule" size={13} />
                時刻表
              </Button>
            }
          />

          <div className="flex flex-col">
            {natoringoStation.busStops.map((busStop, sIdx) => {
              const limit = stationId === 'morisekinoshita' ? 4 : 3;
              const upcoming = getUpcomingNatoringoDepartures(
                stationId,
                busStop.stopId,
                now,
                limit
              );

              return (
                <div key={busStop.stopId}>
                  {sIdx > 0 && <Separator />}
                  {/* バス停サブヘッダー */}
                  <Surface
                    variant="secondary"
                    className="flex items-center justify-between px-3 py-1 border-b border-border"
                  >
                    <div className="flex items-center gap-1.5 flex-nowrap min-w-0">
                      <Chip
                        size="sm"
                        variant="secondary"
                        className="shrink-0 text-[10px] font-bold px-1.5 py-0 h-4"
                      >
                        {busStop.stopName}
                      </Chip>
                      <span className="text-[11px] font-medium text-muted truncate">
                        {busStop.lines.map((l) => l.lineName).join('・')}
                      </span>
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-1.5 text-[10.5px] font-semibold text-muted gap-0.5 min-w-0"
                      onPress={() =>
                        openNatoringoTimetable(busStop.stopId, null)
                      }
                    >
                      <span>全便</span>
                      <Icon
                        name="chevron_right"
                        size={13}
                        className="text-muted"
                      />
                    </Button>
                  </Surface>

                  {/* 直近発車便リスト */}
                  {upcoming.length > 0 ? (
                    <ListBox
                      key={`tg-natoringo-${busStop.stopId}`}
                      aria-label={`なとりん号 ${busStop.stopName} 直近の発車便`}
                      selectionMode="none"
                      className="gap-0 p-0 divide-y divide-border"
                    >
                      {upcoming.map((dep, dIdx) => (
                        <BusDepartureRow
                          key={dep.id}
                          id={dep.id}
                          textValue={`${dep.departureTime}発 [${dep.routeCode}] ${dep.headsign}行`}
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
                    </ListBox>
                  ) : (
                    <EmptyState className="flex items-center justify-between py-2 px-3.5 text-xs text-muted">
                      <span className="text-[11.5px] text-muted">
                        本日の運行は終了しました
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-[11px] font-bold text-accent hover:underline min-w-0"
                        onPress={() =>
                          openNatoringoTimetable(busStop.stopId, null)
                        }
                      >
                        時刻表を見る →
                      </Button>
                    </EmptyState>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
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
    </div>
  );
};
