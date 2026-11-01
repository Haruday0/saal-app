import { getHolidaysSet, isWeekendHolidayOrYearEnd } from './calendar';
import { getCurrentRailwaySeconds } from './trainPosition';

const API_BASE = 'https://busmap.haruday0.live/api';

export const API_BASE_URL = API_BASE;
export const SENDAI_BUS_COLOR = '#00703c';
export const SENDAI_BUS_BADGE_BG = '#a3d742';
export const SENDAI_BUS_BADGE_TEXT = '#1b4406';
export const SENDAI_BUS_ROUTE_DEFAULT_COLOR = SENDAI_BUS_BADGE_BG;

/** スケルトンローダーのチラつき・フラッシュ防止用の最低表示時間（ミリ秒） */
export const MIN_SKELETON_TIME = 350;

export type SendaiBusDayType = 'weekday' | 'saturday' | 'holiday';

export interface SendaiBusTripDetail {
  route_id: string;
  trip_id: string;
  route_name: string;
  route_color: string;
  delays?: Record<string, number>; // stop_id -> delay_seconds
  trip_delay?: number;
}

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
  routeColor: string;
  routeTextColor: string;
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

export interface SendaiBusStationConfig {
  stationName: string;
  stopIds: string[];
}

/** 対象4駅のバス停ID定義 */
export const SENDAI_BUS_STATION_CONFIGS: Record<string, SendaiBusStationConfig> = {
  sendai: {
    stationName: '仙台',
    stopIds: [
      '50_850', // 5番
      '50_851', // 6番
      '50_52',  // 9番
      '50_53',  // 10番
      '50_54',  // 11番
      '50_56',  // 13番
      '50_57',  // 14番
      '50_58',  // 15番
      '50_150', // 17番
      '50_151', // 18番
      '50_152', // 19番
      '50_154', // 27番
      '50_153', // 28番
      '50_550', // 50番 (広瀬通・青木前、西口側)
      '50_560', // 51番 (広瀬通・青木前、西口側)
      '50_210', // 60番
    ],
  },
  nagamachi: {
    stationName: '長町',
    stopIds: [
      '7501_10', // 東口 4番
      '7501_11', // 東口 5番
      '6008_10', // 西口
      '6008_50', // 西口
      '6007_10', // たいはっくる前
      '6007_50', // たいはっくる前
    ],
  },
  taishido: {
    stationName: '太子堂',
    stopIds: ['6020_10', '6020_50'],
  },
  'minami-sendai': {
    stationName: '南仙台',
    stopIds: ['6163_10', '6163_50'],
  },
};

export interface SendaiBusStationSchedule {
  stationId: string;
  stationName: string;
  stopIds: string[];
  filterOptions: SendaiBusFilterOption[];
  weekday: SendaiBusDeparture[];
  saturday: SendaiBusDeparture[];
  holiday: SendaiBusDeparture[];
}

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
      throw err;
    });

  stopTimetablePromises.set(stopId, promise);
  return promise;
}

/**
 * 定時時刻（"HH:MM" または "HH:MM:SS"）と遅延秒数から予想時刻（"HH:MM"）を計算
 */
export function calcExpectedTime(timeStr: string, delaySec: number): string {
  if (!timeStr) return '';
  const parts = timeStr.split(':').map((v) => parseInt(v, 10) || 0);
  const sec = parts[0] * 3600 + parts[1] * 60 + (parts[2] || 0);
  const totalSec = Math.max(0, sec + delaySec);
  const totalMinutes = Math.floor(totalSec / 60);
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const TRIP_DETAIL_CACHE_TTL_MS = 15 * 1000; // 15秒TTL
const tripDetailCache = new Map<string, { data: SendaiBusTripDetail; fetchedAt: number }>();
const tripDetailPromises = new Map<string, Promise<SendaiBusTripDetail | null>>();

/**
 * 便詳細（全停車バス停およびバス停ごとのリアルタイム遅延秒数）を取得
 * 失敗時はエラーを投げずに null を返す
 */
export async function fetchSendaiBusTripDetail(
  routeId: string,
  tripId: string,
  forceRefresh = false
): Promise<SendaiBusTripDetail | null> {
  const cacheKey = `${routeId}__${tripId}`;
  const nowMs = Date.now();
  const cached = tripDetailCache.get(cacheKey);
  if (!forceRefresh && cached && nowMs - cached.fetchedAt < TRIP_DETAIL_CACHE_TTL_MS) {
    return cached.data;
  }

  const inflight = tripDetailPromises.get(cacheKey);
  if (inflight) return inflight;

  const url = `${API_BASE_URL}/trips/${encodeURIComponent(routeId)}/${encodeURIComponent(tripId)}`;

  const promise = (async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (!res.ok) {
        return null;
      }
      const data = (await res.json()) as SendaiBusTripDetail;
      tripDetailCache.set(cacheKey, { data, fetchedAt: Date.now() });
      return data;
    } catch {
      return null;
    } finally {
      tripDetailPromises.delete(cacheKey);
    }
  })();

  tripDetailPromises.set(cacheKey, promise);
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

