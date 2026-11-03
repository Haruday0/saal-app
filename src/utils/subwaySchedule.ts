import subwayScheduleData from '../data/subwaySchedule.json';
import { isWeekendHolidayOrYearEnd } from './calendar';
import { getCurrentRailwaySeconds } from './trainPosition';

export type SubwayLineId = 'namboku' | 'tozai';
export type SubwayDirectionId = 'north' | 'south' | 'east' | 'west';
export type SubwayDirectionKey =
  | 'namboku-north'
  | 'namboku-south'
  | 'tozai-east'
  | 'tozai-west';
export type SubwayDayType = 'weekday' | 'holiday';

export interface SubwayTrain {
  id: string;
  origin: string;
  destination: string;
  track: string;
  times: string[];
}

export interface SubwayDirectionSchedule {
  id: SubwayDirectionId;
  label: string;
  track: string;
  origin: string;
  destination: string;
  stations: string[];
  stationCodes: string[];
  weekday: SubwayTrain[];
  holiday: SubwayTrain[];
}

export interface SubwayLineSchedule {
  id: SubwayLineId;
  code: 'N' | 'T';
  name: string;
  color: string;
  mantineColor: string;
  stations: string[];
  stationCodes: Record<string, string>;
  directions: Record<string, SubwayDirectionSchedule>;
}

export interface SubwayScheduleRoot {
  revisionDate: string;
  lines: {
    namboku: SubwayLineSchedule;
    tozai: SubwayLineSchedule;
  };
}

export const SUBWAY_SCHEDULE = subwayScheduleData as unknown as SubwayScheduleRoot;

export interface SubwayDirectionMeta {
  key: SubwayDirectionKey;
  lineId: SubwayLineId;
  lineCode: 'N' | 'T';
  lineName: string;
  directionId: SubwayDirectionId;
  directionLabel: string;
  shortLabel: string;
  track: string;
  color: string;
  mantineColor: 'teal' | 'cyan';
  origin: string;
  originCode: string;
  destination: string;
  destinationCode: string;
  stations: string[];
  stationCodes: string[];
}

export const SUBWAY_DIRECTIONS: Record<SubwayDirectionKey, SubwayDirectionMeta> = {
  'namboku-north': {
    key: 'namboku-north',
    lineId: 'namboku',
    lineCode: 'N',
    lineName: '南北線',
    directionId: 'north',
    directionLabel: '泉中央方面',
    shortLabel: '1番線（泉中央方面）',
    track: '1',
    color: '#3b7d23',
    mantineColor: 'teal',
    origin: '富沢',
    originCode: 'N17',
    destination: '泉中央',
    destinationCode: 'N01',
    stations: SUBWAY_SCHEDULE.lines.namboku.directions.north.stations,
    stationCodes: SUBWAY_SCHEDULE.lines.namboku.directions.north.stationCodes,
  },
  'namboku-south': {
    key: 'namboku-south',
    lineId: 'namboku',
    lineCode: 'N',
    lineName: '南北線',
    directionId: 'south',
    directionLabel: '富沢方面',
    shortLabel: '2番線（富沢方面）',
    track: '2',
    color: '#3b7d23',
    mantineColor: 'teal',
    origin: '泉中央',
    originCode: 'N01',
    destination: '富沢',
    destinationCode: 'N17',
    stations: SUBWAY_SCHEDULE.lines.namboku.directions.south.stations,
    stationCodes: SUBWAY_SCHEDULE.lines.namboku.directions.south.stationCodes,
  },
  'tozai-east': {
    key: 'tozai-east',
    lineId: 'tozai',
    lineCode: 'T',
    lineName: '東西線',
    directionId: 'east',
    directionLabel: '荒井方面',
    shortLabel: '3番線（荒井方面）',
    track: '3',
    color: '#00b0f0',
    mantineColor: 'cyan',
    origin: '八木山動物公園',
    originCode: 'T01',
    destination: '荒井',
    destinationCode: 'T13',
    stations: SUBWAY_SCHEDULE.lines.tozai.directions.east.stations,
    stationCodes: SUBWAY_SCHEDULE.lines.tozai.directions.east.stationCodes,
  },
  'tozai-west': {
    key: 'tozai-west',
    lineId: 'tozai',
    lineCode: 'T',
    lineName: '東西線',
    directionId: 'west',
    directionLabel: '八木山動物公園方面',
    shortLabel: '4番線（八木山動物公園方面）',
    track: '4',
    color: '#00b0f0',
    mantineColor: 'cyan',
    origin: '荒井',
    originCode: 'T13',
    destination: '八木山動物公園',
    destinationCode: 'T01',
    stations: SUBWAY_SCHEDULE.lines.tozai.directions.west.stations,
    stationCodes: SUBWAY_SCHEDULE.lines.tozai.directions.west.stationCodes,
  },
};

/** 路線IDと駅名から駅ナンバリング（例: N10, T07）を取得 */
export function getSubwayStationCode(lineId: SubwayLineId, stationName: string): string {
  return SUBWAY_SCHEDULE.lines[lineId]?.stationCodes?.[stationName] || '';
}

