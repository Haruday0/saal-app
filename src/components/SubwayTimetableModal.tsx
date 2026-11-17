import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Modal,
  Tabs,
  Button,
  Chip,
  CloseButton,
  ScrollShadow,
  ListBox,
  EmptyState,
  Separator,
} from '@heroui/react';
import { isWeekendHolidayOrYearEnd } from '../utils/calendar';
import { getCurrentRailwaySeconds } from '../utils/trainPosition';
import {
  SubwayDirectionKey,
  SubwayDayType,
  SubwayLineId,
  SUBWAY_DIRECTIONS,
  SubwayStationTrainItem,
  getSubwayStationNameById,
  getSubwayStationTimetable,
  toSubwayRailwayMinutes,
  formatSubwayTime,
} from '../utils/subwaySchedule';
import { SubwayStationMark } from './SubwayStationMark';
import { Icon } from './Icon';
import { RouteTimeline } from './RouteTimeline';

interface SubwayTimetableModalProps {
  isOpen: boolean;
  onClose: () => void;
  stationId: string;
  initialDirectionKey?: SubwayDirectionKey;
  initialTrainId?: string | null;
  now: Date;
}

export const SubwayTimetableModal: React.FC<SubwayTimetableModalProps> = ({
  isOpen,
  onClose,
  stationId,
  initialDirectionKey = 'namboku-north',
  initialTrainId = null,
  now,
}) => {
  const isSendai = stationId === 'sendai';
  const boardingStationName = getSubwayStationNameById(stationId) || '仙台';

  const isTodayHoliday = useMemo(() => isWeekendHolidayOrYearEnd(now), [now]);
  const todayDayType: SubwayDayType = isTodayHoliday ? 'holiday' : 'weekday';

  // 初期方向キーのバリデーション（長町駅の場合は南北線固定、不正キーは namboku-north にフォールバック）
  const getInitialSafeKey = (key?: string, isSendaiStation = false): SubwayDirectionKey => {
    if (!key || !(key in SUBWAY_DIRECTIONS)) {
      return 'namboku-north';
    }
    const safeKey = key as SubwayDirectionKey;
    if (!isSendaiStation && safeKey.startsWith('tozai-')) {
      return 'namboku-north';
    }
    return safeKey;
  };

  const initialSafeKey = useMemo(
    () => getInitialSafeKey(initialDirectionKey, isSendai),
    [initialDirectionKey, isSendai]
  );
  const initialLine: SubwayLineId = SUBWAY_DIRECTIONS[initialSafeKey].lineId;

  const [activeLine, setActiveLine] = useState<SubwayLineId>(initialLine);
  const [directionKey, setDirectionKey] = useState<SubwayDirectionKey>(initialSafeKey);
  const [dayType, setDayType] = useState<SubwayDayType>(todayDayType);
  const [selectedTrainId, setSelectedTrainId] = useState<string | null>(initialTrainId);

  const prevOpenRef = useRef(false);

  // モーダルが開いた瞬間（false -> true）のみ初期状態を同期
  useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      const safeKey = getInitialSafeKey(initialDirectionKey, isSendai);
      const safeLine = SUBWAY_DIRECTIONS[safeKey].lineId;
      setActiveLine(safeLine);
      setDirectionKey(safeKey);
      setDayType(isWeekendHolidayOrYearEnd(now) ? 'holiday' : 'weekday');
      setSelectedTrainId(initialTrainId || null);
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, isSendai, initialDirectionKey, initialTrainId, now]);

  // 有効な路線ID（長町駅など東西線非対応駅では南北線に強制）
  const validLineId: SubwayLineId = !isSendai ? 'namboku' : activeLine;

  // 有効な方面キーのリスト（現在の路線に含まれるキーのみ）
  const allowedDirectionKeys = useMemo<SubwayDirectionKey[]>(() => {
    return validLineId === 'namboku'
      ? ['namboku-north', 'namboku-south']
      : ['tozai-east', 'tozai-west'];
  }, [validLineId]);

  // レンダリング中にもフォールバック計算を行い、Tabs の子要素に必ず存在するキーを保証
  const validDirectionKey: SubwayDirectionKey = useMemo(() => {
    return allowedDirectionKeys.includes(directionKey)
      ? directionKey
      : allowedDirectionKeys[0];
  }, [allowedDirectionKeys, directionKey]);

  const meta = SUBWAY_DIRECTIONS[validDirectionKey];
  const activeLineId: SubwayLineId = meta.lineId;

  // 現在時刻（4:00基準の鉄道分）
  const currentMinutes = useMemo(
    () => Math.floor(getCurrentRailwaySeconds(now) / 60),
    [now]
  );

  // 選択中の路線・方面・ダイヤ種別の全列車リスト
  const timetableItems = useMemo(
    () => getSubwayStationTimetable(boardingStationName, validDirectionKey, dayType),
    [boardingStationName, validDirectionKey, dayType]
  );

  // 次発列車（現在時刻以降の最初の列車）
  const nextTrainId = useMemo(() => {
    for (const item of timetableItems) {
      if (item.departureMinutes >= currentMinutes) {
        return item.train.id;
      }
    }
    return null;
  }, [timetableItems, currentMinutes]);

  // 選択中の列車データ（全停車駅タイムライン表示用）
  const selectedTrainItem: SubwayStationTrainItem | null = useMemo(() => {
    if (!selectedTrainId) return null;
    return timetableItems.find((item) => item.train.id === selectedTrainId) || null;
  }, [selectedTrainId, timetableItems]);

  const listViewportRef = useRef<HTMLDivElement>(null);
  const timelineViewportRef = useRef<HTMLDivElement>(null);

  // 1. 時刻表一覧ビューの自動初期スクロール
  useEffect(() => {
    if (!isOpen || selectedTrainItem) return;

    const scrollToCurrentTrain = () => {
      const viewport = listViewportRef.current;
      if (!viewport) return;

      if (!nextTrainId) {
        viewport.scrollTop = 0;
        return;
      }

      const targetEl = viewport.querySelector<HTMLElement>(
        `[data-subway-train-id="${nextTrainId}"]`
      );
      if (targetEl) {
        const viewportRect = viewport.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();
        const targetTop = targetRect.top - viewportRect.top + viewport.scrollTop;
        viewport.scrollTop = Math.max(0, targetTop - 85);
      }
    };

    const rafId = requestAnimationFrame(scrollToCurrentTrain);
    const t1 = setTimeout(scrollToCurrentTrain, 30);
    const t2 = setTimeout(scrollToCurrentTrain, 120);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isOpen, selectedTrainItem, nextTrainId, validDirectionKey, dayType]);

  // 2. 全停車駅タイムラインビューの自動初期スクロール
  useEffect(() => {
    if (!isOpen || !selectedTrainItem) return;

    const scrollToBoardingStation = () => {
      const viewport = timelineViewportRef.current;
      if (!viewport) return;

      const targetIdx = selectedTrainItem.stationIndex;
      if (targetIdx <= 0) {
        viewport.scrollTop = 0;
        return;
      }

      const targetEl = viewport.querySelector<HTMLElement>(
        `[data-subway-stop-index="${targetIdx}"]`
      );
      if (targetEl) {
        const viewportRect = viewport.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();
        const targetTop = targetRect.top - viewportRect.top + viewport.scrollTop;
        viewport.scrollTop = Math.max(0, targetTop - 95);
      }
    };

    const rafId = requestAnimationFrame(scrollToBoardingStation);
    const t1 = setTimeout(scrollToBoardingStation, 30);
    const t2 = setTimeout(scrollToBoardingStation, 120);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isOpen, selectedTrainItem]);

  const handleLineChange = (newLine: SubwayLineId) => {
    setSelectedTrainId(null);
    setActiveLine(newLine);
    if (newLine === 'namboku') {
      setDirectionKey('namboku-north');
    } else {
      setDirectionKey('tozai-east');
    }
  };

  const handleDirectionChange = (newDir: SubwayDirectionKey) => {
    setSelectedTrainId(null);
    setDirectionKey(newDir);
  };

  const handleDayTypeChange = (newDay: SubwayDayType) => {
    setSelectedTrainId(null);
    setDayType(newDay);
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Modal.Backdrop>
        <Modal.Container size="md" placement="center" scroll="inside">
          <Modal.Dialog
            aria-label="地下鉄時刻表"
            className="p-0 gap-0 overflow-hidden flex flex-col h-[calc(100dvh-4rem)] max-h-[calc(100dvh-4rem)] w-full max-w-md rounded-2xl bg-surface text-foreground border border-border shadow-2xl"
          >
            {/* モーダルヘッダー */}
            <div className="flex items-center justify-between px-3.5 py-3 shrink-0 min-h-[50px]">
              <div className="flex items-center gap-2 min-w-0">
                <SubwayStationMark line={activeLineId} code={meta.lineCode} size={26} />
                <h2 className="font-black text-[15px] m-0 leading-tight truncate">
                  {boardingStationName}駅 仙台市地下鉄時刻表
                </h2>
              </div>
              <CloseButton onPress={onClose} aria-label="閉じる" />
            </div>
            <Separator />

            {selectedTrainItem ? (
              /* ========== 機能2：全停車駅到着時刻タイムライン表示 ========== */
              <div className="flex-1 min-h-0 flex flex-col">
                {/* 詳細ヘッダー */}
                <div className="flex flex-col gap-2 p-3 bg-surface-secondary shrink-0">
                  {/* 1行目: 戻るボタン ＆ バッジ */}
                  <div className="flex items-center justify-between gap-2">
                    <Button
                      size="sm"
                      variant="tertiary"
                      onPress={() => setSelectedTrainId(null)}
                      className="h-7 px-2.5 text-xs font-bold flex items-center gap-1.5 rounded-lg border border-border"
                    >
                      <Icon name="arrow_back" size={14} />
                      <span>時刻表に戻る</span>
                    </Button>
                    <div className="flex items-center gap-1.5">
                      <Chip
                        size="sm"
                        variant="soft"
                        color={dayType === 'holiday' ? 'danger' : 'default'}
                        className="h-5 px-1.5 text-[10px] font-bold"
                      >
                        {dayType === 'holiday' ? '土休日ダイヤ' : '平日ダイヤ'}
                      </Chip>
                      <Chip size="sm" variant="secondary" className="h-5 px-1.5 text-[10px] font-bold border border-border">
                        {selectedTrainItem.track}番線
                      </Chip>
                    </div>
                  </div>

                  {/* 2行目: 路線カラーバー ＋ 路線名・方面 ＋ 行先 ＋ 発着情報 */}
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-1 h-8 rounded shrink-0"
                        style={{ backgroundColor: meta.color }}
                      />
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <SubwayStationMark line={meta.lineId} code={meta.lineCode} size={20} />
                          <span className="text-xs font-extrabold text-muted">
                            仙台市地下鉄 {meta.lineName}（{meta.directionLabel}）
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-[17px] font-extrabold leading-tight m-0 flex items-center">
                            {selectedTrainItem.terminalStation}
                            <span className="text-xs font-bold ml-0.5 text-muted">
                              行
                            </span>
                          </h3>
                          <SubwayStationMark line={meta.lineId} code={selectedTrainItem.terminalCode} size={22} />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-[11px] text-muted font-semibold font-english tabular-nums">
                        {selectedTrainItem.stationName} {selectedTrainItem.departureTime}
                      </span>
                      <span className="text-xs font-extrabold font-english tabular-nums">
                        {selectedTrainItem.terminalStation} {selectedTrainItem.terminalArrivalTime}
                      </span>
                    </div>
                  </div>
                </div>
                <Separator />

                {/* タイムラインスクロール領域 */}
                <ScrollShadow
                  ref={timelineViewportRef}
                  className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
                >
                  <div className="p-4 pb-8">
                    <div className="flex items-baseline justify-between mb-3">
                      <span className="text-xs font-bold text-muted">
                        全停車駅・到着時刻タイムライン
                      </span>
                      <span className="text-[10.5px] font-semibold text-muted">
                        全{meta.stations.length}駅
                      </span>
                    </div>

                    {(() => {
                      const times = selectedTrainItem.train.times;
                      const stopMinutes = times.map((t) => toSubwayRailwayMinutes(t));
                      const firstMin = stopMinutes[0];
                      const lastMin = stopMinutes[stopMinutes.length - 1];
                      const isTodayCal = dayType === todayDayType;
                      const isCurrentlyRunning =
                        isTodayCal && currentMinutes >= firstMin && currentMinutes <= lastMin;

                      let currentStopIdx = -1;
                      if (isCurrentlyRunning) {
                        for (let i = 0; i < stopMinutes.length; i++) {
                          if (currentMinutes >= stopMinutes[i]) {
                            currentStopIdx = i;
                          }
                        }
                      }

                      const boardingIdx = selectedTrainItem.stationIndex;

                      return (
                        <RouteTimeline
                          items={meta.stations}
                          lineColor={meta.color}
                          getItemKey={(_, i) => `${meta.stationCodes[i]}-${i}`}
                          getDataAttributes={(_, i) => ({ 'data-subway-stop-index': i })}
                          isPassed={(_, i) =>
                            i < boardingIdx || (isCurrentlyRunning && i < currentStopIdx)
                          }
                          isCurrent={(_, i) => i === boardingIdx}
                          isVehiclePosition={(_, i) =>
                            isCurrentlyRunning && i === currentStopIdx
                          }
                          getRowStyle={(_, i) => ({
                            backgroundColor:
                              i === boardingIdx ? `${meta.color}1A` : undefined,
                          })}
                          renderContent={(stName, i) => {
                            const stCode = meta.stationCodes[i];
                            const rawTime = times[i];
                            const formattedTime = formatSubwayTime(rawTime);
                            const isLast = i === meta.stations.length - 1;
                            const isBoarding = i === boardingIdx;
                            const passed =
                              i < boardingIdx || (isCurrentlyRunning && i < currentStopIdx);

                            return (
                              <div className="flex items-center justify-between min-w-0 flex-1 gap-2.5 py-0.5">
                                <div className="flex items-center gap-2 min-w-0">
                                  <SubwayStationMark
                                    line={meta.lineId}
                                    code={stCode}
                                    size={22}
                                    dimmed={passed && !isBoarding}
                                  />
                                  <span
                                    className={`text-sm truncate leading-snug ${
                                      isBoarding || isLast
                                        ? 'font-extrabold text-foreground'
                                        : passed
                                        ? 'font-medium text-muted'
                                        : 'font-bold text-foreground'
                                    }`}
                                  >
                                    {stName}
                                  </span>
                                </div>

                                <div className="flex items-center justify-end shrink-0">
                                  <span
                                    className={`text-xs tabular-nums font-english text-right min-w-[52px] ${
                                      isBoarding || isLast
                                        ? 'font-extrabold text-foreground'
                                        : passed
                                        ? 'text-muted font-medium'
                                        : 'font-bold text-foreground'
                                    }`}
                                  >
                                    {formattedTime}
                                  </span>
                                </div>
                              </div>
                            );
                          }}
                        />
                      );
                    })()}
                  </div>
                </ScrollShadow>
              </div>
            ) : (
              /* ========== 機能1：駅別・方面別の1日全時刻表一覧 ========== */
              <div className="flex-1 min-h-0 flex flex-col">
                <div className="flex flex-col gap-2 p-3 bg-surface-secondary shrink-0">
                  {/* 仙台駅のみ: 南北線 / 東西線 の路線切り替え */}
                  {isSendai && (
                    <Tabs
                      key="subway-line-tabs"
                      selectedKey={validLineId}
                      onSelectionChange={(key) => handleLineChange(String(key) as SubwayLineId)}
                      className="w-full"
                    >
                      <Tabs.ListContainer>
                        <Tabs.List aria-label="路線切り替え" className="w-full">
                          <Tabs.Tab id="namboku" className="flex-1 h-7 text-xs font-bold px-2 flex items-center justify-center gap-1.5">
                            <SubwayStationMark line="namboku" code="N" size={18} />
                            <span>南北線（1・2番線）</span>
                            <Tabs.Indicator />
                          </Tabs.Tab>
                          <Tabs.Tab id="tozai" className="flex-1 h-7 text-xs font-bold px-2 flex items-center justify-center gap-1.5">
                            <SubwayStationMark line="tozai" code="T" size={18} />
                            <span>東西線（3・4番線）</span>
                            <Tabs.Indicator />
                          </Tabs.Tab>
                        </Tabs.List>
                      </Tabs.ListContainer>
                    </Tabs>
                  )}

                  {/* 方面（のりば）切り替え */}
                  {validLineId === 'namboku' ? (
                    <Tabs
                      key="subway-dir-tabs-namboku"
                      selectedKey={validDirectionKey}
                      onSelectionChange={(key) => handleDirectionChange(String(key) as SubwayDirectionKey)}
                      className="w-full"
                    >
                      <Tabs.ListContainer>
                        <Tabs.List aria-label="南北線方面切り替え" className="w-full">
                          <Tabs.Tab id="namboku-north" className="flex-1 h-7 text-xs font-bold px-2 flex items-center justify-center gap-1.5">
                            <SubwayStationMark line="namboku" code="N01" size={18} />
                            <span>1番線 泉中央方面</span>
                            <Tabs.Indicator />
                          </Tabs.Tab>
                          <Tabs.Tab id="namboku-south" className="flex-1 h-7 text-xs font-bold px-2 flex items-center justify-center gap-1.5">
                            <SubwayStationMark line="namboku" code="N17" size={18} />
                            <span>2番線 富沢方面</span>
                            <Tabs.Indicator />
                          </Tabs.Tab>
                        </Tabs.List>
                      </Tabs.ListContainer>
                    </Tabs>
                  ) : (
                    <Tabs
                      key="subway-dir-tabs-tozai"
                      selectedKey={validDirectionKey}
                      onSelectionChange={(key) => handleDirectionChange(String(key) as SubwayDirectionKey)}
                      className="w-full"
                    >
                      <Tabs.ListContainer>
                        <Tabs.List aria-label="東西線方面切り替え" className="w-full">
                          <Tabs.Tab id="tozai-east" className="flex-1 h-7 text-xs font-bold px-2 flex items-center justify-center gap-1.5">
                            <SubwayStationMark line="tozai" code="T13" size={18} />
                            <span>3番線 荒井方面</span>
                            <Tabs.Indicator />
                          </Tabs.Tab>
                          <Tabs.Tab id="tozai-west" className="flex-1 h-7 text-xs font-bold px-2 flex items-center justify-center gap-1.5">
                            <SubwayStationMark line="tozai" code="T01" size={18} />
                            <span>4番線 八木山動物公園方面</span>
                            <Tabs.Indicator />
                          </Tabs.Tab>
                        </Tabs.List>
                      </Tabs.ListContainer>
                    </Tabs>
                  )}

                  {/* 平日ダイヤ / 土休日ダイヤ 切り替え */}
                  <Tabs
                    key="subway-day-tabs"
                    selectedKey={dayType}
                    onSelectionChange={(key) => handleDayTypeChange(String(key) as SubwayDayType)}
                    className="w-full"
                  >
                    <Tabs.ListContainer>
                      <Tabs.List aria-label="ダイヤ切り替え" className="w-full">
                        <Tabs.Tab id="weekday" className="flex-1 h-7 text-xs font-bold px-2 flex items-center justify-center">
                          <span>平日ダイヤ{!isTodayHoliday ? '（本日）' : ''}</span>
                          <Tabs.Indicator />
                        </Tabs.Tab>
                        <Tabs.Tab id="holiday" className="flex-1 h-7 text-xs font-bold px-2 flex items-center justify-center">
                          <span>土休日ダイヤ{isTodayHoliday ? '（本日）' : ''}</span>
                          <Tabs.Indicator />
                        </Tabs.Tab>
                      </Tabs.List>
                    </Tabs.ListContainer>
                  </Tabs>
                </div>
                <Separator />

                {/* 時刻表一覧スクロール領域 */}
                <ScrollShadow
                  ref={listViewportRef}
                  className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
                >
                  {timetableItems.length === 0 ? (
                    <EmptyState className="py-8 text-center text-xs text-muted">
                      該当する列車はありません
                    </EmptyState>
                  ) : (
                    <ListBox
                      key={`subway-train-list-${validLineId}-${validDirectionKey}-${dayType}`}
                      aria-label="発車便一覧"
                      selectionMode="none"
                      className="p-1.5 pb-6 gap-1"
                    >
                      {timetableItems.map((item) => {
                        const isPast = item.departureMinutes < currentMinutes;
                        const isNext = item.train.id === nextTrainId;
                        const dimmed = isPast && !isNext;

                        return (
                          <ListBox.Item
                            key={item.train.id}
                            id={item.train.id}
                            textValue={`${item.departureTime} ${item.terminalStation}行 ${item.track}番線`}
                            data-subway-train-id={item.train.id}
                            onAction={() => setSelectedTrainId(item.train.id)}
                            style={{
                              backgroundColor: isNext ? `${meta.color}15` : undefined,
                              opacity: dimmed ? 0.5 : 1,
                            }}
                            className={`w-full rounded-lg px-2.5 py-2 cursor-pointer transition-colors ${
                              isNext
                                ? 'border border-accent/40 font-bold'
                                : 'hover:bg-surface-secondary border border-transparent'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1.5 w-full">
                              {/* 左側: 発車時刻 | 終着駅ナンバリング＋行先 */}
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className={`text-sm w-[3.1em] text-right font-english tabular-nums shrink-0 ${
                                    isNext ? 'font-extrabold' : 'font-bold'
                                  }`}
                                >
                                  {item.departureTime}
                                </span>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <SubwayStationMark
                                    line={meta.lineId}
                                    code={item.terminalCode}
                                    size={22}
                                  />
                                  <span className={`text-sm ${isNext ? 'font-extrabold' : 'font-semibold'}`}>
                                    {item.terminalStation}行
                                  </span>
                                </div>
                              </div>

                              {/* 右側: のりば | 終着到着時刻 | 詳細シェブロン */}
                              <div className="flex items-center gap-1.5 shrink-0 font-english tabular-nums">
                                <span className="text-xs text-muted">
                                  {item.track}番線
                                </span>
                                <span className="text-[11px] text-muted w-[68px] text-right">
                                  終着 {item.terminalArrivalTime}
                                </span>
                                <Icon
                                  name="chevron_right"
                                  size={15}
                                  className="text-muted"
                                />
                              </div>
                            </div>
                          </ListBox.Item>
                        );
                      })}
                    </ListBox>
                  )}
                </ScrollShadow>
              </div>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default SubwayTimetableModal;
