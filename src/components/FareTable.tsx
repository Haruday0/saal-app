import React from 'react';
import { Paper, Table, Text, Group, Box } from '@mantine/core';
import { Station } from '../types';
import { STATIONS } from '../data/mockData';
import { JisTicketVending } from './icons';

interface FareTableProps {
  currentStation: Station;
}

/** 大人運賃（大）＋小児運賃（小）の2段表示 */
const FareCell: React.FC<{ adult?: number | null; child?: number | null; accent?: boolean }> = ({
  adult,
  child,
  accent,
}) => {
  if (adult == null) {
    return (
      <Text fz="xs" c="dimmed" className="font-english">
        -
      </Text>
    );
  }
  return (
    <Box ta="right">
      <Text fz="sm" fw={700} c={accent ? 'saal' : undefined} className="font-english tabular-nums" lh={1.3}>
        {adult}
        <Text component="span" fz={11} fw={400} c="dimmed" ml={2}>
          円
        </Text>
      </Text>
      <Text fz={11} c="dimmed" className="font-english tabular-nums" lh={1.3}>
        <Text component="span" fz={10} mr={2}>
          小
        </Text>
        {child}
        <Text component="span" fz={10} ml={2}>
          円
        </Text>
      </Text>
    </Box>
  );
};

export const FareTable: React.FC<FareTableProps> = ({ currentStation }) => {
  return (
    <Paper withBorder radius="lg" style={{ overflow: 'hidden' }}>
      {/* ヘッダー */}
      <Group
        gap="xs"
        wrap="nowrap"
        px={14}
        py={10}
        style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
      >
        <JisTicketVending size={16} />
        <Text fw={800} fz="xs" truncate>
          {currentStation.name}駅からの運賃
        </Text>
        <Text fz={10} c="dimmed" className="shrink-0">
          （2026年3月現行）
        </Text>
      </Group>

      {/* 運賃テーブル（Mantine Table） */}
      <Table verticalSpacing={6} horizontalSpacing="sm" withColumnBorders fz="xs">
        <Table.Thead bg="var(--mantine-color-default-hover)">
          <Table.Tr>
            <Table.Th w="34%">ご利用駅</Table.Th>
            <Table.Th w="33%" ta="right">
              きっぷ運賃
            </Table.Th>
            <Table.Th w="33%" ta="right" c="saal">
              ICカード運賃
            </Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {STATIONS.map((station) => {
            const isCurrent = station.id === currentStation.id;
            const fare = currentStation.fares[station.id];
            const isTerminal = station.id === 'sendai' || station.id === 'sendai-airport';

            return (
              <Table.Tr key={station.id} bg={isCurrent ? 'var(--mantine-color-saal-light)' : undefined}>
                <Table.Td>
                  <Text fz={isCurrent ? 'sm' : 'xs'} fw={isCurrent ? 900 : isTerminal ? 700 : 500}>
                    {station.name}
                  </Text>
                </Table.Td>
                <Table.Td ta="right">
                  {isCurrent ? (
                    <Text fz="xs" c="dimmed">-</Text>
                  ) : (
                    <FareCell adult={fare?.ticket} child={fare?.ticketChild} />
                  )}
                </Table.Td>
                <Table.Td ta="right">
                  {isCurrent ? (
                    <Text fz="xs" c="dimmed">-</Text>
                  ) : (
                    <FareCell adult={fare?.ic} child={fare?.icChild} accent />
                  )}
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </Paper>
  );
};
