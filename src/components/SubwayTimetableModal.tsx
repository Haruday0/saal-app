import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Modal,
  SegmentedControl,
  ScrollArea,
  Badge,
  Group,
  Text,
  Stack,
  Timeline,
  UnstyledButton,
  Button,
  Box,
  Title,
} from '@mantine/core';
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

interface SubwayTimetableModalProps {
  isOpen: boolean;
  onClose: () => void;
  stationId: string;
  initialDirectionKey?: SubwayDirectionKey;
  initialTrainId?: string | null;
  now: Date;
}

/** 静止した五角形トレインアイコン（下向き進行方向三角ノーズ ＋ 四角形車体） */
const PentagonIcon: React.FC<{ lineColor: string; size?: number }> = ({ lineColor, size = 14 }) => {
  const w = size;
  const bodyH = Math.round(size * 0.6);
  const noseH = Math.round(size * 0.4);

  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: w,
          height: bodyH,
          backgroundColor: lineColor,
          borderRadius: '2px 2px 0 0',
        }}
      />
      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: `${w / 2}px solid transparent`,
          borderRight: `${w / 2}px solid transparent`,
          borderTop: `${noseH}px solid ${lineColor}`,
        }}
      />
    </div>
  );
};

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

  const [directionKey, setDirectionKey] = useState<SubwayDirectionKey>(initialDirectionKey);
  const [dayType, setDayType] = useState<SubwayDayType>(todayDayType);
  const [selectedTrainId, setSelectedTrainId] = useState<string | null>(initialTrainId);

  // モーダルが開いたときに初期状態を同期
  useEffect(() => {
    if (isOpen) {
      const validKey: SubwayDirectionKey =
        !isSendai && initialDirectionKey.startsWith('tozai-')
          ? 'namboku-north'
          : initialDirectionKey;
      setDirectionKey(validKey);
      setDayType(isWeekendHolidayOrYearEnd(now) ? 'holiday' : 'weekday');
      setSelectedTrainId(initialTrainId || null);
    }
  }, [isOpen, isSendai, initialDirectionKey, initialTrainId]);

  const meta = SUBWAY_DIRECTIONS[directionKey];
  const activeLineId: SubwayLineId = meta.lineId;

  // 現在時刻（4:00基準の鉄道分）
  const currentMinutes = useMemo(
    () => Math.floor(getCurrentRailwaySeconds(now) / 60),
    [now]
  );

  // 選択中の路線・方面・ダイヤ種別の全列車リスト
  const timetableItems = useMemo(
    () => getSubwayStationTimetable(boardingStationName, directionKey, dayType),
    [boardingStationName, directionKey, dayType]
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

  // 1. 時刻表一覧ビューの自動初期スクロール（直前1〜2本の過去列車が上に見えるよう targetTop - 85）
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
  }, [isOpen, selectedTrainItem, nextTrainId, directionKey, dayType]);

  // 2. 全停車駅タイムラインビューの自動初期スクロール（乗車駅が画面上部〜中央付近に見えるようスクロール）
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
    if (newLine === 'namboku') {
      setDirectionKey('namboku-north');
    } else {
      setDirectionKey('tozai-east');
    }
  };

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={
        <Group gap={8} wrap="nowrap" align="center">
          <SubwayStationMark line={activeLineId} code={meta.lineCode} size={26} />
          <Text fw={900} fz={15}>
            {boardingStationName}駅 仙台市地下鉄時刻表
          </Text>
        </Group>
      }
      centered
      size="md"
      radius="lg"
      padding={0}
      zIndex={1000}
      overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
      styles={{
        content: {
          height: 'calc(100dvh - 4rem)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        },
        header: {
          borderBottom: '1px solid var(--mantine-color-default-border)',
          paddingInline: 14,
          minHeight: 50,
        },
        title: { fontWeight: 900, fontSize: 15 },
        body: {
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
        },
      }}
    >
      {selectedTrainItem ? (
        /* ========== 機能2：全停車駅到着時刻タイムライン表示 ========== */
        <>
          <Stack
            gap={8}
            p="sm"
            style={{
              flexShrink: 0,
              borderBottom: '1px solid var(--mantine-color-default-border)',
              backgroundColor: 'var(--mantine-color-default-hover)',
            }}
          >
            <Group justify="space-between" align="center" wrap="nowrap">
              <Button
                size="compact-xs"
                variant="default"
                radius="md"
                leftSection={<Icon name="arrow_back" size={14} />}
                onClick={() => setSelectedTrainId(null)}
                fw={700}
              >
                時刻表に戻る
              </Button>
              <Group gap={6} wrap="nowrap">
                <Badge
                  size="xs"
                  radius="sm"
                  color={dayType === 'holiday' ? 'red' : 'gray'}
                  variant="light"
                  tt="none"
                >
                  {dayType === 'holiday' ? '土休日ダイヤ' : '平日ダイヤ'}
                </Badge>
                <Badge size="xs" radius="sm" variant="default" fw={700} tt="none">
                  {selectedTrainItem.track}番線
                </Badge>
              </Group>
            </Group>

            <Group justify="space-between" align="center" wrap="nowrap" pt={2}>
              <Group gap={8} align="center" wrap="nowrap">
                <Box
                  w={4}
                  h={32}
                  style={{
                    backgroundColor: meta.color,
                    borderRadius: 2,
                    flexShrink: 0,
                  }}
                />
                <Stack gap={2}>
                  <Group gap={6} align="center" wrap="nowrap">
                    <SubwayStationMark
                      line={meta.lineId}
                      code={meta.lineCode}
                      size={22}
                    />
                    <Text fz="xs" fw={800} c="dimmed">
                      仙台市地下鉄 {meta.lineName}（{meta.directionLabel}）
                    </Text>
                  </Group>
                  <Group gap={6} align="center" wrap="nowrap">
                    <Title order={3} fz={17} fw={800} lh={1.2}>
                      {selectedTrainItem.terminalStation}
                      <Text component="span" fz="xs" fw={700} ml={2} c="dimmed">
                        行
                      </Text>
                    </Title>
                    <SubwayStationMark
                      line={meta.lineId}
                      code={selectedTrainItem.terminalCode}
                      size={24}
                    />
                  </Group>
                </Stack>
              </Group>

              <Stack gap={1} align="flex-end" style={{ flexShrink: 0 }}>
                <Text fz={11} c="dimmed" fw={600} className="font-english tabular-nums">
                  {selectedTrainItem.stationName} {selectedTrainItem.departureTime}発
                </Text>
                <Text fz="xs" fw={800} className="font-english tabular-nums">
                  {selectedTrainItem.terminalStation} {selectedTrainItem.terminalArrivalTime}着
                </Text>
              </Stack>
            </Group>
          </Stack>

          <ScrollArea
            viewportRef={timelineViewportRef}
            type="auto"
            data-scrollable="true"
            style={{ flex: 1, minHeight: 0 }}
            viewportProps={{
              style: { overscrollBehavior: 'contain' },
            }}
          >
            <Box p="md" pb="xl">
              <Group justify="space-between" align="baseline" mb={12} wrap="nowrap">
                <Text fz="xs" fw={700} c="dimmed">
                  全停車駅・到着時刻タイムライン
                </Text>
                <Text fz={10.5} c="dimmed" fw={600}>
                  全{meta.stations.length}駅
                </Text>
              </Group>

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
                  <Timeline
                    active={-1}
                    bulletSize={18}
                    lineWidth={2.5}
                    color={meta.mantineColor}
                  >
                    {meta.stations.map((stName, i) => {
                      const stCode = meta.stationCodes[i];
                      const rawTime = times[i];
                      const formattedTime = formatSubwayTime(rawTime);
                      const isLast = i === meta.stations.length - 1;
                      const isBoarding = i === boardingIdx;
                      const isCurrentPos = isCurrentlyRunning && i === currentStopIdx;

                      // 乗車駅より前の駅、または本日運行中で既に通過済みの駅は控えめなグレーにする
                      const passed =
                        i < boardingIdx || (isCurrentlyRunning && i < currentStopIdx);
                      const linePassed =
                        i < boardingIdx || (isCurrentlyRunning && i < currentStopIdx);

                      const customBullet = isCurrentPos ? (
                        <PentagonIcon lineColor={meta.color} size={14} />
                      ) : undefined;

                      return (
                        <Timeline.Item
                          key={`${stCode}-${i}`}
                          bullet={customBullet}
                          lineVariant="solid"
                          style={
                            !linePassed
                              ? ({
                                  '--item-border-color': 'var(--tl-color)',
                                } as React.CSSProperties)
                              : undefined
                          }
                          styles={
                            !passed
                              ? {
                                  itemBullet: {
                                    borderColor: 'var(--tl-color)',
                                    backgroundColor: isBoarding
                                      ? meta.color
                                      : 'var(--mantine-color-body)',
                                  },
                                }
                              : undefined
                          }
                        >
                          <Box
                            data-subway-stop-index={i}
                            py={3}
                            px={6}
                            style={{
                              borderRadius: 'var(--mantine-radius-sm)',
                              backgroundColor: isBoarding
                                ? `var(--mantine-color-${meta.mantineColor}-light)`
                                : undefined,
                            }}
                          >
                            <Group justify="space-between" wrap="nowrap" gap="xs">
                              {/* 左側: 駅ナンバリング丸枠マーク ＋ 駅名 */}
                              <Group gap={7} wrap="nowrap" align="center" className="min-w-0" style={{ flex: 1 }}>
                                <SubwayStationMark
                                  line={meta.lineId}
                                  code={stCode}
                                  size={24}
                                  dimmed={passed && !isBoarding}
                                />
                                <Text
                                  fz="sm"
                                  fw={isBoarding || isLast ? 800 : passed ? 500 : 700}
                                  c={passed && !isBoarding ? 'dimmed' : undefined}
                                  style={{ whiteSpace: 'nowrap' }}
                                >
                                  {stName}
                                </Text>
                              </Group>

                              {/* 右側: 発着時刻 */}
                              <Group
                                gap={8}
                                wrap="nowrap"
                                align="center"
                                justify="flex-end"
                                style={{ flexShrink: 0 }}
                              >
                                <Text
                                  fz="xs"
                                  fw={isBoarding || isLast ? 800 : 700}
                                  c={passed && !isBoarding ? 'dimmed' : undefined}
                                  className="font-english tabular-nums"
                                  style={{
                                    whiteSpace: 'nowrap',
                                    minWidth: 52,
                                    textAlign: 'right',
                                  }}
                                >
                                  {formattedTime} {i <= boardingIdx && !isLast ? '発' : '着'}
                                </Text>
                              </Group>
                            </Group>
                          </Box>
                        </Timeline.Item>
                      );
                    })}
                  </Timeline>
                );
              })()}
            </Box>
          </ScrollArea>
        </>
      ) : (
        /* ========== 機能1：駅別・方面別の1日全時刻表一覧 ========== */
        <>
          <Stack
            gap={6}
            p="sm"
            style={{
              flexShrink: 0,
              borderBottom: '1px solid var(--mantine-color-default-border)',
              backgroundColor: 'var(--mantine-color-default-hover)',
            }}
          >
            {/* 仙台駅のみ: 南北線 / 東西線 の路線切り替え */}
            {isSendai && (
              <SegmentedControl
                size="xs"
                fullWidth
                radius="md"
                value={activeLineId}
                onChange={(val) => handleLineChange(val as SubwayLineId)}
                data={[
                  {
                    value: 'namboku',
                    label: (
                      <Group gap={5} justify="center" wrap="nowrap">
                        <SubwayStationMark line="namboku" code="N" size={20} />
                        <span>南北線（1・2番線）</span>
                      </Group>
                    ),
                  },
                  {
                    value: 'tozai',
                    label: (
                      <Group gap={5} justify="center" wrap="nowrap">
                        <SubwayStationMark line="tozai" code="T" size={20} />
                        <span>東西線（3・4番線）</span>
                      </Group>
                    ),
                  },
                ]}
              />
            )}

            {/* 方面（のりば）切り替え */}
            {activeLineId === 'namboku' ? (
              <SegmentedControl
                size="xs"
                fullWidth
                radius="md"
                value={directionKey}
                onChange={(val) => setDirectionKey(val as SubwayDirectionKey)}
                data={[
                  {
                    value: 'namboku-north',
                    label: (
                      <Group gap={5} justify="center" wrap="nowrap">
                        <SubwayStationMark line="namboku" code="N01" size={20} />
                        <span>1番線 泉中央方面</span>
                      </Group>
                    ),
                  },
                  {
                    value: 'namboku-south',
                    label: (
                      <Group gap={5} justify="center" wrap="nowrap">
                        <SubwayStationMark line="namboku" code="N17" size={20} />
                        <span>2番線 富沢方面</span>
                      </Group>
                    ),
                  },
                ]}
              />
            ) : (
              <SegmentedControl
                size="xs"
                fullWidth
                radius="md"
                value={directionKey}
                onChange={(val) => setDirectionKey(val as SubwayDirectionKey)}
                data={[
                  {
                    value: 'tozai-east',
                    label: (
                      <Group gap={5} justify="center" wrap="nowrap">
                        <SubwayStationMark line="tozai" code="T13" size={20} />
                        <span>3番線 荒井方面</span>
                      </Group>
                    ),
                  },
                  {
                    value: 'tozai-west',
                    label: (
                      <Group gap={5} justify="center" wrap="nowrap">
                        <SubwayStationMark line="tozai" code="T01" size={20} />
                        <span>4番線 八木山動物公園方面</span>
                      </Group>
                    ),
                  },
                ]}
              />
            )}

            {/* 平日ダイヤ / 土休日ダイヤ 切り替え */}
            <SegmentedControl
              size="xs"
              fullWidth
              radius="md"
              value={dayType}
              onChange={(val) => setDayType(val as SubwayDayType)}
              data={[
                {
                  label: `平日ダイヤ${!isTodayHoliday ? '（本日）' : ''}`,
                  value: 'weekday',
                },
                {
                  label: `土休日ダイヤ${isTodayHoliday ? '（本日）' : ''}`,
                  value: 'holiday',
                },
              ]}
            />
          </Stack>

          {/* 時刻表一覧スクロール領域 */}
          <ScrollArea
            viewportRef={listViewportRef}
            type="auto"
            data-scrollable="true"
            style={{ flex: 1, minHeight: 0 }}
            viewportProps={{
              style: { overscrollBehavior: 'contain' },
            }}
          >
            <Stack gap={0} p={6} pb="xl">
              {timetableItems.map((item) => {
                const isPast = item.departureMinutes < currentMinutes;
                const isNext = item.train.id === nextTrainId;
                const dimmed = isPast && !isNext;

                return (
                  <UnstyledButton
                    key={item.train.id}
                    data-subway-train-id={item.train.id}
                    onClick={() => setSelectedTrainId(item.train.id)}
                    style={{
                      borderRadius: 'var(--mantine-radius-md)',
                      backgroundColor: isNext
                        ? `var(--mantine-color-${meta.mantineColor}-light)`
                        : undefined,
                      opacity: dimmed ? 0.5 : 1,
                      width: '100%',
                    }}
                    className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    <Group
                      justify="space-between"
                      wrap="nowrap"
                      gap={6}
                      px={8}
                      py={8}
                    >
                      {/* 左側: 発車時刻 | 終着駅ナンバリング＋行先 */}
                      <Group gap={8} wrap="nowrap" className="min-w-0">
                        <Text
                          fz="sm"
                          fw={isNext ? 800 : 700}
                          w="3.1em"
                          ta="right"
                          className="font-english tabular-nums shrink-0"
                        >
                          {item.departureTime}
                        </Text>

                        <Group gap={6} wrap="nowrap" className="shrink-0">
                          <SubwayStationMark
                            line={meta.lineId}
                            code={item.terminalCode}
                            size={22}
                          />
                          <Text
                            fz="sm"
                            fw={isNext ? 800 : 600}
                          >
                            {item.terminalStation}行
                          </Text>
                        </Group>
                      </Group>

                      {/* 右側: のりば | 終着到着時刻 | 詳細シェブロン */}
                      <Group
                        gap={6}
                        wrap="nowrap"
                        className="shrink-0 font-english tabular-nums"
                      >
                        <Text fz="xs" c="dimmed">
                          {item.track}番線
                        </Text>
                        <Text fz={11} c="dimmed" w={68} ta="right">
                          終着 {item.terminalArrivalTime}
                        </Text>
                        <Icon
                          name="chevron_right"
                          size={15}
                          className="text-slate-400 dark:text-slate-500"
                        />
                      </Group>
                    </Group>
                  </UnstyledButton>
                );
              })}
            </Stack>
          </ScrollArea>
        </>
      )}
    </Modal>
  );
};

export default SubwayTimetableModal;
