import React from 'react';
import { Button, Link } from '@heroui/react';
import { Icon } from './Icon';
import { LINE_COLORS } from '../config/trainLineRules';
import { useDebug } from '../context/DebugContext';
import { useTheme } from '../context/ThemeContext';

export const Header: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  const { isDebugMode, isHeaderPanelOpen, setIsHeaderPanelOpen, isTimeOverridden } = useDebug();

  return (
    <header className="shrink-0 sticky top-0 z-30 bg-surface border-b border-border transition-colors">
      <div className="flex items-center justify-between h-12 px-3.5 max-w-[448px] mx-auto">
        {/* ロゴ・路線名 */}
        <div className="flex items-center gap-2">
          <div
            className="w-1.5 h-6 rounded-full shrink-0"
            style={{ backgroundColor: LINE_COLORS.saal }}
          />
          <div>
            <h1 className="text-sm font-black leading-none text-foreground">
              仙台空港アクセス線
            </h1>
            <p className="text-[9px] text-muted uppercase mt-0.5 font-english tracking-wider leading-none">
              Sendai Airport Access Line
            </p>
          </div>
        </div>

        {/* 右側アクションエリア */}
        <div className="flex items-center gap-1.5">
          {/* デバッグモード（?debug=1）時のみ表示されるDEBUGトグルボタン */}
          {isDebugMode && (
            <Button
              size="sm"
              variant={isHeaderPanelOpen ? 'primary' : 'secondary'}
              className={`h-7 px-2 text-[10.5px] font-extrabold rounded-full ${
                isTimeOverridden ? 'bg-amber-500 text-white' : ''
              }`}
              onPress={() => setIsHeaderPanelOpen((prev) => !prev)}
            >
              DEBUG
            </Button>
          )}

          {/* ライト / ダーク テーマ切り替え */}
          <Button
            isIconOnly
            variant="tertiary"
            size="sm"
            className="rounded-full w-8 h-8 min-w-8 p-0 text-foreground"
            onPress={toggleTheme}
            aria-label="テーマ切り替え"
          >
            <Icon name={isDark ? 'light_mode' : 'dark_mode'} size={16} />
          </Button>

          {/* JR東日本「どこトレ」スマートフォン版 外部リンク（HeroUI Link） */}
          <Link
            href="https://doko-train.jp/sp/index.html?area=sen"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[11px] font-bold border border-border bg-surface-secondary hover:bg-surface-tertiary text-foreground hover:no-underline transition-colors no-underline"
          >
            <span>どこトレ</span>
            <Icon name="open_in_new" size={14} />
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
