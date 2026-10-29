import trainScheduleData from '../data/trainSchedule.json';
import { MovingTrain, DirectionType, LineType } from '../types';

export const ROUTE_STATION_IDS = [
  'sendai',
  'nagamachi',
  'taishido',
  'minami-sendai',
  'natori',
  'morisekinoshita',
  'mitazono',
  'sendai-airport',
] as const;

export interface RealtimeMovingTrain extends MovingTrain {
  positionRatio: number; // 0.0 (sendai) ~ 7.0 (sendai-airport)
  stationName?: string;
  nextStationName?: string;
  isCompact?: boolean;
}

export function toRailwaySeconds(timeStr: string): number {
  const parts = timeStr.split(':');
  let h = parseInt(parts[0] || '0', 10);
  const m = parseInt(parts[1] || '0', 10);
  if (h < 4) h += 24;
  return h * 3600 + m * 60;
}

export function getCurrentRailwaySeconds(now: Date = new Date()): number {
  let h = now.getHours();
  if (h < 4) h += 24;
  return h * 3600 + now.getMinutes() * 60 + now.getSeconds();
}

/** 列車詳細表示用：時刻表上の1列車分のデータ */
export interface ScheduledStop {
  stationId: string;
  stationName: string;
  arr: string;
  dep: string;
  track?: string;
}

export interface ScheduledTrain {
  id: string;
  trainNumber: string;
  direction: DirectionType;
  line: LineType;
  lineName?: string;
  trainType?: string;
  destination: string;
  cars: 2 | 4 | 6 | 10;
  calendar?: string;
  originStation?: string;
  originDepartureTime?: string;
  stops: ScheduledStop[];
}

/** 列車ID（公式列車番号）から trainSchedule.json の全停車駅データを取得 */
export function getScheduledTrainById(id: string): ScheduledTrain | null {
  const data = trainScheduleData as unknown as { up: ScheduledTrain[]; down: ScheduledTrain[] };
  return data.up.find((t) => t.id === id) || data.down.find((t) => t.id === id) || null;
}

/**
 * trainSchedule.json の全駅着発時刻に基づき、
 * 現在時刻において駅停車中か駅間走行中かを判定し、
 * 駅間走行中の列車は同一区間・同一方向で等分配置（1本なら1/2、2本なら3等分など）して算出する
 */
