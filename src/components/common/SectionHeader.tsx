import React from 'react';

export interface SectionHeaderProps {
  title: string;
  indicatorColor?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * シート・パネル共通のセクション見出しコンポーネント
 * 路線カラー等のインジケーターバー、タイトル、右側のアクション（チップ・ボタン等）を統一配置します。
 */
export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  indicatorColor,
  action,
  className = '',
}) => {
  return (
    <div className={`flex items-center justify-between mb-2 px-1 ${className}`}>
      <div className="flex items-center gap-1.5 min-w-0">
        {indicatorColor && (
          <span
            className="w-1 h-3.5 rounded-full shrink-0"
            style={{ backgroundColor: indicatorColor }}
          />
        )}
        <h3 className="text-xs font-extrabold text-foreground truncate">
          {title}
        </h3>
      </div>
      {action && <div className="shrink-0 ml-2">{action}</div>}
    </div>
  );
};
