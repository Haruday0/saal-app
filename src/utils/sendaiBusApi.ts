import { getHolidaysSet, isWeekendHolidayOrYearEnd } from './calendar';
import { getCurrentRailwaySeconds } from './trainPosition';

const API_BASE = 'https://busmap.haruday0.live/api';

export const SENDAI_BUS_COLOR = '#059669';

export type SendaiBusDayType = 'weekday' | 'saturday' | 'holiday';

export interface SendaiBusRouteMaster {
  short_name: string;
  color: string;
}

export interface SendaiBusStopMaster {
  name: string;
  yomi: string;
  lat: number;
  lng: number;
  platform: string;
}

export interface SendaiBusRawTripStop {
  time: string;
  stop_id: string;
}

export interface SendaiBusRawTripInfo {
  headsign: string;
  service_id: string;
  office_id?: string;
  via?: string;
  stops: SendaiBusRawTripStop[];
}

export interface SendaiBusRawTimetableResponse {
  stop_id: string;
  stop_name: string;
  timetables: Record<string, Record<string, SendaiBusRawTripInfo>>;
  delays?: Record<string, Record<string, number>>;
}

export interface SendaiBusTimelineStop {
  stopId: string;
  stopName: string;
  platform: string;
  stopSequence: number;
  time: string;
  scheduledSec: number;
  scheduledMinutes: number;
}

export interface SendaiBusFilterOption {
  key: string;
  label: string;
}

export interface SendaiBusDeparture {
  id: string;
  tripId: string;
  routeId: string;
  routeCode: string;
  stopId: string;
  stopName: string;
  platform: string;
  headsign: string;
  via: string;
  dayType: SendaiBusDayType;
  departureTime: string;
  scheduledSec: number;
  scheduledMinutes: number;
  delaySec: number;
  delayMinutes: number;
  isDelayed: boolean;
  expectedTime: string;
  expectedSec: number;
  expectedMinutes: number;
  originStopName: string;
  originDepartureTime: string;
  terminalStopName: string;
  terminalArrivalTime: string;
  boardingStopIndex: number;
  filterKey: string;
  filterLabel: string;
  stops: SendaiBusTimelineStop[];
}

export interface SendaiBusGroupDefinition {
  groupId: string;
  title: string;
  shortTitle: string;
  stopIds: string[];
  filterMode: 'platform' | 'route' | 'routePrefix';
  upcomingLimit: number;
}

export interface SendaiBusStationGroupSchedule {
  groupId: string;
  title: string;
  shortTitle: string;
  stopIds: string[];
  filterMode: 'platform' | 'route' | 'routePrefix';
  upcomingLimit: number;
  filterOptions: SendaiBusFilterOption[];
  weekday: SendaiBusDeparture[];
  saturday: SendaiBusDeparture[];
  holiday: SendaiBusDeparture[];
}

export interface SendaiBusStationSchedule {
  stationId: string;
  stationName: string;
  groups: SendaiBusStationGroupSchedule[];
}

/** 対象4駅のバス停・のりばグループ定義 */
export const SENDAI_BUS_STATION_CONFIGS: Record<
  string,
  { stationName: string; groups: SendaiBusGroupDefinition[] }
