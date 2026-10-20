import React from 'react';
import { Icon } from './Icon';

export const Header: React.FC = () => {
  return (
    <header className="shrink-0 sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
      <div className="max-w-md mx-auto px-3.5 h-12 flex items-center justify-between">
        {/* ロゴ・路線名 */}
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-6 bg-[#0085ca] rounded-full shadow-xs" />
          <div>
            <h1 className="text-[14px] font-black text-slate-900 leading-none tracking-tight">
              仙台空港アクセス線
            </h1>
            <p className="text-[9px] text-slate-400 font-mono tracking-wider uppercase mt-0.5">
              Sendai Airport Access Line
            </p>
          </div>
        </div>

        {/* JRどこトレ運行情報 外部リンク */}
        <a
          href="https://doko-train.jp/pc/index.html?area=sen"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100/80 hover:bg-slate-200 active:bg-slate-300 rounded-full border border-slate-200/60 transition-colors"
        >
          <span className="text-[11px]">JR運行情報</span>
          <Icon name="open_in_new" size={14} className="text-slate-400" />
        </a>
      </div>
    </header>
  );
};
