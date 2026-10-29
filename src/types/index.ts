// 路線定義
export type LineType = 'saal' | 'tohoku' | 'joban';

export type DirectionType = 'up' | 'down'; // up: 仙台方面, down: 仙台空港・福島/原ノ町方面
export type DayType = 'weekday' | 'holiday';

// 設備タイプ
export type FacilityType = 'stairs' | 'escalator' | 'elevator' | 'gate' | 'restroom';

export interface StationFacility {
  id: string;
  type: FacilityType;
  name: string;
  carNumber: number; // 1号車, 2号車, etc.
  doorNumber: 1 | 2 | 3; // 3ドアのうちの何番目か (1: 前, 2: 中, 3: 後)
  description?: string;
  direction?: 'up' | 'down' | 'both'; // エスカレーターの向きなど
}

export interface GatePlate {
  id: string;
  name: string; // 例: "西改札"
  nameEn: string; // 例: "West Gates"
  type?: 'gate' | 'transfer'; // gate: 黄色地, transfer: 白地枠
  carPosition: number; // 号車位置 (例: 1.5, 3.5)
}

export interface TransferBadge {
  id: string;
  type: 'subway_n' | 'subway_t' | 'shinkansen' | 'jr' | 'bus' | 'plane';
  symbol?: string; // "N", "T"
  name: string; // "南北線"
  nameEn: string; // "Namboku Line"
}

export interface PlatformInfo {
  trackNumber: string;
  directionName: string; // "仙台方面" や "名取・仙台空港・白石方面"
  facilities: StationFacility[];
  gates?: GatePlate[];
  transfers?: TransferBadge[];
  notes?: string;
}

export interface FareDetail {
  ticket: number | null;
  ticketChild: number | null;
  ic: number | null;
  icChild: number | null;
}

export interface Station {
  id: string;
  name: string;
  nameKana: string;
  nameEn: string;
  stationNumber: string; // "01" ~ "08"
  hasTohokuJoban: boolean; // 東北本線・常磐線との並走区間
  transferLines: string[];
  transfers?: TransferBadge[];
  platforms: {
    up: PlatformInfo;
    down: PlatformInfo;
  };
  fares: {
    [stationId: string]: FareDetail;
  };
}

export interface DepartureTrain {
  id: string;
  trainNumber: string;
  line: LineType;
  lineName: string;
  direction: DirectionType;
  trainType: '普通' | '快速' | '特急'; // 2026年3月ダイヤ改正でアクセス線は普通のみ
  departureTime: string; // "14:23"
  destination: string; // "仙台空港", "仙台", "白石", "原ノ町", "利府" など
  track: string; // 番線
  cars: 2 | 4 | 6 | 10; // 両数
  status: 'normal' | 'delay';
  delayMinutes?: number;
  remarks?: string;
  calendar?: 'all' | 'weekday' | 'holiday';
  originStation?: string;
  originDepartureTime?: string;
}

export interface MovingTrain {
  id: string;
  trainNumber: string;
  line: LineType;
  direction: DirectionType;
  trainType?: '普通' | '快速' | '特急' | string;
  currentStationId: string; // 現在最寄りの駅
  nextStationId?: string; // 次の駅
  progress: number; // 0.0 (currentStation) ~ 1.0 (nextStation)
  destination: string;
  cars: 2 | 4 | 6 | 10;
  isAtStation: boolean;
  isCompact?: boolean;
  originStation?: string;
  originDepartureTime?: string;
}