> = {
  sendai: {
    stationName: '仙台',
    groups: [
      {
        groupId: 'sendai-west-pool',
        title: '西口バスプール（5〜15番のりば）',
        shortTitle: '西口(5〜15番)',
        stopIds: ['50_850', '50_851', '50_52', '50_53', '50_54', '50_56', '50_57', '50_58'],
        filterMode: 'platform',
        upcomingLimit: 3,
      },
      {
        groupId: 'sendai-west-aoba',
        title: '西口 青葉通・さくら野前（17〜28番のりば）',
        shortTitle: '西口(17〜28番)',
        stopIds: ['50_150', '50_151', '50_152', '50_154', '50_153'],
        filterMode: 'platform',
        upcomingLimit: 2,
      },
      {
        groupId: 'sendai-west-60',
        title: '西口 60番のりば（県庁市役所・大学病院方面）',
        shortTitle: '60番のりば',
        stopIds: ['50_210'],
        filterMode: 'routePrefix',
        upcomingLimit: 2,
      },
      {
        groupId: 'sendai-east',
        title: '東口バスプール（50・51番のりば）',
        shortTitle: '東口(50・51番)',
        stopIds: ['50_550', '50_560'],
        filterMode: 'platform',
        upcomingLimit: 2,
      },
    ],
  },
  nagamachi: {
    stationName: '長町',
    groups: [
      {
        groupId: 'nagamachi-east',
        title: '長町駅東口（4・5番のりば）',
        shortTitle: '東口(4・5番)',
        stopIds: ['7501_10', '7501_11'],
        filterMode: 'platform',
        upcomingLimit: 3,
      },
      {
        groupId: 'nagamachi-west',
        title: '長町駅西口',
        shortTitle: '西口',
        stopIds: ['6008_10', '6008_50'],
        filterMode: 'route',
        upcomingLimit: 2,
      },
      {
        groupId: 'nagamachi-taihakkuru',
        title: '長町駅・たいはっくる前',
        shortTitle: 'たいはっくる前',
        stopIds: ['6007_10', '6007_50'],
        filterMode: 'route',
        upcomingLimit: 2,
      },
    ],
  },
  taishido: {
    stationName: '太子堂',
    groups: [
      {
        groupId: 'taishido-north',
        title: '長町駅・長町南駅・市立病院方面（北行）',
        shortTitle: '長町・市立病院方面(北行)',
        stopIds: ['6020_10'],
        filterMode: 'route',
        upcomingLimit: 3,
      },
      {
        groupId: 'taishido-south',
        title: '南仙台駅・四郎丸・袋原方面（南行）',
        shortTitle: '南仙台・四郎丸方面(南行)',
        stopIds: ['6020_50'],
        filterMode: 'route',
        upcomingLimit: 3,
      },
    ],
  },
  'minami-sendai': {
    stationName: '南仙台',
    groups: [
      {
        groupId: 'minami-sendai-north',
        title: '太子堂・長町駅・長町南駅・市立病院方面（北行）',
        shortTitle: '太子堂・長町方面(北行)',
        stopIds: ['6163_10'],
        filterMode: 'route',
        upcomingLimit: 3,
      },
      {
        groupId: 'minami-sendai-south',
        title: '四郎丸・袋原・東中田方面（南行）',
        shortTitle: '四郎丸・袋原方面(南行)',
        stopIds: ['6163_50'],
        filterMode: 'route',
        upcomingLimit: 3,
      },
    ],
  },
};

/**
 * 実日時に基づく仙台市営バスの運行日区分判定
 * - 平日: 'weekday' (_1)
 * - 土曜（祝日・年末年始でない）: 'saturday' (_2)
 * - 日曜・祝日・年末年始(12/30〜1/3): 'holiday' (_3)
 */
export function getSendaiBusDayType(date: Date = new Date()): SendaiBusDayType {
  if (!isWeekendHolidayOrYearEnd(date)) {
    return 'weekday';
  }
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0) {
    return 'holiday';
  }
  const month = date.getMonth() + 1;
  const day = date.getDate();
  if ((month === 12 && day >= 30) || (month === 1 && day <= 3)) {
    return 'holiday';
  }
  const year = date.getFullYear();
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  if (getHolidaysSet(year).has(`${year}-${mm}-${dd}`)) {
    return 'holiday';
  }
  return 'saturday';
}

function parseServiceDayType(serviceId: string): SendaiBusDayType | null {
  if (serviceId.endsWith('_1')) return 'weekday';
  if (serviceId.endsWith('_2')) return 'saturday';
  if (serviceId.endsWith('_3')) return 'holiday';
  return null;
}