/** 駅およびバス停コードに応じたのりば表示名・フィルターキー・フィルターラベルの解決 */
function resolveStopPlatformAndFilter(
  stationId: string,
  stopId: string,
  stopPlatform: string,
  stopName: string
): { platformDisplay: string; filterKey: string; filterLabel: string } {
  if (stationId === 'sendai') {
    const p = stopPlatform || '';
    return {
      platformDisplay: p ? `${p}番のりば` : 'のりば',
      filterKey: p || 'other',
      filterLabel: p ? `${p}番` : 'のりば',
    };
  }
  if (stationId === 'nagamachi') {
    if (stopId === '7501_10') {
      return { platformDisplay: '東口 4番のりば', filterKey: '東口4', filterLabel: '東口4番' };
    }
    if (stopId === '7501_11') {
      return { platformDisplay: '東口 5番のりば', filterKey: '東口5', filterLabel: '東口5番' };
    }
    if (stopId.startsWith('6008_')) {
      return { platformDisplay: '西口', filterKey: '西口', filterLabel: '西口' };
    }
    if (stopId.startsWith('6007_')) {
      return { platformDisplay: 'たいはっくる前', filterKey: 'たいはっくる前', filterLabel: 'たいはっくる前' };
    }
  }
  if (stationId === 'taishido') {
    if (stopId === '6020_10') {
      return { platformDisplay: '長町・市立病院方面', filterKey: '北行', filterLabel: '長町方面' };
    }
    return { platformDisplay: '南仙台・四郎丸方面', filterKey: '南行', filterLabel: '四郎丸方面' };
  }
  if (stationId === 'minami-sendai') {
    if (stopId === '6163_10') {
      return { platformDisplay: '太子堂・長町方面', filterKey: '北行', filterLabel: '長町方面' };
    }
    return { platformDisplay: '四郎丸・袋原方面', filterKey: '南行', filterLabel: '四郎丸方面' };
  }
  const p = stopPlatform || stopName;
  return {
    platformDisplay: p,
    filterKey: p,
    filterLabel: p,
  };
}

/**
 * 指定された駅IDの仙台市営バス時刻表・リアルタイム遅延データを取得・構築
 * 駅内の全のりばを不自然な群に分割せず、1つの統合スケジュールとして提供
 */
export async function fetchSendaiBusStationSchedule(
  stationId: string,
  forceRefresh = false
): Promise<SendaiBusStationSchedule | null> {
  const config = SENDAI_BUS_STATION_CONFIGS[stationId];
  if (!config) return null;

  // まずマスタデータ（routes / stops）を取得
  const [routesMaster, stopsMaster] = await Promise.all([
    fetchSendaiBusRoutes(),
    fetchSendaiBusStops(),
  ]);

  const rawTimetablesMap = new Map<string, SendaiBusRawTimetableResponse>();
  await Promise.all(
    config.stopIds.map(async (stopId) => {
      const tt = await fetchSendaiBusStopTimetable(stopId, forceRefresh);
      rawTimetablesMap.set(stopId, tt);
    })
  );

  const byDay: Record<SendaiBusDayType, SendaiBusDeparture[]> = {
    weekday: [],
    saturday: [],
    holiday: [],
  };
  const filterMap = new Map<string, string>();

  for (const stopId of config.stopIds) {
    const rawTt = rawTimetablesMap.get(stopId);
    if (!rawTt || !rawTt.timetables) continue;

    const stopInfo = stopsMaster[stopId];
    const stopName = stopInfo?.name || rawTt.stop_name || stopId;
    const platform = stopInfo?.platform || '';

    const { platformDisplay, filterKey, filterLabel } = resolveStopPlatformAndFilter(
      stationId,
      stopId,
      platform,
      stopName
    );

    for (const [routeId, tripsMap] of Object.entries(rawTt.timetables)) {
      const routeInfo = routesMaster[routeId];
      const routeCode = routeInfo?.short_name || routeId;
      // 仙台市営バスの系統バッジ色は #a3d742（文字色 #1b4406）に完全固定
      const routeColor = SENDAI_BUS_BADGE_BG;
      const routeTextColor = SENDAI_BUS_BADGE_TEXT;

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

        if (!filterMap.has(filterKey)) {
          filterMap.set(filterKey, filterLabel);
        }

        const departure: SendaiBusDeparture = {
          id: `${stopId}__${routeId}__${tripId}`,
          tripId,
          routeId,
          routeCode,
          routeColor,
          routeTextColor,
          stopId,
          stopName,
          platform: platformDisplay,
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

  // フィルター選択肢の整列（数字キーは数値昇順、それ以外は自然順）
  const filterOptions: SendaiBusFilterOption[] = Array.from(filterMap.entries())
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => {
      const na = parseInt(a.key, 10);
      const nb = parseInt(b.key, 10);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.key.localeCompare(b.key, 'ja', { numeric: true });
    });

  return {
    stationId,
    stationName: config.stationName,
    stopIds: config.stopIds,
    filterOptions,
    weekday: byDay.weekday,
    saturday: byDay.saturday,
    holiday: byDay.holiday,
  };
}

/**
 * 駅内の直近発車便リストを取得
 * filterKey を指定した場合は当該のりばのみに絞り込み
 * 未発車の判定および並び順はリアルタイム遅延反映後の予想発車時刻（scheduledSec + delaySec）を基準に行う
 */
export function getUpcomingSendaiBusDepartures(
  schedule: SendaiBusStationSchedule,
  now: Date = new Date(),
  limit = 5,
  filterKey?: string | null
): SendaiBusDeparture[] {
  const dayType = getSendaiBusDayType(now);
  let allDeps = schedule[dayType] || [];
  if (filterKey) {
    allDeps = allDeps.filter((dep) => dep.filterKey === filterKey);
  }
  const currentMinuteFloorSec = Math.floor(getCurrentRailwaySeconds(now) / 60) * 60;

  return allDeps
    .filter((dep) => dep.scheduledSec + dep.delaySec >= currentMinuteFloorSec)
    .sort((a, b) => {
      const aExp = a.scheduledSec + a.delaySec;
      const bExp = b.scheduledSec + b.delaySec;
      if (aExp !== bExp) return aExp - bExp;
      return a.scheduledSec - b.scheduledSec;
    })
    .slice(0, limit);
}
