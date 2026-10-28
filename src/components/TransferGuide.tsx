import React from 'react';
import { Paper, Stack, Group, Text, Divider } from '@mantine/core';
import { Station } from '../types';
import { JisSubway, JisBus } from './icons';

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
const Block: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({
  icon,
  title,
  children,
}) => (
  <Stack gap={6}>
    <Group gap={6} wrap="nowrap">
      {icon}
      <Text fz="xs" fw={700}>
        {title}
      </Text>
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
  const hasNatoringo = ['minami-sendai', 'natori', 'morisekinoshita', 'sendai-airport'].includes(stationId);

  if (stationId === 'mitazono') {
    return (
      <Paper withBorder p="sm" radius="lg">
        <Text fz="xs" c="dimmed" ta="center">
          美田園駅にはバス・他社線の乗り換えはありません
        </Text>
      </Paper>
    );
  }

  return (
    <Paper withBorder p="sm" radius="lg">
      <Stack gap="sm">
        {/* 地下鉄 */}
        {hasSubway && (
          <Block icon={<JisSubway size={15} color="#0085ca" />} title="仙台市地下鉄">
            <Row label="南北線（泉中央方面）" time="15:41 / 15:49" />
            <Row label="南北線（富沢方面）" time="15:43 / 15:51" />
            {stationId === 'sendai' && (
              <>
                <Divider />
                <Row label="東西線" time="15:42 / 15:50" />
              </>
            )}
          </Block>
        )}

        {/* 仙台市営バス */}
        {hasSendaiBus && (
          <Block icon={<JisBus size={15} color="#059669" />} title="仙台市営バス（直近発車）">
            <Row
              label={
                <>
                  <Text component="span" fz={12} fw={500} c="var(--mantine-color-text)">
                    [60] 交通局東北大学病院前行
                  </Text>
                  <Text component="span" fz={11} c="dimmed" ml={8}>
                    1番のりば
                  </Text>
                </>
              }
              time="15:45"
            />
          </Block>
        )}

        {/* 宮城交通バス */}
        {hasMiyakouBus && (
          <Block icon={<JisBus size={15} color="#b91c1c" />} title="宮城交通バス">
            <Row label="八木山動物公園駅・山田方面" time="15:50 / 16:15" />
          </Block>
        )}

        {/* なとりん号 */}
        {hasNatoringo && (
          <Block icon={<JisBus size={15} color="#d97706" />} title="コミュニティバス「なとりん号」">
            <Row label="閖上線（閖上方面）" time="15:40" />
            <Row label="愛島線（愛島台方面）" time="16:10" />
          </Block>
        )}
      </Stack>
    </Paper>
  );
};
