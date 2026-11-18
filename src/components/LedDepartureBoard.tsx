import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button, Card, Link, Tabs } from '@heroui/react';
import { DepartureTrain, DirectionType } from '../types';
import { MOCK_DEPARTURES } from '../data/mockData';
import { StationBoard } from './StationBoard';
import { StationBoardFullscreen } from './StationBoardFullscreen';
import { Icon } from './Icon';
import { TimetableModal } from './TimetableModal';
import { isWeekendHolidayOrYearEnd } from '../utils/calendar';
import { useDebug } from '../context/DebugContext';
import { getActiveNoticeEvents, applySpecialOverrides } from '../config/specialScheduleOverrides';

interface LedDepartureBoardProps {
  stationId: string;
  selectedTrain: DepartureTrain | null;
  onSelectTrain: (train: DepartureTrain) => void;
}

export const LedDepartureBoard: React.FC<LedDepartureBoardProps> = ({
  stationId,
  selectedTrain,
  onSelectTrain,
}) => {
  const isSendai = stationId === 'sendai';
  const isMorisekinoshita = stationId === 'morisekinoshita';
  const isMitazonoOrAirport = stationId === 'mitazono' || stationId === 'sendai-airport';
  const isSatStation = isMorisekinoshita || isMitazonoOrAirport;
  const isNagamachiTaishido = stationId === 'nagamachi' || stationId === 'taishido';
  const isNatoriMinamiSendai = stationId === 'natori' || stationId === 'minami-sendai';

  // 1. アプリ基準時刻（実時刻またはデバッグシミュレーション時刻）
  const { now } = useDebug();

  // 今日が土曜・休日・年末年始（12/30〜1/3）かどうか
  const isTodayHoliday = useMemo(() => isWeekendHolidayOrYearEnd(now), [now]);

  const [sendaiLine, setSendaiLine] = useState<'tohoku' | 'joban' | 'saal'>('tohoku');
  const [selectedTrack, setSelectedTrack] = useState<'1' | '2' | '3'>('1');
  const [direction, setDirection] = useState<DirectionType>(
    isNagamachiTaishido ? 'down' : (stationId === 'sendai-airport' ? 'down' : 'up')
  );
  const [isFullTimetableOpen, setIsFullTimetableOpen] = useState(false);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);

  const handleOpenFullscreen = () => {
    try {
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch (_) {}
    setIsFullscreenOpen(true);
  };

  // 鉄道時刻分計算 (4:00〜翌3:59、深夜0〜3時は24〜27時)
  const toRailwayMinutes = (t: string) => {
    const parts = t.split(':');
    let h = parseInt(parts[0] || '0', 10);
    const m = parseInt(parts[1] || '0', 10);
    if (h < 4) h += 24;
    return h * 60 + m;
  };

  const currentMinutes = useMemo(() => {
    let h = now.getHours();
    const m = now.getMinutes();
    if (h < 4) h += 24;
    return h * 60 + m;
  }, [now]);

  const prevStationIdRef = useRef(stationId);

  // 駅が切り替わったときのみ初期タブ設定
  useEffect(() => {
    if (prevStationIdRef.current !== stationId) {
      prevStationIdRef.current = stationId;
      if (isSendai) {
        setSendaiLine('tohoku');
        setDirection('up');
      } else if (isSatStation) {
        setSelectedTrack('1');
        setDirection(stationId === 'sendai-airport' ? 'down' : 'up');
      } else if (isNagamachiTaishido) {
        setSelectedTrack('1');
        setDirection('down');
      } else if (isNatoriMinamiSendai) {
        setSelectedTrack('1');
        setDirection('up');
      }
    }
  }, [stationId, isSendai, isSatStation, isNagamachiTaishido, isNatoriMinamiSendai]);

  // 外部からの selectedTrain に応じたタブの追従
  useEffect(() => {
    if (!selectedTrain) return;
    if (isSendai && (selectedTrain.line === 'tohoku' || selectedTrain.line === 'joban' || selectedTrain.line === 'saal')) {
      setSendaiLine(selectedTrain.line);
    } else if (isNagamachiTaishido && selectedTrain.direction) {
      setDirection(selectedTrain.direction);
      setSelectedTrack(selectedTrain.direction === 'down' ? '1' : '2');
    } else if ((isSatStation || isNatoriMinamiSendai) && selectedTrain.track) {
      if (selectedTrain.track === '1' || selectedTrain.track === '2' || selectedTrain.track === '3') {
        setSelectedTrack(selectedTrain.track as '1' | '2' | '3');
      }
    }
  }, [selectedTrain, isSendai, isNagamachiTaishido, isSatStation, isNatoriMinamiSendai]);

  const rawDepartures = MOCK_DEPARTURES[stationId] || { up: [], down: [] };

  // 全便（平日専用便含む、時刻表モーダル送信用、期間内上書き適用）
  const allStationTrainsRaw = useMemo(() => {
    const list = [...(rawDepartures.up || []), ...(rawDepartures.down || [])].map((t) =>
      applySpecialOverrides(t, now, stationId)
    );
    return list.sort((a, b) => toRailwayMinutes(a.departureTime) - toRailwayMinutes(b.departureTime));
  }, [rawDepartures, now, stationId]);

  // 電光掲示板（StationBoard）用：今日が運休日なら平日専用便を除外
  const departures = useMemo(() => {
    const filterByDay = (list: DepartureTrain[]) => {
      let result = list;
      if (isTodayHoliday) {
        result = result.filter((t) => t.calendar !== 'weekday');
      }
      return result.map((t) => applySpecialOverrides(t, now, stationId));
    };
    return {
      up: filterByDay(rawDepartures.up || []),
      down: filterByDay(rawDepartures.down || []),
    };
  }, [rawDepartures, isTodayHoliday, now, stationId]);

  // 臨時運行・お知らせ
  const activeNotices = useMemo(() => getActiveNoticeEvents(now), [now]);

  const allStationTrains = useMemo(() => {
    const list = [...(departures.up || []), ...(departures.down || [])];
    return list.sort((a, b) => toRailwayMinutes(a.departureTime) - toRailwayMinutes(b.departureTime));
  }, [departures]);

  // 選択中タブ（のりば・路線）の全列車リスト（常に時系列昇順ソート）
  const allTabTrains = useMemo(() => {
    let list: DepartureTrain[] = [];
    if (isSendai) {
      list = (departures.up || []).filter((t) => t.line === sendaiLine);
    } else if (isMorisekinoshita) {
      list = allStationTrains;
    } else if (isMitazonoOrAirport || isNatoriMinamiSendai) {
      list = allStationTrains.filter((t) => t.track === selectedTrack);
    } else {
      list = departures[direction] || [];
    }
    return [...list].sort(
      (a, b) => toRailwayMinutes(a.departureTime) - toRailwayMinutes(b.departureTime)
    );
  }, [
    isSendai,
    sendaiLine,
    isMorisekinoshita,
    isMitazonoOrAirport,
    isNatoriMinamiSendai,
    allStationTrains,
    selectedTrack,
    departures,
    direction,
  ]);

  // 現在時刻以降に発車する直近の列車（先発・次発・次々発）
  const upcomingTrains = useMemo(() => {
    return allTabTrains.filter(
      (t) => toRailwayMinutes(t.departureTime) >= currentMinutes
    );
  }, [allTabTrains, currentMinutes]);

  // 駅を開いた初回のみ、先発列車を選択
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    hasInitializedRef.current = false;
  }, [stationId]);

  useEffect(() => {
    if (!hasInitializedRef.current && upcomingTrains.length > 0) {
      hasInitializedRef.current = true;
      if (!selectedTrain) {
        onSelectTrain(upcomingTrains[0]);
      }
    }
  }, [upcomingTrains, selectedTrain, onSelectTrain]);

  const effectiveTrack: string = useMemo(() => {
    if (isSendai) return sendaiLine;
    if (isNagamachiTaishido) return direction === 'down' ? '1' : '2';
    return selectedTrack;
  }, [isSendai, sendaiLine, isNagamachiTaishido, direction, selectedTrack]);

  const effectiveDirection: DirectionType = useMemo(() => {
    if (isSendai) return 'up';
    if (stationId === 'sendai-airport') return 'down';
    if (isNatoriMinamiSendai) {
      if (stationId === 'natori' && selectedTrack === '2') {
        return selectedTrain?.direction || 'down';
      }
      return selectedTrack === '1' ? 'up' : 'down';
    }
    if (isSatStation) return selectedTrack === '1' ? 'up' : 'down';
    if (isNagamachiTaishido) return direction;
    return direction;
  }, [
    isSendai,
    stationId,
    isNatoriMinamiSendai,
    selectedTrack,
    selectedTrain,
    isSatStation,
    isNagamachiTaishido,
    direction,
  ]);

  const handleSendaiLineClick = (lineKey: 'tohoku' | 'joban' | 'saal') => {
    setSendaiLine(lineKey);
    const nextTrains = (departures.up || []).filter((t) => t.line === lineKey);
    const nextUpcoming = nextTrains.filter((t) => toRailwayMinutes(t.departureTime) >= currentMinutes);
    const target = nextUpcoming.length > 0 ? nextUpcoming[0] : (nextTrains[0] || null);
    if (target) onSelectTrain(target);
  };

  const handleNagamachiTaishidoDirClick = (dir: DirectionType) => {
    setDirection(dir);
    setSelectedTrack(dir === 'down' ? '1' : '2');
    const nextTrains = departures[dir] || [];
    const nextUpcoming = nextTrains.filter((t) => toRailwayMinutes(t.departureTime) >= currentMinutes);
    const target = nextUpcoming.length > 0 ? nextUpcoming[0] : (nextTrains[0] || null);
    if (target) onSelectTrain(target);
  };

  const handleNatoriMinamiSendaiTrackClick = (trackNum: '1' | '2' | '3') => {
    setSelectedTrack(trackNum);
    const newDir: DirectionType = trackNum === '1' ? 'up' : 'down';
    setDirection(newDir);
    const nextTrains = allStationTrains.filter((t) => t.track === trackNum);
    const nextUpcoming = nextTrains.filter((t) => toRailwayMinutes(t.departureTime) >= currentMinutes);
    const target = nextUpcoming.length > 0 ? nextUpcoming[0] : (nextTrains[0] || null);
    if (target) onSelectTrain(target);
  };

  const handleSatTrackClick = (trackNum: '1' | '2') => {
    setSelectedTrack(trackNum);
    if (stationId === 'sendai-airport') {
      setDirection('down');
    } else {
      setDirection(trackNum === '1' ? 'up' : 'down');
    }
    const nextTrains = allStationTrains.filter((t) => t.track === trackNum);
    const nextUpcoming = nextTrains.filter((t) => toRailwayMinutes(t.departureTime) >= currentMinutes);
    const target = nextUpcoming.length > 0 ? nextUpcoming[0] : (nextTrains[0] || null);
    if (target) onSelectTrain(target);
  };

  // レンダリング中の安全なタブキーのフォールバック計算
  const validSendaiLine = (['tohoku', 'joban', 'saal'] as const).includes(sendaiLine) ? sendaiLine : 'tohoku';
  const validSatTrack = (selectedTrack === '1' || selectedTrack === '2') ? selectedTrack : '1';
  const validNatoriTrack = (['1', '2', '3'] as const).includes(selectedTrack as any) ? selectedTrack : '1';
  const validNagamachiDir = (direction === 'up' || direction === 'down') ? direction : 'down';

  return (
    <Card className="gap-0 p-0 overflow-hidden border border-border rounded-2xl shadow-xs bg-surface text-foreground">
      {/* のりば・方面切り替えセグメントタブ（HeroUI Tabs） */}
      <div className="p-2 border-b border-border bg-surface-secondary/40">
        {isSendai ? (
          /* 仙台駅: 3 tabs (東北本線 上り, 常磐線, 仙台空港アクセス線) */
          <Tabs
            key={`tabs-sendai-${stationId}`}
            selectedKey={validSendaiLine}
            onSelectionChange={(key) => handleSendaiLineClick(key as 'tohoku' | 'joban' | 'saal')}
            className="w-full"
          >
            <Tabs.ListContainer>
              <Tabs.List aria-label="のりば切り替え" className="w-full">
                <Tabs.Tab id="tohoku" className="w-auto flex-auto whitespace-nowrap h-7 text-xs font-bold px-1.5 sm:px-2">
                  東北本線 上り
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id="joban" className="w-auto flex-auto whitespace-nowrap h-7 text-xs font-bold px-1.5 sm:px-2">
                  常磐線
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id="saal" className="w-auto flex-auto whitespace-nowrap h-7 text-xs font-bold px-1.5 sm:px-2">
                  仙台空港アクセス線
                  <Tabs.Indicator />
                </Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>
          </Tabs>
        ) : isMorisekinoshita ? (
          /* 杜せきのした駅: 1番線 のみ */
          <Tabs key={`tabs-morisekinoshita-${stationId}`} selectedKey="1" className="w-full">
            <Tabs.ListContainer>
              <Tabs.List aria-label="のりば" className="w-full">
                <Tabs.Tab id="1" className="flex-1 h-7 text-xs font-bold whitespace-nowrap">
                  1番線
                  <Tabs.Indicator />
                </Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>
          </Tabs>
        ) : isSatStation ? (
          /* 美田園駅・仙台空港駅: 2 tabs (1番線, 2番線) */
          <Tabs
            key={`tabs-sat-${stationId}`}
            selectedKey={validSatTrack}
            onSelectionChange={(key) => handleSatTrackClick(key as '1' | '2')}
            className="w-full"
          >
            <Tabs.ListContainer>
              <Tabs.List aria-label="のりば切り替え" className="w-full">
                <Tabs.Tab id="1" className="flex-1 h-7 text-xs font-bold px-2 whitespace-nowrap">
                  1番線
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id="2" className="flex-1 h-7 text-xs font-bold px-2 whitespace-nowrap">
                  2番線
                  <Tabs.Indicator />
                </Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>
          </Tabs>
        ) : isNatoriMinamiSendai ? (
          /* 名取駅・南仙台駅: 3 tabs (1番線, 2番線, 3番線) */
          <Tabs
            key={`tabs-natori-${stationId}`}
            selectedKey={validNatoriTrack}
            onSelectionChange={(key) => handleNatoriMinamiSendaiTrackClick(key as '1' | '2' | '3')}
            className="w-full"
          >
            <Tabs.ListContainer>
              <Tabs.List aria-label="のりば切り替え" className="w-full">
                {(['1', '2', '3'] as const).map((trackNum) => (
                  <Tabs.Tab key={trackNum} id={trackNum} className="flex-1 h-7 text-xs font-bold px-2 whitespace-nowrap">
                    {trackNum}番線
                    <Tabs.Indicator />
                  </Tabs.Tab>
                ))}
              </Tabs.List>
            </Tabs.ListContainer>
          </Tabs>
        ) : (
          /* 長町駅・太子堂駅: 2 tabs (1番線 [下り・仙台方面], 2番線 [上り・白石/空港方面]) */
          <Tabs
            key={`tabs-nagamachi-${stationId}`}
            selectedKey={validNagamachiDir}
            onSelectionChange={(key) => handleNagamachiTaishidoDirClick(key as DirectionType)}
            className="w-full"
          >
            <Tabs.ListContainer>
              <Tabs.List aria-label="のりば切り替え" className="w-full">
                <Tabs.Tab id="down" className="flex-1 h-7 text-xs font-bold px-2 whitespace-nowrap">
                  1番線
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id="up" className="flex-1 h-7 text-xs font-bold px-2 whitespace-nowrap">
                  2番線
                  <Tabs.Indicator />
                </Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>
          </Tabs>
        )}
      </div>

      {/* 電光掲示板 */}
      <div className="bg-transparent px-2 pt-2.5 pb-2">
        <StationBoard
          stationId={stationId}
          direction={effectiveDirection}
          track={effectiveTrack}
          trains={upcomingTrains}
          selectedTrain={selectedTrain}
          onSelectTrain={onSelectTrain}
        />
        {/* 電光掲示板の下部バー */}
        <div className="flex items-center justify-between px-1.5 pt-2">
          <Button
            isIconOnly
            variant="ghost"
            size="sm"
            onPress={handleOpenFullscreen}
            aria-label="電光掲示板を全画面表示"
            className="text-muted hover:text-foreground"
          >
            <Icon name="fullscreen" size={19} />
          </Button>
          <div className="text-[10.5px] text-muted text-right font-english tabular-nums">
            <span>
              {String(now.getHours()).padStart(2, '0')}:{String(now.getMinutes()).padStart(2, '0')}
            </span>
            <span className="ml-0.5">現在</span>
          </div>
        </div>
      </div>

      {/* 全画面表示モーダル */}
      <StationBoardFullscreen
        isOpen={isFullscreenOpen}
        onClose={() => setIsFullscreenOpen(false)}
        stationId={stationId}
        direction={effectiveDirection}
        track={effectiveTrack}
        trains={upcomingTrains}
        selectedTrain={selectedTrain}
        onSelectTrain={onSelectTrain}
      />

      {/* 臨時運行・増結運転のお知らせリンク（HeroUI Link） */}
      {activeNotices.length > 0 && (
        <div className="px-3 py-2 border-t border-border">
          {activeNotices.map((notice) => (
            <Link
              key={notice.id}
              href={notice.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block py-1 no-underline w-full"
            >
              <div className="flex items-start gap-2 w-full">
                <span className="shrink-0 mt-0.5 text-accent">
                  <Icon name="campaign" size={16} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-xs font-bold text-accent leading-snug underline-offset-2 group-hover:underline">
                      {notice.title}
                    </span>
                    <span className="shrink-0 text-muted group-hover:text-accent transition-colors">
                      <Icon name="open_in_new" size={14} />
                    </span>
                  </div>
                  {notice.description && (
                    <p className="text-[11px] text-muted mt-0.5 leading-tight">
                      {notice.description}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 時刻表ボタン — 大きく押しやすい独立ボタン */}
      <div className="p-2.5 border-t border-border">
        <Button
          fullWidth
          size="md"
          variant="tertiary"
          onPress={() => setIsFullTimetableOpen(true)}
          className="font-extrabold flex items-center justify-center gap-2 h-10 rounded-xl"
        >
          <Icon name="schedule" size={18} />
          <span>時刻表</span>
        </Button>
      </div>

      {/* 時刻表ダイアログ */}
      <TimetableModal
        isOpen={isFullTimetableOpen}
        onClose={() => setIsFullTimetableOpen(false)}
        stationId={stationId}
        allTrains={allStationTrainsRaw}
        now={now}
        initialDirection={effectiveDirection}
      />
    </Card>
  );
};

export default LedDepartureBoard;