export function getActiveMovingTrains(
  now: Date = new Date(),
  dayType?: 'weekday' | 'holiday'
): RealtimeMovingTrain[] {
  const currentSec = getCurrentRailwaySeconds(now);
  const isHoliday = dayType
    ? dayType === 'holiday'
    : now.getDay() === 0 || now.getDay() === 6;

  const data = trainScheduleData as unknown as {
    up: ScheduledTrain[];
    down: ScheduledTrain[];
  };

  // 1. 各方向ごとに、停車中列車と走行中列車を分類
  interface RawActiveTrain {
    train: (typeof data.up)[0];
    direction: DirectionType;
    isAtStation: boolean;
    stationId: string;
    stationName: string;
    nextStationId?: string;
    nextStationName?: string;
    curIdx: number;
    nextIdx?: number;
    depSec: number;
    nextArrSec?: number;
    progress: number;
  }

  const rawActiveTrains: RawActiveTrain[] = [];

  const directions: DirectionType[] = ['up', 'down'];
  for (const dir of directions) {
    const trainList = data[dir] || [];
    for (const train of trainList) {
      if (isHoliday && train.calendar === 'weekday') {
        continue;
      }
      const stops = train.stops;
      if (!stops || stops.length === 0) continue;

      const firstDepSec = toRailwaySeconds(stops[0].dep);
      const lastArrSec = toRailwaySeconds(stops[stops.length - 1].arr);

      if (currentSec >= firstDepSec && currentSec <= lastArrSec) {
        for (let i = 0; i < stops.length; i++) {
          const s = stops[i];
          const arrSec = toRailwaySeconds(s.arr);
          const depSec = toRailwaySeconds(s.dep);

          // 1. 駅に停車中
          if (currentSec >= arrSec && currentSec <= depSec) {
            const stIdx = ROUTE_STATION_IDS.indexOf(s.stationId as any);
            if (stIdx !== -1) {
              rawActiveTrains.push({
                train,
                direction: dir,
                isAtStation: true,
                stationId: s.stationId,
                stationName: s.stationName,
                curIdx: stIdx,
                depSec,
                progress: 0.0,
              });
            }
            break;
          }

          // 2. 駅間を走行中
          if (i < stops.length - 1) {
            const nextS = stops[i + 1];
            const nextArrSec = toRailwaySeconds(nextS.arr);
            if (currentSec > depSec && currentSec < nextArrSec) {
              const curIdx = ROUTE_STATION_IDS.indexOf(s.stationId as any);
              const nextIdx = ROUTE_STATION_IDS.indexOf(nextS.stationId as any);
              if (curIdx !== -1 && nextIdx !== -1) {
                const totalSpan = nextArrSec - depSec;
                const elapsed = currentSec - depSec;
                const progress = totalSpan > 0 ? elapsed / totalSpan : 0.0;

                rawActiveTrains.push({
                  train,
                  direction: dir,
                  isAtStation: false,
                  stationId: s.stationId,
                  stationName: s.stationName,
                  nextStationId: nextS.stationId,
                  nextStationName: nextS.stationName,
                  curIdx,
                  nextIdx,
                  depSec,
                  nextArrSec,
                  progress,
                });
              }
              break;
            }
          }
        }
      }
    }
  }

  const results: RealtimeMovingTrain[] = [];

  // 2. 駅停車中列車の位置決定（同一駅・同一方向に複数停車時は少しオフセット）
  const stationGroups = new Map<string, RawActiveTrain[]>();
  for (const item of rawActiveTrains) {
    if (item.isAtStation) {
      const key = `${item.direction}_${item.stationId}`;
      const group = stationGroups.get(key) || [];
      group.push(item);
      stationGroups.set(key, group);
    }
  }

  for (const group of stationGroups.values()) {
    // 発車時刻が早い順にソート
    group.sort((a, b) => a.depSec - b.depSec);
    const n = group.length;
    group.forEach((item, k) => {
      // 1本ならオフセット0、複数本なら重ならないよう少しずらす（±0.15）
      const offset = n > 1 ? (k - (n - 1) / 2) * 0.2 : 0.0;
      results.push({
        id: item.train.id,
        trainNumber: item.train.trainNumber,
        line: item.train.line,
        direction: item.direction,
        trainType: item.train.trainType || '普通',
        currentStationId: item.stationId,
        positionRatio: item.curIdx + offset,
        progress: 0.0,
        destination: item.train.destination
          .replace('(宮城県)', '')
          .replace('(福島県)', ''),
        cars: item.train.cars,
        isAtStation: true,
        stationName: item.stationName,
        originStation: item.train.originStation,
        originDepartureTime: item.train.originDepartureTime,
      });
    });
  }

  // 3. 駅間走行中列車の位置決定（同一区間・同一方向ごとに等分配置）
  const sectionGroups = new Map<string, RawActiveTrain[]>();
  for (const item of rawActiveTrains) {
    if (!item.isAtStation && item.nextIdx !== undefined) {
      const key = `${item.direction}_${item.curIdx}_${item.nextIdx}`;
      const group = sectionGroups.get(key) || [];
      group.push(item);
      sectionGroups.set(key, group);
    }
  }

  for (const group of sectionGroups.values()) {
    // 先行順（progressが小さい後発 -> progressが大きい先発）にソート
    group.sort((a, b) => a.progress - b.progress || a.depSec - b.depSec);
    const n = group.length;
    group.forEach((item, k) => {
      const curIdx = item.curIdx;
      const nextIdx = item.nextIdx!;
      // N本走っているときは等分配置
      // 2本の場合は中央に密集しないよう 0.26 / 0.74 に離す
      // 3本以上の場合は (k + 1) / (n + 1) 等分
      const ratio = n === 2 ? (k === 0 ? 0.26 : 0.74) : (k + 1) / (n + 1);
      const positionRatio = curIdx + (nextIdx - curIdx) * ratio;

      results.push({
        id: item.train.id,
        trainNumber: item.train.trainNumber,
        line: item.train.line,
        direction: item.direction,
        trainType: item.train.trainType || '普通',
        currentStationId: item.stationId,
        nextStationId: item.nextStationId,
        positionRatio,
        progress: ratio,
        destination: item.train.destination
          .replace('(宮城県)', '')
          .replace('(福島県)', ''),
        cars: item.train.cars,
        isAtStation: false,
        stationName: item.stationName,
        nextStationName: item.nextStationName,
        isCompact: n >= 2,
        originStation: item.train.originStation,
        originDepartureTime: item.train.originDepartureTime,
      });
    });
  }

  // 4. 近接チェック（同一方向で距離が0.65未満の列車ペアは両方スリム化）
  for (let i = 0; i < results.length; i++) {
    for (let j = i + 1; j < results.length; j++) {
      const t1 = results[i];
      const t2 = results[j];
      if (
        t1.direction === t2.direction &&
        Math.abs(t1.positionRatio - t2.positionRatio) < 0.65
      ) {
        t1.isCompact = true;
        t2.isCompact = true;
      }
    }
  }

  return results;
}