function parseBusTime(timeStr: string): {
  formatted: string;
  scheduledSec: number;
  scheduledMinutes: number;
} {
  const parts = timeStr.split(':');
  const rawH = parseInt(parts[0] || '0', 10);
  const m = parseInt(parts[1] || '0', 10);
  const s = parseInt(parts[2] || '0', 10);
  const railwayH = rawH < 4 ? rawH + 24 : rawH;
  const scheduledSec = railwayH * 3600 + m * 60 + s;
  const scheduledMinutes = railwayH * 60 + m;
  const displayH = rawH % 24;
  const formatted = `${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  return { formatted, scheduledSec, scheduledMinutes };
}

function formatMinutesToHHMM(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Azure App Service コールドスタート対策付き fetch
 * 502 / 503 / 504 やネットワークエラー時に 2.5 秒間隔で最大 5 回まで自動リトライ
 */
async function fetchJsonWithRetry<T>(url: string, maxRetries = 5, retryDelayMs = 2500): Promise<T> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (res.ok) {
        return (await res.json()) as T;
      }

      // 502 / 503 / 504 / 500 / 429 はサーバー起動待ちとしてリトライ
      if ([500, 502, 503, 504, 429].includes(res.status) && attempt < maxRetries) {
        lastError = new Error(`HTTP ${res.status} on ${url}`);
        await sleep(retryDelayMs);
        continue;
      }

      throw new Error(`HTTP ${res.status} on ${url}`);
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        await sleep(retryDelayMs);
        continue;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Failed to fetch ${url}`);
}

// インメモリキャッシュ
let routesCache: Record<string, SendaiBusRouteMaster> | null = null;
let routesPromise: Promise<Record<string, SendaiBusRouteMaster>> | null = null;

let stopsCache: Record<string, SendaiBusStopMaster> | null = null;
let stopsPromise: Promise<Record<string, SendaiBusStopMaster>> | null = null;

const TIMETABLE_CACHE_TTL_MS = 30 * 1000; // リアルタイム遅延更新のため30秒TTL
const stopTimetableCache = new Map<
  string,
  { data: SendaiBusRawTimetableResponse; fetchedAt: number }
>();
const stopTimetablePromises = new Map<string, Promise<SendaiBusRawTimetableResponse>>();

export async function fetchSendaiBusRoutes(): Promise<Record<string, SendaiBusRouteMaster>> {
  if (routesCache) return routesCache;
  if (routesPromise) return routesPromise;

  routesPromise = fetchJsonWithRetry<Record<string, SendaiBusRouteMaster>>(`${API_BASE}/routes`)
    .then((data) => {
      routesCache = data;
      routesPromise = null;
      return data;
    })
    .catch((err) => {
      routesPromise = null;
      throw err;
    });

  return routesPromise;
}

export async function fetchSendaiBusStops(): Promise<Record<string, SendaiBusStopMaster>> {
  if (stopsCache) return stopsCache;
  if (stopsPromise) return stopsPromise;

  stopsPromise = fetchJsonWithRetry<Record<string, SendaiBusStopMaster>>(`${API_BASE}/stops`)
    .then((data) => {
      stopsCache = data;
      stopsPromise = null;
      return data;
    })
    .catch((err) => {
      stopsPromise = null;
      throw err;
    });

  return stopsPromise;
}

export async function fetchSendaiBusStopTimetable(
  stopId: string,
  forceRefresh = false
): Promise<SendaiBusRawTimetableResponse> {
  const nowMs = Date.now();
  const cached = stopTimetableCache.get(stopId);
  if (!forceRefresh && cached && nowMs - cached.fetchedAt < TIMETABLE_CACHE_TTL_MS) {
    return cached.data;
  }

  const inflight = stopTimetablePromises.get(stopId);
  if (inflight) return inflight;

  const promise = fetchJsonWithRetry<SendaiBusRawTimetableResponse>(
    `${API_BASE}/stops/${encodeURIComponent(stopId)}/timetable`
  )
    .then((data) => {
      stopTimetableCache.set(stopId, { data, fetchedAt: Date.now() });
      stopTimetablePromises.delete(stopId);
      return data;
    })
    .catch((err) => {
      stopTimetablePromises.delete(stopId);
      // 再取得失敗時でも前回キャッシュがあればフォールバックではなくキャッシュ継続利用しないようエラー送出（呼び出し側で制御）
      throw err;
    });

  stopTimetablePromises.set(stopId, promise);
  return promise;
}

/**
 * アプリ起動時のバックグラウンド・ウォームアップ
 * Azure App Service のコールドスタートをモジュール読み込み時に先行起動する
 */
export function warmupSendaiBusMaster(): void {
  if (typeof window === 'undefined') return;
  fetchSendaiBusRoutes().catch(() => {
    // バックグラウンドウォームアップのためエラーは握りつぶし、実表示時に再試行
  });
  fetchSendaiBusStops().catch(() => {
    // 同上
  });
}