/** 4:00基準の鉄道分（0:00〜3:59は24:00〜27:59として計算） */
export function toSubwayRailwayMinutes(timeStr: string): number {
  const parts = timeStr.trim().split(':');
  let h = parseInt(parts[0] || '0', 10);
  const m = parseInt(parts[1] || '0', 10);
  if (h < 4) h += 24;
  return h * 60 + m;
}

/** 表示用時刻フォーマット（24時以降は 0:xx 表記） */
export function formatSubwayTime(timeStr: string): string {
  const parts = timeStr.trim().split(':');
  if (parts.length !== 2) return timeStr;
  let h = parseInt(parts[0] || '0', 10);
  const m = parts[1];
  if (h >= 24) h = h % 24;
  return `${h}:${m}`;
}

/** アプリの駅ID（sendai / nagamachi）を地下鉄駅名に変換 */
export function getSubwayStationNameById(stationId: string): '仙台' | '長町' | null {
  if (stationId === 'sendai') return '仙台';
  if (stationId === 'nagamachi') return '長町';
  return null;
}

/** 駅IDに対応する地下鉄方面キー一覧を取得 */
export function getAvailableSubwayDirections(stationId: string): SubwayDirectionKey[] {
  if (stationId === 'sendai') {
    return ['namboku-north', 'namboku-south', 'tozai-east', 'tozai-west'];
  }
  if (stationId === 'nagamachi') {
    return ['namboku-north', 'namboku-south'];
  }
  return [];
}

export interface SubwayStationTrainItem {
  train: SubwayTrain;
  directionKey: SubwayDirectionKey;
  stationName: string;
  stationCode: string;
  stationIndex: number;
  departureTime: string;
  departureMinutes: number;
  terminalStation: string;
  terminalCode: string;
  terminalArrivalTime: string;
  originStation: string;
  originCode: string;
  originDepartureTime: string;
  track: string;
}

/** 指定された方面・ダイヤ種別・乗車駅における全列車リストを取得 */
export function getSubwayStationTimetable(
  stationName: string,
  directionKey: SubwayDirectionKey,
  dayType: SubwayDayType
): SubwayStationTrainItem[] {
  const meta = SUBWAY_DIRECTIONS[directionKey];
  const lineObj = SUBWAY_SCHEDULE.lines[meta.lineId];
  const dirObj = lineObj.directions[meta.directionId];
  if (!dirObj) return [];

  const stationIndex = dirObj.stations.indexOf(stationName);
  if (stationIndex === -1) return [];

  const stationCode = lineObj.stationCodes[stationName] || '';
  const terminalCode = lineObj.stationCodes[meta.destination] || '';
  const originCode = lineObj.stationCodes[meta.origin] || '';

  const rawTrains = dirObj[dayType] || [];
  return rawTrains.map((train) => {
    const depTime = train.times[stationIndex];
    const termTime = train.times[train.times.length - 1];
    const origTime = train.times[0];
    return {
      train,
      directionKey,
      stationName,
      stationCode,
      stationIndex,
      departureTime: formatSubwayTime(depTime),
      departureMinutes: toSubwayRailwayMinutes(depTime),
      terminalStation: train.destination,
      terminalCode,
      terminalArrivalTime: formatSubwayTime(termTime),
      originStation: train.origin,
      originCode,
      originDepartureTime: formatSubwayTime(origTime),
      track: train.track,
    };
  });
}

/** 現在時刻以降の直近 N 本の発車列車を取得（方面単体） */
export function getUpcomingSubwayTrains(
  stationName: string,
  directionKey: SubwayDirectionKey,
  now: Date = new Date(),
  limit = 3
): SubwayStationTrainItem[] {
  const isHoliday = isWeekendHolidayOrYearEnd(now);
  const dayType: SubwayDayType = isHoliday ? 'holiday' : 'weekday';
  const allItems = getSubwayStationTimetable(stationName, directionKey, dayType);
  const currentMinutes = Math.floor(getCurrentRailwaySeconds(now) / 60);

  return allItems
    .filter((item) => item.departureMinutes >= currentMinutes)
    .slice(0, limit);
}

/** 路線ID（namboku / tozai）ごとに、駅の全直近発車便を完全時系列順（発車時刻順）に N 本取得 */
export function getUpcomingSubwayTrainsByLine(
  stationName: string,
  lineId: SubwayLineId,
  now: Date = new Date(),
  limit = 3
): SubwayStationTrainItem[] {
  const isHoliday = isWeekendHolidayOrYearEnd(now);
  const dayType: SubwayDayType = isHoliday ? 'holiday' : 'weekday';
  const currentMinutes = Math.floor(getCurrentRailwaySeconds(now) / 60);

  const directionKeys: SubwayDirectionKey[] =
    lineId === 'namboku'
      ? ['namboku-north', 'namboku-south']
      : ['tozai-east', 'tozai-west'];

  const allTrains: SubwayStationTrainItem[] = [];
  for (const dirKey of directionKeys) {
    const list = getSubwayStationTimetable(stationName, dirKey, dayType);
    allTrains.push(...list.filter((t) => t.departureMinutes >= currentMinutes));
  }

  // 鉄道発車時刻順に昇順ソート（同時刻の場合は番線昇順）
  allTrains.sort((a, b) => {
    if (a.departureMinutes !== b.departureMinutes) {
      return a.departureMinutes - b.departureMinutes;
    }
    return a.track.localeCompare(b.track);
  });

  return allTrains.slice(0, limit);
}
