import React from 'react';
import {
  Paper,
  Group,
  Stack,
  Text,
  Button,
  TextInput,
  Slider,
  Badge,
  Collapse,
  UnstyledButton,
  Divider,
  Box,
} from '@mantine/core';
import { useDebug } from '../context/DebugContext';
import { Icon } from './Icon';

interface DebugControlPanelProps {
  /** 電光掲示板の直上に埋め込むモードか、ヘッダー直下のバーモードか */
  variant?: 'sheet' | 'header';
  /** 仙台駅（3段表示）かどうか */
  isSendai?: boolean;
}

function formatMinutesToHHMM(mins: number): string {
  const normalized = ((Math.round(mins) % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export const DebugControlPanel: React.FC<DebugControlPanelProps> = ({
  variant = 'sheet',
  isSendai = false,
}) => {
  const {
    isDebugMode,
    isHeaderPanelOpen,
    setIsHeaderPanelOpen,
    isSheetPanelOpen,
    setIsSheetPanelOpen,
    now,
    isTimeOverridden,
    setOverrideMinutes,
    setOverrideTimeString,
    setOverrideDateString,
    resetAll,
    rowOverrides,
    setRowOverride,
    applyDigitPreset,
    clearRowOverrides,
    hasRowOverrides,
  } = useDebug();

  if (!isDebugMode) return null;

  const isOpen = variant === 'header' ? isHeaderPanelOpen : isSheetPanelOpen;
  const toggleOpen = () => {
    if (variant === 'header') {
      setIsHeaderPanelOpen((prev) => !prev);
    } else {
      setIsSheetPanelOpen((prev) => !prev);
    }
  };

  const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}`;
  const currentYMD = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
  const dayOfWeekStr = ['日', '月', '火', '水', '木', '金', '土'][now.getDay()];

  // スライダーは 04:00 (240分) 〜 翌02:00 (1560分) の範囲
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const railwayMinutes = (currentHours < 4 ? currentHours + 24 : currentHours) * 60 + currentMinutes;
  const sliderValue = Math.min(1560, Math.max(240, railwayMinutes));
  const rowIndices: (0 | 1 | 2)[] = isSendai ? [0, 1, 2] : [0, 1];

  return (
    <Paper
      data-scrollable="true"
      withBorder={variant === 'sheet'}
      radius={variant === 'sheet' ? 'md' : 0}
      p={8}
      mb={variant === 'sheet' ? 8 : 0}
      className={variant === 'header' ? 'shrink-0 z-20 shadow-sm' : ''}
      style={{
        backgroundColor: 'var(--mantine-color-body)',
        borderColor:
          isTimeOverridden || hasRowOverrides
            ? '#f59e0b'
            : 'var(--mantine-color-default-border)',
        borderBottom:
          variant === 'header' ? '1px solid var(--mantine-color-default-border)' : undefined,
      }}
    >
      <Box maw={variant === 'header' ? 448 : undefined} mx={variant === 'header' ? 'auto' : undefined}>
        {/* パネルヘッダー（折りたたみトグルバー） */}
        <UnstyledButton onClick={toggleOpen} w="100%">
          <Group justify="space-between" wrap="nowrap" gap={6}>
            <Group gap={6} wrap="nowrap">
              <Badge size="xs" color="yellow" variant="filled" radius="sm" tt="none">
                DEBUG
              </Badge>
              <Text fz={11.5} fw={800}>
                {variant === 'header' ? 'シミュレーション設定' : 'デバッグ設定'}
              </Text>
              <Badge
                size="xs"
                color={isTimeOverridden ? 'yellow' : 'gray'}
                variant="light"
                radius="sm"
                tt="none"
                className="font-english tabular-nums"
              >
                {currentYMD}({dayOfWeekStr}) {currentHHMM} {isTimeOverridden ? '(仮想)' : '(実日時)'}
              </Badge>
              {hasRowOverrides && (
                <Badge size="xs" color="orange" variant="light" radius="sm" tt="none">
                  LED入力中
                </Badge>
              )}
            </Group>
            <Group gap={4} wrap="nowrap">
              <Text fz={10.5} c="dimmed" fw={600}>
                {isOpen ? '閉じる' : '開く'}
              </Text>
              <Icon
                name="expand_more"
                size={16}
                className={`text-slate-400 transition-transform duration-200 ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </Group>
          </Group>
        </UnstyledButton>

        <Collapse expanded={isOpen}>
          <Stack gap={10} pt={8}>
            {/* 日付・時刻の設定行 */}
            <Group justify="space-between" align="center" wrap="wrap" gap={8}>
              <Group gap={6} align="center">
                <Text fz={11} fw={700} c="dimmed">
                  日付
                </Text>
                <input
                  type="date"
                  value={currentYMD}
                  onChange={(e) => setOverrideDateString(e.target.value)}
                  aria-label="シミュレーション日付入力"
                  className="text-[11.5px] font-bold font-english tabular-nums px-2 py-0.5 rounded border border-[var(--mantine-color-default-border)] bg-transparent text-[var(--mantine-color-text)] cursor-pointer"
                />
              </Group>

              <Group gap={6} align="center">
                <Text fz={11} fw={700} c="dimmed">
                  時刻
                </Text>
                <input
                  type="time"
                  value={currentHHMM}
                  onChange={(e) => setOverrideTimeString(e.target.value)}
                  aria-label="シミュレーション時刻入力"
                  className="text-[11.5px] font-bold font-english tabular-nums px-2 py-0.5 rounded border border-[var(--mantine-color-default-border)] bg-transparent text-[var(--mantine-color-text)] cursor-pointer"
                />
              </Group>

              <Button
                size="compact-xs"
                variant={isTimeOverridden ? 'light' : 'default'}
                color={isTimeOverridden ? 'yellow' : 'gray'}
                onClick={resetAll}
                fz={10.5}
                disabled={!isTimeOverridden}
              >
                実日時に戻す
              </Button>
            </Group>

            {/* 時刻スライダー (04:00〜翌02:00) */}
            <Box px={4} py={2}>
              <Slider
                min={240}
                max={1560}
                step={1}
                value={sliderValue}
                onChange={(val) => setOverrideMinutes(val % 1440)}
                label={formatMinutesToHHMM}
                color="yellow"
                size="sm"
                marks={[
                  { value: 360, label: '6:00' },
                  { value: 720, label: '12:00' },
                  { value: 1080, label: '18:00' },
                  { value: 1440, label: '0:00' },
                  { value: 1560, label: '2:00' },
                ]}
                styles={{
                  markLabel: { fontSize: 9, marginTop: 3 },
                }}
              />
            </Box>

            {/* 駅詳細シート内のみ: 電光掲示板LEDの直接書き換え */}
            {variant === 'sheet' && (
              <>
                <Divider my={2} />
                <Stack gap={5}>
                  <Group justify="space-between" align="center" wrap="nowrap">
                    <Text fz={11} fw={700} c="dimmed">
                      LED表示テスト
                    </Text>
                    <Group gap={4}>
                      <Button
                        size="compact-xs"
                        variant="light"
                        color="yellow"
                        fz={10}
                        px={4}
                        onClick={() => applyDigitPreset(1)}
                      >
                        0-9テストA
                      </Button>
                      <Button
                        size="compact-xs"
                        variant="light"
                        color="yellow"
                        fz={10}
                        px={4}
                        onClick={() => applyDigitPreset(2)}
                      >
                        0-9テストB
                      </Button>
                      <Button
                        size="compact-xs"
                        variant={hasRowOverrides ? 'light' : 'default'}
                        color={hasRowOverrides ? 'red' : 'gray'}
                        onClick={clearRowOverrides}
                        fz={10}
                        disabled={!hasRowOverrides}
                      >
                        クリア
                      </Button>
                    </Group>
                  </Group>

                  <Stack gap={4} mt={2}>
                    {rowIndices.map((idx) => (
                      <Group key={idx} gap={4} wrap="nowrap" align="center">
                        <Text fz={10.5} fw={700} c="dimmed" w={32} className="shrink-0">
                          {idx + 1}段目
                        </Text>
                        <TextInput
                          size="xs"
                          placeholder="時刻 (例 12:34)"
                          value={rowOverrides[idx].departureTime}
                          onChange={(e) =>
                            setRowOverride(idx, { departureTime: e.currentTarget.value })
                          }
                          style={{ flex: 1.2 }}
                          styles={{
                            input: {
                              height: 24,
                              minHeight: 24,
                              fontSize: 11,
                              paddingLeft: 6,
                              paddingRight: 6,
                              fontFamily: 'monospace',
                            },
                          }}
                        />
                        <TextInput
                          size="xs"
                          placeholder="行先 (任意)"
                          value={rowOverrides[idx].destination}
                          onChange={(e) =>
                            setRowOverride(idx, { destination: e.currentTarget.value })
                          }
                          style={{ flex: 1 }}
                          styles={{
                            input: {
                              height: 24,
                              minHeight: 24,
                              fontSize: 11,
                              paddingLeft: 6,
                              paddingRight: 6,
                            },
                          }}
                        />
                        <TextInput
                          size="xs"
                          placeholder="両"
                          value={rowOverrides[idx].cars}
                          onChange={(e) => setRowOverride(idx, { cars: e.currentTarget.value })}
                          w={36}
                          styles={{
                            input: {
                              height: 24,
                              minHeight: 24,
                              fontSize: 11,
                              paddingLeft: 4,
                              paddingRight: 4,
                              textAlign: 'center',
                            },
                          }}
                        />
                      </Group>
                    ))}
                  </Stack>
                </Stack>
              </>
            )}
          </Stack>
        </Collapse>
      </Box>
    </Paper>
  );
};
