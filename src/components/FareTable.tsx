import React from 'react';
import { Station } from '../types';
import { STATIONS } from '../data/mockData';
import { JisTicketVending } from './icons';

interface FareTableProps {
  currentStation: Station;
}

export const FareTable: React.FC<FareTableProps> = ({ currentStation }) => {
  const otherStations = STATIONS.filter((s) => s.id !== currentStation.id);

  return (
    <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden text-xs">
      <div className="bg-slate-800 text-white px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-bold text-sm">
          <JisTicketVending size={16} color="#38bdf8" />
          <span>{currentStation.name}駅からの運賃（2026年3月改定）</span>
        </div>
        <span className="text-[11px] text-slate-400">税込</span>
      </div>

      <div className="p-3">
        <div className="border border-slate-200 rounded overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-1.5 px-3">着駅</th>
                <th className="py-1.5 px-3 text-right">きっぷ</th>
                <th className="py-1.5 px-3 text-right">IC運賃</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {otherStations.map((station) => {
                const fare = currentStation.fares[station.id];
                const isSpecial =
                  station.id === 'sendai-airport' || station.id === 'sendai';

                return (
                  <tr
                    key={station.id}
                    className={isSpecial ? 'bg-sky-50/60 font-medium' : ''}
                  >
                    <td className="py-1.5 px-3 text-slate-800">
                      {station.name}
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono text-slate-600">
                      {fare ? `${fare.ticket}円` : '-'}
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono font-medium text-slate-900">
                      {fare ? `${fare.ic}円` : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* フリーパス注意事項 */}
        <div className="mt-3 bg-slate-50 p-2.5 rounded border border-slate-200 text-[11px] text-slate-600 space-y-1">
          <div>
            ・<strong className="text-slate-800">仙台まるごとパス</strong>：全線（仙台〜仙台空港）乗り降り自由です。
          </div>
          <div>
            ・<strong className="text-slate-800">青春18きっぷ / 小さな旅ホリデー・パス</strong>：名取〜仙台空港間は別途運賃420円（IC 418円）が必要です。
          </div>
        </div>
      </div>
    </div>
  );
};
