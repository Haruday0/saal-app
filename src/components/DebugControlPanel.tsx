import React from 'react';
import {
  Card,
  Chip,
  Button,
  Slider,
  Separator,
  Input,
  Disclosure,
} from '@heroui/react';
import { useDebug } from '../context/DebugContext';

interface DebugControlPanelProps {
  /** 電光掲示板の直上に埋め込むモードか、ヘッダー直下のバーモードか */
  variant?: 'sheet' | 'header';
  /** 仙台駅（3段表示）かどうか */
  isSendai?: boolean;
}

export const DebugControlPanel: React.FC<DebugControlPanelProps> = ({
  variant = 'sheet',
  isSendai = false,
}) => {
  const {
    isDebugMode,
    isHeaderPanelOpen,
    setIsHeaderPanelOpen,
    isSheetPanelOpen,
    setIsSheetPanelOpen,
    now,
    isTimeOverridden,
    setOverrideMinutes,
    setOverrideTimeString,
    setOverrideDateString,
    resetAll,
    rowOverrides,
    setRowOverride,
    applyDigitPreset,
    clearRowOverrides,
    hasRowOverrides,
  } = useDebug();

  if (!isDebugMode) return null;

  const isOpen = variant === 'header' ? isHeaderPanelOpen : isSheetPanelOpen;
  const toggleOpen = () => {
    if (variant === 'header') {
      setIsHeaderPanelOpen((prev) => !prev);
    } else {
      setIsSheetPanelOpen((prev) => !prev);
    }
  };

  const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}`;
  const currentYMD = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
  const dayOfWeekStr = ['日', '月', '火', '水', '木', '金', '土'][now.getDay()];

  // スライダーは 05:00 (300分) 〜 02:00 (1560分) の範囲
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const railwayMinutes = (currentHours < 5 ? currentHours + 24 : currentHours) * 60 + currentMinutes;
  const sliderValue = Math.min(1560, Math.max(300, railwayMinutes));
  const rowIndices: (0 | 1 | 2)[] = isSendai ? [0, 1, 2] : [0, 1];

  return (
    <Card
      data-scrollable="true"
      className={`gap-0 p-2 transition-colors ${
        variant === 'sheet'
          ? 'rounded-xl mb-2 border shadow-none bg-surface'
          : 'rounded-none border-b shrink-0 z-20 shadow-sm bg-surface'
      } ${
        isTimeOverridden || hasRowOverrides
          ? 'border-amber-500'
          : 'border-border'
      }`}
    >
      <div className={variant === 'header' ? 'max-w-md mx-auto w-full' : 'w-full'}>
        {/* パネルヘッダー（折りたたみトグルバー） */}
        <Disclosure isExpanded={isOpen} onExpandedChange={toggleOpen}>
          <Disclosure.Heading>
            <Disclosure.Trigger className="w-full flex items-center justify-between gap-1.5 py-1 text-left cursor-pointer transition-opacity hover:opacity-80">
              <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                <Chip size="sm" color="warning" variant="primary" className="text-[10px] font-bold px-1.5 h-5 leading-none">
                  DEBUG
                </Chip>
                <span className="text-[11.5px] font-extrabold text-foreground">
                  {variant === 'header' ? 'シミュレーション設定' : 'デバッグ設定'}
                </span>
                <Chip
                  size="sm"
                  color={isTimeOverridden ? 'warning' : 'default'}
                  variant="soft"
                  className="font-english tabular-nums text-[10px] px-1.5 h-5 leading-none"
                >
                  {currentYMD}({dayOfWeekStr}) {currentHHMM} {isTimeOverridden ? '(仮想)' : '(実日時)'}
                </Chip>
                {hasRowOverrides && (
                  <Chip size="sm" color="warning" variant="soft" className="text-[10px] px-1.5 h-5 leading-none">
                    LED入力中
                  </Chip>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0 text-muted">
                <span className="text-[10.5px] font-semibold">
                  {isOpen ? '閉じる' : '開く'}
                </span>
                <Disclosure.Indicator className="text-muted transition-transform duration-200" />
              </div>
            </Disclosure.Trigger>
          </Disclosure.Heading>

          <Disclosure.Content>
            <Disclosure.Body className="space-y-2.5 pt-2 pb-1.5">
              {/* 日付・時刻の設定行 */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-muted">
                    日付
                  </span>
                  <input
                    type="date"
                    value={currentYMD}
                    onChange={(e) => setOverrideDateString(e.target.value)}
                    aria-label="シミュレーション日付入力"
                    className="text-[11.5px] font-bold font-english tabular-nums px-2 py-0.5 rounded border border-border bg-transparent text-foreground cursor-pointer"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-muted">
                    時刻
                  </span>
                  <input
                    type="time"
                    value={currentHHMM}
                    onChange={(e) => setOverrideTimeString(e.target.value)}
                    aria-label="シミュレーション時刻入力"
                    className="text-[11.5px] font-bold font-english tabular-nums px-2 py-0.5 rounded border border-border bg-transparent text-foreground cursor-pointer"
                  />
                </div>

                <Button
                  size="sm"
                  variant={isTimeOverridden ? 'primary' : 'tertiary'}
                  onPress={resetAll}
                  isDisabled={!isTimeOverridden}
                  className="text-[10.5px] h-7 px-2.5"
                >
                  実日時に戻す
                </Button>
              </div>

              {/* 時刻スライダー (05:00〜02:00) */}
              <div className="px-2 pt-1 pb-3">
                <Slider
                  value={sliderValue}
                  minValue={300}
                  maxValue={1560}
                  step={1}
                  onChange={(val) => {
                    const num = typeof val === 'number' ? val : val[0];
                    setOverrideMinutes(num % 1440);
                  }}
                  aria-label="シミュレーション時刻"
                  className="w-full"
                >
                  <Slider.Track className="h-1.5 bg-surface-secondary rounded-full">
                    <Slider.Fill className="bg-amber-500 rounded-full" />
                    <Slider.Thumb className="size-4 bg-surface border-2 border-amber-500 rounded-full shadow cursor-grab active:cursor-grabbing focus-visible:outline-none" />
                  </Slider.Track>
                  <Slider.Marks className="mt-1 text-[9.5px] text-muted">
                    <Slider.Mark value={300}>5:00</Slider.Mark>
                    <Slider.Mark value={540}>9:00</Slider.Mark>
                    <Slider.Mark value={720}>12:00</Slider.Mark>
                    <Slider.Mark value={900}>15:00</Slider.Mark>
                    <Slider.Mark value={1080}>18:00</Slider.Mark>
                    <Slider.Mark value={1260}>21:00</Slider.Mark>
                    <Slider.Mark value={1440}>0:00</Slider.Mark>
                    <Slider.Mark value={1560}>2:00</Slider.Mark>
                  </Slider.Marks>
                </Slider>
              </div>

              {/* 駅詳細シート内のみ: 電光掲示板LEDの直接書き換え */}
              {variant === 'sheet' && (
                <>
                  <Separator className="my-2 border-border" />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-muted">
                        LED表示テスト
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="tertiary"
                          className="text-[10px] h-6 px-1.5"
                          onPress={() => applyDigitPreset(1)}
                        >
                          0-9テストA
                        </Button>
                        <Button
                          size="sm"
                          variant="tertiary"
                          className="text-[10px] h-6 px-1.5"
                          onPress={() => applyDigitPreset(2)}
                        >
                          0-9テストB
                        </Button>
                        <Button
                          size="sm"
                          variant="tertiary"
                          className="text-[10px] h-6 px-1.5"
                          isDisabled={!hasRowOverrides}
                          onPress={clearRowOverrides}
                        >
                          クリア
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      {rowIndices.map((idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <span className="text-[10.5px] font-bold text-muted w-8 shrink-0">
                            {idx + 1}段目
                          </span>
                          <Input
                            placeholder="時刻 (例 12:34)"
                            value={rowOverrides[idx].departureTime}
                            onChange={(e) =>
                              setRowOverride(idx, { departureTime: e.target.value })
                            }
                            className="flex-[1.2] h-6 min-h-6 text-[11px] px-1.5 font-mono border rounded border-border bg-transparent text-foreground"
                          />
                          <Input
                            placeholder="行先 (任意)"
                            value={rowOverrides[idx].destination}
                            onChange={(e) =>
                              setRowOverride(idx, { destination: e.target.value })
                            }
                            className="flex-1 h-6 min-h-6 text-[11px] px-1.5 border rounded border-border bg-transparent text-foreground"
                          />
                          <Input
                            placeholder="両"
                            value={rowOverrides[idx].cars}
                            onChange={(e) => setRowOverride(idx, { cars: e.target.value })}
                            className="w-10 h-6 min-h-6 text-[11px] px-1 text-center border rounded border-border bg-transparent text-foreground"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </Disclosure.Body>
          </Disclosure.Content>
        </Disclosure>
      </div>
    </Card>
  );
};
