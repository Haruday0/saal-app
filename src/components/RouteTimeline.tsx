import React from 'react';

/**
 * 進行方向（下向き）のペンタゴン・ノーズアイコン（在線列車・バス現在地用）
 */
export interface PentagonIconProps {
  lineColor: string;
  size?: number;
  className?: string;
}

export const PentagonIcon: React.FC<PentagonIconProps> = ({
  lineColor,
  size = 14,
  className,
}) => {
  const w = size;
  const bodyH = Math.round(size * 0.6);
  const noseH = Math.round(size * 0.4);

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: w,
          height: bodyH,
          backgroundColor: lineColor,
          borderRadius: '2px 2px 0 0',
        }}
      />
      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: `${w / 2}px solid transparent`,
          borderRight: `${w / 2}px solid transparent`,
          borderTop: `${noseH}px solid ${lineColor}`,
        }}
      />
    </div>
  );
};

export interface RouteTimelineProps<T> {
  items: T[];
  lineColor: string;
  getItemKey: (item: T, index: number) => string;
  isPassed?: (item: T, index: number) => boolean;
  isCurrent?: (item: T, index: number) => boolean;
  isVehiclePosition?: (item: T, index: number) => boolean;
  showPing?: (item: T, index: number) => boolean;
  getDataAttributes?: (item: T, index: number) => Record<string, string | number>;
  getRowClassName?: (item: T, index: number) => string;
  getRowStyle?: (item: T, index: number) => React.CSSProperties | undefined;
  renderContent: (item: T, index: number) => React.ReactNode;
  renderAfterRow?: (item: T, index: number) => React.ReactNode;
  className?: string;
}

/**
 * 鉄道・地下鉄・バス共通の全停車駅・タイムラインコンポーネント
 * 始発から終着までを貫通する1本の長い直線の真上に、中白塗りの丸ノードを配置することで
 * 物理的に途切れない安定したタイムラインを描画する。
 */
export function RouteTimeline<T>({
  items,
  lineColor,
  getItemKey,
  isPassed,
  isCurrent,
  isVehiclePosition,
  showPing,
  getDataAttributes,
  getRowClassName,
  getRowStyle,
  renderContent,
  renderAfterRow,
  className = '',
}: RouteTimelineProps<T>) {
  if (!items || items.length === 0) return null;

  return (
    <div className={`relative ${className}`}>
      {/* 始発ノード中心（top-[18px]）から終着ノード中心（bottom-[18px]）まで貫通する1本の連続直線 */}
      {items.length > 1 && (
        <div
          className="absolute left-[18px] top-[18px] bottom-[18px] w-[2.5px] -translate-x-1/2 rounded-full pointer-events-none z-0"
          style={{ backgroundColor: lineColor }}
        />
      )}

      <div className="flex flex-col">
        {items.map((item, index) => {
          const key = getItemKey(item, index);
          const passed = isPassed ? isPassed(item, index) : false;
          const isHighlight = isCurrent ? isCurrent(item, index) : false;
          const isVehicle = isVehiclePosition ? isVehiclePosition(item, index) : false;
          const ping = showPing ? showPing(item, index) : isVehicle;

          const dataAttrs = getDataAttributes ? getDataAttributes(item, index) : {};
          const rowClass = getRowClassName ? getRowClassName(item, index) : '';
          const rowStyle = getRowStyle ? getRowStyle(item, index) : undefined;

          return (
            <React.Fragment key={key}>
              <div
                {...dataAttrs}
                className={`relative flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-colors z-10 ${
                  isHighlight ? 'bg-surface-secondary' : ''
                } ${rowClass}`}
                style={rowStyle}
              >
                {/* 左側: タイムライン軸ノード（幅20pxの中央揃え、親の left-[18px] と中心が完全一致: px-2(8px) + 10px = 18px） */}
                <div className="relative shrink-0 w-5 flex items-center justify-center">
                  {isVehicle ? (
                    <div className="relative flex items-center justify-center">
                      {ping && (
                        <span
                          className="absolute w-5 h-5 rounded-full animate-ping opacity-60 pointer-events-none"
                          style={{ backgroundColor: lineColor }}
                        />
                      )}
                      <PentagonIcon lineColor={lineColor} size={15} />
                    </div>
                  ) : isHighlight ? (
                    <div
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: lineColor,
                        boxShadow: `0 0 0 2px var(--surface, #ffffff), 0 0 0 3.5px ${lineColor}`,
                      }}
                    />
                  ) : (
                    <div
                      className={`w-3 h-3 rounded-full shrink-0 border-[2.5px] bg-white dark:bg-surface ${
                        passed ? 'border-border' : ''
                      }`}
                      style={!passed ? { borderColor: lineColor } : undefined}
                    />
                  )}
                </div>

                {/* 右側: 各行のコンテンツ */}
                <div className="flex-1 min-w-0">
                  {renderContent(item, index)}
                </div>
              </div>

              {/* 行下の挿入要素（駅間走行中表示など） */}
              {renderAfterRow && renderAfterRow(item, index)}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

export default RouteTimeline;
