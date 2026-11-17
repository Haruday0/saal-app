import React from 'react';
import { Card, Table } from '@heroui/react';
import { Station } from '../types';
import { STATIONS } from '../data/mockData';
import { JisTicketVending } from './icons';

interface FareTableProps {
  currentStation: Station;
}

const FareCell: React.FC<{ adult?: number | null; child?: number | null; accent?: boolean }> = ({
  adult,
  child,
  accent,
}) => {
  if (adult == null) {
    return (
      <span className="text-xs text-muted font-english">
        -
      </span>
    );
  }
  return (
    <div className="text-right">
      <div className={`text-sm font-bold font-english tabular-nums leading-tight ${accent ? 'text-accent' : 'text-foreground'}`}>
        {adult}
        <span className="text-[11px] font-normal text-muted ml-0.5">
          円
        </span>
      </div>
      <div className="text-[11px] text-muted font-english tabular-nums leading-tight">
        <span className="text-[10px] mr-0.5">
          小
        </span>
        {child}
        <span className="text-[10px] ml-0.5">
          円
        </span>
      </div>
    </div>
  );
};

export const FareTable: React.FC<FareTableProps> = ({ currentStation }) => {
  return (
    <Card className="gap-0 p-0 overflow-hidden border border-border rounded-2xl shadow-xs bg-surface text-foreground">
      {/* ヘッダーバー */}
      <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-border bg-surface">
        <JisTicketVending size={16} />
        <span className="font-extrabold text-xs truncate text-foreground">
          {currentStation.name}駅からの運賃
        </span>
        <span className="text-[10px] text-muted shrink-0">
          （2026年3月現行）
        </span>
      </div>

      {/* 運賃テーブル（HeroUI Table） */}
      <Table variant="secondary" aria-label="運賃表" className="w-full !rounded-none">
        <Table.ScrollContainer className="!rounded-none">
          <Table.Content aria-label="運賃一覧" className="w-full !rounded-none">
            <Table.Header>
              <Table.Column
                isRowHeader
                className="w-[34%] px-3 py-2 text-xs font-bold bg-surface-secondary border-b border-r border-border text-foreground !rounded-none after:!hidden"
              >
                ご利用駅
              </Table.Column>
              <Table.Column
                className="w-[33%] px-3 py-2 text-xs font-bold bg-surface-secondary border-b border-r border-border !text-right text-foreground !rounded-none after:!hidden"
              >
                きっぷ運賃
              </Table.Column>
              <Table.Column
                className="w-[33%] px-3 py-2 text-xs font-bold bg-surface-secondary border-b border-border !text-right text-accent !rounded-none after:!hidden"
              >
                ICカード運賃
              </Table.Column>
            </Table.Header>
            <Table.Body>
              {STATIONS.map((station, idx) => {
                const isCurrent = station.id === currentStation.id;
                const fare = currentStation.fares[station.id];
                const isTerminal = station.id === 'sendai' || station.id === 'sendai-airport';
                const isLastRow = idx === STATIONS.length - 1;

                const rowBg = isCurrent
                  ? 'bg-accent/15 dark:bg-accent/20'
                  : 'bg-transparent';
                const borderBottom = isLastRow ? 'border-b-0' : 'border-b border-border/60';

                return (
                  <Table.Row
                    key={station.id}
                    id={station.id}
                    className={isCurrent ? 'font-bold' : undefined}
                  >
                    {/* ご利用駅セル */}
                    <Table.Cell
                      className={`px-3 py-1.5 border-r border-border/60 ${borderBottom} ${rowBg}`}
                    >
                      <span
                        className={
                          isCurrent
                            ? 'text-sm font-black text-accent'
                            : isTerminal
                            ? 'text-xs font-bold text-foreground'
                            : 'text-xs font-medium text-foreground'
                        }
                      >
                        {station.name}
                      </span>
                    </Table.Cell>

                    {/* きっぷ運賃セル */}
                    <Table.Cell
                      className={`px-3 py-1.5 border-r border-border/60 ${borderBottom} ${rowBg} text-right`}
                    >
                      {isCurrent ? (
                        <div className="text-right">
                          <span className="text-xs text-muted font-english inline-block pr-2">-</span>
                        </div>
                      ) : (
                        <FareCell adult={fare?.ticket} child={fare?.ticketChild} />
                      )}
                    </Table.Cell>

                    {/* ICカード運賃セル */}
                    <Table.Cell
                      className={`px-3 py-1.5 ${borderBottom} ${rowBg} text-right`}
                    >
                      {isCurrent ? (
                        <div className="text-right">
                          <span className="text-xs text-muted font-english inline-block pr-2">-</span>
                        </div>
                      ) : (
                        <FareCell adult={fare?.ic} child={fare?.icChild} accent />
                      )}
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
    </Card>
  );
};

export default FareTable;
