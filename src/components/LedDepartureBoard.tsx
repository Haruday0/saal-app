import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SegmentedControl, Button, Paper, Box, Text, ActionIcon } from '@mantine/core';
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
    isNagamachiTaishido ? 'down' : 'up'
  );
  const [isFullTimetableOpen, setIsFullTimetableOpen] = useState(false);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);

  const handleOpenFullscreen = async () => {
    setIsFullscreenOpen(true);
    try {
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (_) {}
    try {
      if (screen.orientation && 'lock' in screen.orientation) {
        await (screen.orientation as any).lock('landscape');
      }
    } catch (_) {}
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

  useEffect(() => {
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
      applySpecialOverrides(t, now)
    );
    return list.sort((a, b) => toRailwayMinutes(a.departureTime) - toRailwayMinutes(b.departureTime));
  }, [rawDepartures, now]);

  // 電光掲示板（StationBoard）用：今日が運休日（土曜・休日・12/30〜1/3）なら平日専用便（1428M, 1425M等）を除外＆特別ダイヤ適用
  const departures = useMemo(() => {
    const filterByDay = (list: DepartureTrain[]) => {
      let result = list;
      if (isTodayHoliday) {
        result = result.filter((t) => t.calendar !== 'weekday');
      }
      return result.map((t) => applySpecialOverrides(t, now));
    };
    return {
      up: filterByDay(rawDepartures.up || []),
      down: filterByDay(rawDepartures.down || []),
    };
  }, [rawDepartures, isTodayHoliday, now]);

  // 臨時運行・お知らせ（告知期間中のみ取得）
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

  // ★ 現在時刻以降に発車する直近の列車（先発・次発・次々発）
  const upcomingTrains = useMemo(() => {
    return allTabTrains.filter(
      (t) => toRailwayMinutes(t.departureTime) >= currentMinutes
    );
  }, [allTabTrains, currentMinutes]);

  // 駅を開いた初回のみ、先発列車を選択（循環レンダリングループを完全防止）
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

  return (
    <Paper withBorder radius="lg" style={{ overflow: 'hidden' }}>
      {/* のりば・方面切り替えタブ（Mantine SegmentedControl） */}
      <Box p={6} style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
        {isSendai ? (
          /* 仙台駅: 3 tabs (東北本線 上り, 常磐線, 仙台空港アクセス線) */
          <SegmentedControl
            size="xs"
            fullWidth
            value={sendaiLine}
            onChange={(val) => handleSendaiLineClick(val as 'tohoku' | 'joban' | 'saal')}
            data={[
              { label: '東北本線 上り', value: 'tohoku' },
              { label: '常磐線', value: 'joban' },
              { label: '仙台空港アクセス線', value: 'saal' },
            ]}
            radius="md"
          />
        ) : isMorisekinoshita ? (
          /* 杜せきのした駅: 1面1線棒線駅のため 1番線 のみ */
          <div className="flex justify-center p-0.5">
            <Button fullWidth size="compact-sm" radius="md" color="saal" fz="xs">
              1番線
            </Button>
          </div>
        ) : isSatStation ? (
          /* 美田園駅・仙台空港駅: 2 tabs (1番線, 2番線) */
          <SegmentedControl
            size="xs"
            fullWidth
            value={selectedTrack}
            onChange={(val) => handleSatTrackClick(val as '1' | '2')}
            data={[
              { label: '1番線', value: '1' },
              { label: '2番線', value: '2' },
            ]}
            radius="md"
          />
        ) : isNatoriMinamiSendai ? (
          /* 名取駅・南仙台駅: 3 tabs (1番線, 2番線, 3番線) */
          <SegmentedControl
            size="xs"
            fullWidth
            value={selectedTrack}
            onChange={(val) => handleNatoriMinamiSendaiTrackClick(val as '1' | '2' | '3')}
            data={[
              { label: '1番線', value: '1' },
              { label: '2番線', value: '2' },
              { label: '3番線', value: '3' },
            ]}
            radius="md"
          />
        ) : (
          /* 長町駅・太子堂駅: 2 tabs (1番線 下り, 2番線 上り) */
          <SegmentedControl
            size="xs"
            fullWidth
            value={direction === 'down' ? '1' : '2'}
            onChange={(val) => handleNagamachiTaishidoDirClick(val === '1' ? 'down' : 'up')}
            data={[
              { label: '1番線', value: '1' },
              { label: '2番線', value: '2' },
            ]}
            radius="md"
          />
        )}
      </Box>

      {/* LED盤面 — 直近の先発・次発・次々発 (upcomingTrains) を美しく表示 */}
      <div className="bg-transparent px-1.5 pt-2 pb-1.5">
        <StationBoard
          stationId={stationId}
          direction={effectiveDirection}
          track={effectiveTrack}
          trains={upcomingTrains}
          selectedTrain={selectedTrain}
          onSelectTrain={onSelectTrain}
        />
        {/* 電光掲示板の下部バー: 全画面表示（横画面）ボタン ＆ 現在時刻 */}
        <div className="flex items-center justify-between px-2 pt-2">
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            radius="md"
            onClick={handleOpenFullscreen}
            title="全画面表示（横画面）"
            aria-label="電光掲示板を横画面で全画面表示"
          >
            <Icon name="fullscreen" size={19} />
          </ActionIcon>
          <Text fz={10.5} c="dimmed" ta="right" className="font-english tabular-nums">
            <span>
              {String(now.getHours()).padStart(2, '0')}:{String(now.getMinutes()).padStart(2, '0')}
            </span>
            <span className="ml-0.5">現在</span>
          </Text>
        </div>
      </div>

      {/* 電光掲示板 専用全画面・横画面モーダル */}
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

      {/* 臨時運行・増結運転のお知らせリンク（告知期間中のみ表示） */}
      {activeNotices.length > 0 && (
        <Box px={10} py={7} style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
          {activeNotices.map((notice) => (
            <a
              key={notice.id}
              href={notice.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block p-2.5 rounded-xl border border-blue-200/70 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-50/80 dark:hover:bg-blue-950/40 transition-colors"
              style={{ textDecoration: 'none' }}
            >
              <div className="flex items-start gap-2">
                <span className="shrink-0 mt-0.5 text-saal-600 dark:text-saal-400">
                  <Icon name="campaign" size={16} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1.5">
                    <Text fz={12} fw={700} c="saal" className="leading-snug underline-offset-2 group-hover:underline">
                      {notice.title}
                    </Text>
                    <span className="shrink-0 text-slate-400 group-hover:text-saal transition-colors">
                      <Icon name="open_in_new" size={14} />
                    </span>
                  </div>
                  {notice.description && (
                    <Text fz={11} c="dimmed" className="mt-0.5 leading-tight">
                      {notice.description}
                    </Text>
                  )}
                </div>
              </div>
            </a>
          ))}
        </Box>
      )}

      {/* 時刻表ボタン — 大きく押しやすい独立ボタン（Mantine Button） */}
      <Box p={10} style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
        <Button
          fullWidth
          size="md"
          radius="xl"
          variant="default"
          onClick={() => setIsFullTimetableOpen(true)}
          fw={800}
          leftSection={<Icon name="schedule" size={18} />}
        >
          時刻表
        </Button>
      </Box>

      {/* Mantine Modalベースの時刻表ダイアログ */}
      <TimetableModal
        isOpen={isFullTimetableOpen}
        onClose={() => setIsFullTimetableOpen(false)}
        stationId={stationId}
        allTrains={allStationTrainsRaw}
        now={now}
        initialDirection={effectiveDirection}
      />
    </Paper>
  );
};
