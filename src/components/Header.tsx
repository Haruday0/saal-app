import React from 'react';
import {
  ActionIcon,
  Box,
  Button,
  Group,
  Text,
  Title,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core';
import { Icon } from './Icon';
import { LINE_COLORS } from '../config/trainLineRules';
import { useDebug } from '../context/DebugContext';

export const Header: React.FC = () => {
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';
  const { isDebugMode, isHeaderPanelOpen, setIsHeaderPanelOpen, isTimeOverridden } = useDebug();

  return (
    <Box
      component="header"
      className="shrink-0 sticky top-0 z-30"
      style={{
        backgroundColor: 'var(--mantine-color-body)',
        borderBottom: '1px solid var(--mantine-color-default-border)',
      }}
    >
      <Group justify="space-between" wrap="nowrap" h={48} px={14} maw={448} mx="auto">
        {/* ロゴ・路線名 */}
        <Group gap={8} wrap="nowrap">
          <Box w={6} h={24} style={{ borderRadius: 999, backgroundColor: LINE_COLORS.saal }} />
          <div>
            <Title order={1} fz={14} fw={900} lh={1}>
              仙台空港アクセス線
            </Title>
            <Text fz={9} c="dimmed" tt="uppercase" mt={2} className="font-english tracking-wider">
              Sendai Airport Access Line
            </Text>
          </div>
        </Group>

        {/* 右側アクションエリア */}
        <Group gap={6} wrap="nowrap">
          {/* デバッグモード（?debug=1）時のみ表示されるDEBUGトグルボタン */}
          {isDebugMode && (
            <Button
              size="compact-sm"
              radius="xl"
              variant={isHeaderPanelOpen ? 'filled' : 'light'}
              color={isTimeOverridden ? 'yellow' : 'gray'}
              onClick={() => setIsHeaderPanelOpen((prev) => !prev)}
              fz={10.5}
              fw={800}
              px={8}
            >
              DEBUG
            </Button>
          )}

          {/* ライト / ダーク テーマ切り替え */}
          <ActionIcon
            onClick={() => setColorScheme(isDark ? 'light' : 'dark')}
            variant="default"
            size="md"
            radius="xl"
            aria-label="テーマ切り替え"
          >
            <Icon name={isDark ? 'light_mode' : 'dark_mode'} size={16} />
          </ActionIcon>

          {/* JR東日本「どこトレ」スマートフォン版 外部リンク */}
          <Button
            component="a"
            href="https://doko-train.jp/sp/index.html?area=sen"
            target="_blank"
            rel="noopener noreferrer"
            variant="default"
            size="compact-sm"
            radius="xl"
            fz={11}
            rightSection={<Icon name="open_in_new" size={14} />}
          >
            どこトレ
          </Button>
        </Group>
      </Group>
    </Box>
  );
};
