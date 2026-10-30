import natoringoScheduleData from '../data/natoringoSchedule.json';
import { isWeekendHolidayOrYearEnd } from './calendar';
import { getCurrentRailwaySeconds } from './trainPosition';

export type NatoringoDayType = 'weekday' | 'holiday';

export interface NatoringoLineInfo {
  lineName: string;
  routeColor: string;
}

export interface NatoringoTimelineStop {
  stopId: string;
  stopName: string;
  stopSequence: number;
  time: string;
  minutes: number;
  fare: number | null;
}

export interface NatoringoDeparture {
  id: string;
  tripId: string;
  routeId: string;
  routeCode: string;
  lineName: string;
  routeColor: string;
  headsign: string;
  departureTime: string;
  departureMinutes: number;
  originStopName: string;
  originDepartureTime: string;
  terminalStopName: string;
  terminalArrivalTime: string;
  terminalFare: number;
  boardingStopIndex: number;
  stops: NatoringoTimelineStop[];
}

export interface NatoringoBusStopSchedule {
  stopId: string;
  stopName: string;
  label: string;
  lines: NatoringoLineInfo[];
  weekday: NatoringoDeparture[];
  holiday: NatoringoDeparture[];
}

export interface NatoringoStationSchedule {
  stationId: string;
  stationName: string;
  busStops: NatoringoBusStopSchedule[];
}

export interface NatoringoScheduleRoot {
  feedVersion: string;
  revisionDate: string;
  stations: Record<string, NatoringoStationSchedule>;
}

export const NATORINGO_SCHEDULE = natoringoScheduleData as unknown as NatoringoScheduleRoot;

/** 駅IDに対応するなとりん号バス停スケジュールを取得 */
export function getNatoringoStationSchedule(stationId: string): NatoringoStationSchedule | null {
  return NATORINGO_SCHEDULE.stations[stationId] || null;
}

/** 指定された駅・バス停ID・ダイヤ種別の1日全発車リストを取得 */
export function getNatoringoBusStopTimetable(
  stationId: string,
  stopId: string,
  dayType: NatoringoDayType
): NatoringoDeparture[] {
  const stationObj = getNatoringoStationSchedule(stationId);
  if (!stationObj) return [];
  const stopObj = stationObj.busStops.find((s) => s.stopId === stopId);
  if (!stopObj) return [];
  return stopObj[dayType] || [];
}

/** 現在時刻以降の直近 N 便の発車データを取得 */
export function getUpcomingNatoringoDepartures(
  stationId: string,
  stopId: string,
  now: Date = new Date(),
  limit = 3
): NatoringoDeparture[] {
  const isHoliday = isWeekendHolidayOrYearEnd(now);
  const dayType: NatoringoDayType = isHoliday ? 'holiday' : 'weekday';
  const allDeps = getNatoringoBusStopTimetable(stationId, stopId, dayType);
  const currentMinutes = Math.floor(getCurrentRailwaySeconds(now) / 60);

  return allDeps
    .filter((dep) => dep.departureMinutes >= currentMinutes)
    .slice(0, limit);
}
