import { LineType, DirectionType } from '../types';

export type LedColor = 'amber' | 'green' | 'red' | 'white';

/**
 * 行先から路線（アクセス線 / 東北本線 / 常磐線）を判定するマッピング
 * 後から自由に行先を追加・変更できます
 */
export const DESTINATION_TO_LINE: Record<string, LineType> = {
  // 仙台空港アクセス線
  '仙台空港': 'saal',

  // 東北本線（下り・上り）
  '白石': 'tohoku',
  '福島': 'tohoku',
  '岩沼': 'tohoku',
  '小牛田': 'tohoku',
  '利府': 'tohoku',
  '一ノ関': 'tohoku',

  // 常磐線
  '原ノ町': 'joban',
  '山下': 'joban',
  '新地': 'joban',
  'いわき': 'joban',

  // 仙台（終着・主要行先）
  // 仙台行きは列車の元々の line に応じて判定（デフォルトは saal / tohoku）
  '仙台': 'tohoku',
  '当駅止り': 'saal',
};

/**
 * 駅別 × 方向別 × 路線別の「行先LED表示色」設定ルール
 * ※行先文字の色のみに適用され、種別・時刻・両数の色は駅の盤面基本色で固定されます。
 */
export type StationColorRule = {
  up: Record<LineType, LedColor>;
  down: Record<LineType, LedColor>;
};

export const STATION_LED_COLOR_RULES: Record<string, StationColorRule> = {
  // 1. 仙台駅: 行先はすべてオレンジ
  sendai: {
    up: { saal: 'amber', tohoku: 'amber', joban: 'amber' },
    down: { saal: 'amber', tohoku: 'amber', joban: 'amber' },
  },

  // 2. 長町駅: 上り=オレンジ、下り=緑
  nagamachi: {
    up: { saal: 'amber', tohoku: 'amber', joban: 'amber' }, // 白石・空港方面
    down: { saal: 'green', tohoku: 'green', joban: 'green' }, // 仙台方面
  },

  // 3. 太子堂駅:
  // 上り: アクセス線=オレンジ, 常磐線=赤, 東北本線=緑
  // 下り: すべて緑
  taishido: {
    up: { saal: 'amber', joban: 'red', tohoku: 'green' },
    down: { saal: 'green', joban: 'green', tohoku: 'green' },
  },

  // 4. 南仙台駅: 上り下り共通（東北本線=緑, 常磐線=オレンジ, アクセス線=赤）
  'minami-sendai': {
    up: { saal: 'red', joban: 'amber', tohoku: 'green' },
    down: { saal: 'red', joban: 'amber', tohoku: 'green' },
  },

  // 5. 名取駅:
  // 上り（東京方面・白石/原ノ町/仙台空港）: 東北本線=オレンジ, 常磐線=赤, アクセス線=緑
  // 下り（仙台方面）: すべてオレンジ
  natori: {
    up: { tohoku: 'amber', joban: 'red', saal: 'green' },
    down: { tohoku: 'amber', joban: 'amber', saal: 'amber' },
  },

  // 6. 仙台空港鉄道 SAT 3駅（杜せきのした・美田園・仙台空港）: すべて白色LED
  morisekinoshita: {
    up: { saal: 'white', tohoku: 'white', joban: 'white' },
    down: { saal: 'white', tohoku: 'white', joban: 'white' },
  },
  mitazono: {
    up: { saal: 'white', tohoku: 'white', joban: 'white' },
    down: { saal: 'white', tohoku: 'white', joban: 'white' },
  },
  'sendai-airport': {
    up: { saal: 'white', tohoku: 'white', joban: 'white' },
    down: { saal: 'white', tohoku: 'white', joban: 'white' },
  },
};

/**
 * 駅別 × 方向別の「種別・両数（普通何両）」表示色設定
 * 名取駅: ユーザー指示実車仕様（上り=緑, 下り=オレンジ）
 */
export interface StationBoardThemeColors {
  typeColor: LedColor;
  carsColor: LedColor;
  timeColor: LedColor;
  trackColor?: LedColor;
}

export const STATION_DIRECTION_THEMES: Record<
  string,
  {
    up: StationBoardThemeColors;
    down: StationBoardThemeColors;
  }
> = {
  natori: {
    // 上り（東京方面・白石/原ノ町/空港方面）: 緑
    up: {
      typeColor: 'green',
      carsColor: 'green',
      timeColor: 'green',
    },
    // 下り（仙台方面）: オレンジ
    down: {
      typeColor: 'amber',
      carsColor: 'amber',
      timeColor: 'green',
    },
  },
};

export function getStationThemeColors(
  stationId: string,
  direction: DirectionType,
  fallbackTheme: StationBoardThemeColors
): StationBoardThemeColors {
  const stationRule = STATION_DIRECTION_THEMES[stationId];
  if (stationRule && stationRule[direction]) {
    return {
      ...fallbackTheme,
      ...stationRule[direction],
    };
  }
  return fallbackTheme;
}

/**
 * 列車情報から行先文字のLEDカラーを解決する関数（ハードコードなし）
 */
export function getDestinationLedColor(
  stationId: string,
  direction: DirectionType,
  line: LineType,
  destination: string
): LedColor {
  // 1. 仙台空港鉄道 SAT 3駅は無条件で白
  if (['morisekinoshita', 'mitazono', 'sendai-airport'].includes(stationId)) {
    return 'white';
  }

  // 2. 仙台駅は行先すべてオレンジ
  if (stationId === 'sendai') {
    return 'amber';
  }

  // 3. 行先から路線を自動補正（列車データの line または 行先マッピング）
  const resolvedLine = DESTINATION_TO_LINE[destination] || line;

  // 4. 駅 × 方向 × 路線 の設定ルールを取得
  const stationRule = STATION_LED_COLOR_RULES[stationId];
  if (stationRule) {
    const dirRule = stationRule[direction];
    if (dirRule && dirRule[resolvedLine]) {
      return dirRule[resolvedLine];
    }
  }

  // デフォルトフォールバック
  return 'amber';
}
