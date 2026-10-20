import React from 'react';
import { Station } from '../types';

interface TransferGuideProps {
  station: Station;
}

export const TransferGuide: React.FC<TransferGuideProps> = ({ station }) => {
  const stationId = station.id;

  const hasSubway = stationId === 'sendai' || stationId === 'nagamachi';
  const hasSendaiBus = ['sendai', 'nagamachi', 'taishido', 'minami-sendai'].includes(stationId);
  const hasMiyakouBus = stationId === 'nagamachi' || stationId === 'minami-sendai';
  const hasNatoringo = ['minami-sendai', 'natori', 'morisekinoshita', 'sendai-airport'].includes(stationId);

  if (stationId === 'mitazono') {
    return (
      <div className="bg-white rounded-xl p-3 border border-slate-200 text-center text-slate-400 text-xs">
        美田園駅にはバス・他社線の乗り換えはありません
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden text-xs">
      <div className="bg-slate-800 text-white px-3 py-2 font-bold text-sm">
        乗り換えのご案内
      </div>

      <div className="p-3 space-y-3">
        {/* 地下鉄 */}
        {hasSubway && (
          <div>
            <div className="font-bold text-slate-800 mb-1 text-xs">
              仙台市地下鉄
            </div>
            <div className="bg-slate-50 p-2 rounded border border-slate-200 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-600">南北線（泉中央方面）</span>
                <span className="font-mono font-medium text-slate-800">15:41 / 15:49</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">南北線（富沢方面）</span>
                <span className="font-mono font-medium text-slate-800">15:43 / 15:51</span>
              </div>
              {stationId === 'sendai' && (
                <div className="flex justify-between border-t border-slate-200 pt-1 mt-1">
                  <span className="text-slate-600">東西線</span>
                  <span className="font-mono font-medium text-slate-800">15:42 / 15:50</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 仙台市営バス */}
        {hasSendaiBus && (
          <div>
            <div className="font-bold text-slate-800 mb-1 text-xs">
              仙台市営バス（直近発車）
            </div>
            <div className="bg-slate-50 p-2 rounded border border-slate-200 text-[11px] flex justify-between items-center">
              <div>
                <span className="font-medium text-slate-800">[60] 交通局東北大学病院前行</span>
                <span className="text-slate-400 ml-2">1番のりば</span>
              </div>
              <span className="font-mono font-medium text-slate-800">15:45</span>
            </div>
          </div>
        )}

        {/* 宮城交通バス */}
        {hasMiyakouBus && (
          <div>
            <div className="font-bold text-slate-800 mb-1 text-xs">
              宮城交通バス
            </div>
            <div className="bg-slate-50 p-2 rounded border border-slate-200 text-[11px] flex justify-between">
              <span className="text-slate-600">八木山動物公園駅・山田方面</span>
              <span className="font-mono font-medium text-slate-800">15:50 / 16:15</span>
            </div>
          </div>
        )}

        {/* なとりん号 */}
        {hasNatoringo && (
          <div>
            <div className="font-bold text-slate-800 mb-1 text-xs">
              コミュニティバス「なとりん号」
            </div>
            <div className="bg-slate-50 p-2 rounded border border-slate-200 text-[11px] space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-600">閖上線（閖上方面）</span>
                <span className="font-mono font-medium text-slate-800">15:40</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">愛島線（愛島台方面）</span>
                <span className="font-mono font-medium text-slate-800">16:10</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
