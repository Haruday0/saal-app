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
    effectiveMinutes,
    setOverrideMinutes,
    setOverrideTimeString,
    adjustTimeMinutes,
    resetTime,
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

  // スライダーは 04:00 (240分) 〜 23:59 (1439分) の範囲
  const sliderValue = Math.min(1439, Math.max(240, effectiveMinutes));
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
                {variant === 'header' ? 'シミュレーション時刻設定' : '時刻・電光掲示板デバッグ'}
              </Text>
              <Badge
                size="xs"
                color={isTimeOverridden ? 'yellow' : 'gray'}
                variant="light"
                radius="sm"
                tt="none"
                className="font-english tabular-nums"
              >
                {currentHHMM} {isTimeOverridden ? '(仮想)' : '(実時刻)'}
              </Badge>
              {hasRowOverrides && (
                <Badge size="xs" color="orange" variant="light" radius="sm" tt="none">
                  LED直接入力中
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
          <Stack gap={8} pt={8}>
            {/* 機能A: アプリ基準時刻（シミュレーション現在時刻）の変更 */}
            <Stack gap={5}>
              <Group justify="space-between" align="center" wrap="nowrap">
                <Text fz={11} fw={700} c="dimmed">
                  ① 基準時刻シミュレーション (04:00〜23:59)
                </Text>
                <Group gap={4} wrap="nowrap">
                  <input
                    type="time"
                    value={currentHHMM}
                    onChange={(e) => setOverrideTimeString(e.target.value)}
                    aria-label="シミュレーション時刻入力"
                    className="text-[11.5px] font-bold font-english tabular-nums px-1.5 py-0.5 rounded border border-[var(--mantine-color-default-border)] bg-transparent"
                  />
                  <Button
                    size="compact-xs"
                    variant={isTimeOverridden ? 'light' : 'default'}
                    color={isTimeOverridden ? 'yellow' : 'gray'}
                    onClick={resetTime}
                    fz={10.5}
                  >
                    実時刻に戻す
                  </Button>
                </Group>
              </Group>

              {/* スライダー (04:00〜23:59) */}
              <Box px={4} py={2}>
                <Slider
                  min={240}
                  max={1439}
                  step={1}
                  value={sliderValue}
                  onChange={(val) => setOverrideMinutes(val)}
                  label={formatMinutesToHHMM}
                  color="yellow"
                  size="sm"
                  marks={[
                    { value: 360, label: '6:00' },
                    { value: 720, label: '12:00' },
                    { value: 1080, label: '18:00' },
                    { value: 1380, label: '23:00' },
                  ]}
                  styles={{
                    markLabel: { fontSize: 9, marginTop: 3 },
                  }}
                />
              </Box>

              {/* 微調整ボタン (-1h, -10m, -1m, +1m, +10m, +1h) */}
              <Group gap={4} grow mt={8}>
                {[
                  { label: '-1h', delta: -60 },
                  { label: '-10m', delta: -10 },
                  { label: '-1m', delta: -1 },
                  { label: '+1m', delta: 1 },
                  { label: '+10m', delta: 10 },
                  { label: '+1h', delta: 60 },
                ].map((btn) => (
                  <Button
                    key={btn.label}
                    size="compact-xs"
                    variant="default"
                    fz={10.5}
                    px={2}
                    className="font-english tabular-nums"
                    onClick={() => adjustTimeMinutes(btn.delta)}
                  >
                    {btn.label}
                  </Button>
                ))}
              </Group>
            </Stack>

            <Divider my={2} />

            {/* 機能B: 電光掲示板の各段の発車時刻テキスト直接書き換え（全数字 0〜9 テスト用） */}
            <Stack gap={5}>
              <Group justify="space-between" align="center" wrap="nowrap">
                <Text fz={11} fw={700} c="dimmed">
                  ② 電光掲示板 直接オーバーライド (0〜9数字テスト)
                </Text>
                <Button
                  size="compact-xs"
                  variant={hasRowOverrides ? 'light' : 'default'}
                  color={hasRowOverrides ? 'red' : 'gray'}
                  onClick={clearRowOverrides}
                  fz={10.5}
                >
                  クリア
                </Button>
              </Group>

              {/* ワンタップ数字プリセット */}
              <Group gap={4} grow>
                <Button
                  size="compact-xs"
                  variant="light"
                  color="yellow"
                  fz={10.5}
                  px={4}
                  onClick={() => applyDigitPreset(1)}
                >
                  0-9テストA (12:34 / 56:78)
                </Button>
                <Button
                  size="compact-xs"
                  variant="light"
                  color="yellow"
                  fz={10.5}
                  px={4}
                  onClick={() => applyDigitPreset(2)}
                >
                  0-9テストB (90:12 /  3:45)
                </Button>
              </Group>

              {/* 駅詳細シート内では各段の直接入力欄を表示 */}
              {variant === 'sheet' && (
                <Stack gap={4} mt={2}>
                  {rowIndices.map((idx) => (
                    <Group key={idx} gap={4} wrap="nowrap" align="center">
                      <Text fz={10.5} fw={700} c="dimmed" w={36} className="shrink-0">
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
                            height: 26,
                            minHeight: 26,
                            fontSize: 11.5,
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
                            height: 26,
                            minHeight: 26,
                            fontSize: 11.5,
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
                        w={40}
                        styles={{
                          input: {
                            height: 26,
                            minHeight: 26,
                            fontSize: 11.5,
                            paddingLeft: 4,
                            paddingRight: 4,
                            textAlign: 'center',
                          },
                        }}
                      />
                    </Group>
                  ))}
                </Stack>
              )}
            </Stack>
          </Stack>
        </Collapse>
      </Box>
    </Paper>
  );
};