// モジュール読み込み時に自動でウォームアップ開始
warmupSendaiBusMaster();

function resolveFilterKeyAndLabel(
  filterMode: 'platform' | 'route' | 'routePrefix',
  platform: string,
  routeCode: string
): { filterKey: string; filterLabel: string } {
  if (filterMode === 'platform') {
    const p = platform || 'のりば';
    return {
      filterKey: p,
      filterLabel: `${p}番のりば`,
    };
  }
  if (filterMode === 'routePrefix') {
    if (routeCode.startsWith('K')) {
      return { filterKey: 'K', filterLabel: 'K系統（県庁市役所）' };
    }
    if (routeCode.startsWith('J')) {
      return { filterKey: 'J', filterLabel: 'J系統（定禅寺通）' };
    }
    return { filterKey: routeCode, filterLabel: `${routeCode}系統` };
  }
  return {
    filterKey: routeCode,
    filterLabel: routeCode,
  };
}

/**
 * 指定された駅IDの仙台市営バス全グループ時刻表・リアルタイム遅延データを取得・構築
 */
export async function fetchSendaiBusStationSchedule(
  stationId: string,
  forceRefresh = false
): Promise<SendaiBusStationSchedule | null> {
  const config = SENDAI_BUS_STATION_CONFIGS[stationId];
  if (!config) return null;

  // まずマスタデータ（routes / stops）を取得（コールドスタート時はここで起動完了まで待機）
  const [routesMaster, stopsMaster] = await Promise.all([
    fetchSendaiBusRoutes(),
    fetchSendaiBusStops(),
  ]);

  // 駅内の全対象 stopId を重複なく取得
  const uniqueStopIds = Array.from(
    new Set(config.groups.flatMap((g) => g.stopIds))
  );

  const rawTimetablesMap = new Map<string, SendaiBusRawTimetableResponse>();
  await Promise.all(
    uniqueStopIds.map(async (stopId) => {
      const tt = await fetchSendaiBusStopTimetable(stopId, forceRefresh);
      rawTimetablesMap.set(stopId, tt);
    })
  );

  const groups: SendaiBusStationGroupSchedule[] = config.groups.map((groupDef) => {
    const byDay: Record<SendaiBusDayType, SendaiBusDeparture[]> = {
      weekday: [],
      saturday: [],
      holiday: [],
    };
    const filterMap = new Map<string, string>();

    for (const stopId of groupDef.stopIds) {
      const rawTt = rawTimetablesMap.get(stopId);
      if (!rawTt || !rawTt.timetables) continue;

      const stopInfo = stopsMaster[stopId];
      const stopName = stopInfo?.name || rawTt.stop_name || stopId;
      const platform = stopInfo?.platform || '';

      for (const [routeId, tripsMap] of Object.entries(rawTt.timetables)) {
        const routeInfo = routesMaster[routeId];
        const routeCode = routeInfo?.short_name || routeId;

        for (const [tripId, trip] of Object.entries(tripsMap)) {
          const dayType = parseServiceDayType(trip.service_id || '');
          if (!dayType) continue;

          const rawStops = trip.stops || [];
          const boardingIdx = rawStops.findIndex((s) => s.stop_id === stopId);

          // 終着降車便の厳格除外: stopId が見つからない、または最後の要素である場合は除外
          if (boardingIdx === -1 || boardingIdx === rawStops.length - 1) {
            continue;
          }

          const boardingRawStop = rawStops[boardingIdx];
          const parsedDep = parseBusTime(boardingRawStop.time);

          // リアルタイム遅延（秒単位、60秒以上で反映）
          const rawDelaySec = rawTt.delays?.[routeId]?.[tripId] ?? 0;
          const isDelayed = rawDelaySec >= 60;
          const delaySec = isDelayed ? rawDelaySec : 0;
          const delayMinutes = isDelayed ? Math.floor(rawDelaySec / 60) : 0;
          const expectedSec = parsedDep.scheduledSec + delaySec;
          const expectedMinutes = parsedDep.scheduledMinutes + delayMinutes;
          const expectedTime = formatMinutesToHHMM(expectedMinutes);

          // 始発〜終着の全停車バス停タイムライン構築
          const timelineStops: SendaiBusTimelineStop[] = rawStops.map((st, idx) => {
            const stMaster = stopsMaster[st.stop_id];
            const parsedSt = parseBusTime(st.time);
            return {
              stopId: st.stop_id,
              stopName: stMaster?.name || st.stop_id,
              platform: stMaster?.platform || '',
              stopSequence: idx + 1,
              time: parsedSt.formatted,
              scheduledSec: parsedSt.scheduledSec,
              scheduledMinutes: parsedSt.scheduledMinutes,
            };
          });

          const originStop = timelineStops[0];
          const terminalStop = timelineStops[timelineStops.length - 1];

          const { filterKey, filterLabel } = resolveFilterKeyAndLabel(
            groupDef.filterMode,
            platform,
            routeCode
          );
          if (!filterMap.has(filterKey)) {
            filterMap.set(filterKey, filterLabel);
          }

          const departure: SendaiBusDeparture = {
            id: `${stopId}__${routeId}__${tripId}`,
            tripId,
            routeId,
            routeCode,
            stopId,
            stopName,
            platform,
            headsign: trip.headsign || terminalStop.stopName,
            via: trip.via || '',
            dayType,
            departureTime: parsedDep.formatted,
            scheduledSec: parsedDep.scheduledSec,
            scheduledMinutes: parsedDep.scheduledMinutes,
            delaySec,
            delayMinutes,
            isDelayed,
            expectedTime,
            expectedSec,
            expectedMinutes,
            originStopName: originStop.stopName,
            originDepartureTime: originStop.time,
            terminalStopName: terminalStop.stopName,
            terminalArrivalTime: terminalStop.time,
            boardingStopIndex: boardingIdx,
            filterKey,
            filterLabel,
            stops: timelineStops,
          };

          byDay[dayType].push(departure);
        }
      }
    }

    // 4:00基準の鉄道時刻順（昇順）にソート
    const sortDepartures = (list: SendaiBusDeparture[]) =>
      list.sort((a, b) => {
        if (a.scheduledSec !== b.scheduledSec) {
          return a.scheduledSec - b.scheduledSec;
        }
        return a.routeCode.localeCompare(b.routeCode, 'ja', { numeric: true });
      });

    sortDepartures(byDay.weekday);
    sortDepartures(byDay.saturday);
    sortDepartures(byDay.holiday);

    // フィルター選択肢の整列（のりば番号・系統番号を自然順ソート）
    const filterOptions: SendaiBusFilterOption[] = Array.from(filterMap.entries())
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.key.localeCompare(b.key, 'ja', { numeric: true }));

    return {
      groupId: groupDef.groupId,
      title: groupDef.title,
      shortTitle: groupDef.shortTitle,
      stopIds: groupDef.stopIds,
      filterMode: groupDef.filterMode,
      upcomingLimit: groupDef.upcomingLimit,
      filterOptions,
      weekday: byDay.weekday,
      saturday: byDay.saturday,
      holiday: byDay.holiday,
    };
  });

  return {
    stationId,
    stationName: config.stationName,
    groups,
  };
}

/**
 * グループ内の直近発車便リストを取得
 * 未発車の判定および並び順はリアルタイム遅延反映後の予想発車時刻（scheduledSec + delaySec）を基準に行う
 */
export function getUpcomingSendaiBusDepartures(
  group: SendaiBusStationGroupSchedule,
  now: Date = new Date(),
  limit?: number
): SendaiBusDeparture[] {
  const dayType = getSendaiBusDayType(now);
  const allDeps = group[dayType] || [];
  const currentMinuteFloorSec = Math.floor(getCurrentRailwaySeconds(now) / 60) * 60;
  const maxItems = limit ?? group.upcomingLimit;

  return allDeps
    .filter((dep) => dep.scheduledSec + dep.delaySec >= currentMinuteFloorSec)
    .sort((a, b) => {
      const aExp = a.scheduledSec + a.delaySec;
      const bExp = b.scheduledSec + b.delaySec;
      if (aExp !== bExp) return aExp - bExp;
      return a.scheduledSec - b.scheduledSec;
    })
    .slice(0, maxItems);
}
