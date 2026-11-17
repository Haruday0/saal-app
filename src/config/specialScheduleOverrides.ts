/**
 * 臨時ダイヤ・特別運行上書きルール設定
 *
 * 普段は通常時刻表データ（trainSchedule.json / stationDepartures.json）を参照し、
 * 指定された期間内（実日時またはシミュレーション日時）に臨時の運行情報がある場合のみ
 * 両数（cars）や番線（track）などを自動で上書きします。
 */


export interface SpecialEventOverride {
  id: string;
  /** 告知リンクのタイトル（公式表記完全準拠） */
  title: string;
  /** 公式お知らせURL */
  url: string;
  /** 告知バナー表示期間（ISO文字列: 開始〜終了） */
  noticePeriod: {
    start: string;
    end: string;
  };
  /** 実際のダイヤ上書き適用期間（ISO文字列: 開始〜終了） */
  activePeriod?: {
    start: string;
    end: string;
  };
  /** 特定日指定（JSTの YYYY-MM-DD 形式の日付配列） */
  activeDates?: string[];
  /** 説明・概要 */
  description: string;
  /** 対象列車の上書き設定 */
  trainOverrides: {
    trainNumber: string;
    /** 臨時変更後の両数 */
    cars?: 2 | 4 | 6 | 10;
    /**
     * @deprecated 全駅の番線を無条件上書きしてしまうため非推奨。駅別番線指定には stationTracks を使用してください。
     */
    track?: string;
    /** 特定駅での番線変更（駅IDまたは駅名をキー、番線を値とするマップ。例: { sendai: '4' }） */
    stationTracks?: Record<string, string>;
    /** 列車詳細用の案内文 */
    note: string;
  }[];
}

/** 駅IDと日本語駅名の相互変換マッピング（全8駅） */
export const OVERRIDE_STATION_ID_TO_NAME: Record<string, string> = {
  sendai: '仙台',
  nagamachi: '長町',
  taishido: '太子堂',
  'minami-sendai': '南仙台',
  natori: '名取',
  morisekinoshita: '杜せきのした',
  mitazono: '美田園',
  'sendai-airport': '仙台空港',
};

export const OVERRIDE_STATION_NAME_TO_ID: Record<string, string> = {
  '仙台': 'sendai',
  '長町': 'nagamachi',
  '太子堂': 'taishido',
  '南仙台': 'minami-sendai',
  '名取': 'natori',
  '杜せきのした': 'morisekinoshita',
  '美田園': 'mitazono',
  '仙台空港': 'sendai-airport',
};

/**
 * 登録されている特別運行オーバーライドルール一覧
 */
export const SPECIAL_SCHEDULE_OVERRIDES: SpecialEventOverride[] = [
  {
    id: 'pokemon-go-wild-area-2026',
    title: 'ポケモンGOワイルドエリア２０２６開催における増結運転について',
    url: 'https://www.senat.co.jp/2026/10/06/4706',
    // 告知期間: 2026年10月6日（公式発表日）〜 2026年11月8日 23:59:59
    noticePeriod: {
      start: '2026-10-06T00:00:00+09:00',
      end: '2026-11-08T23:59:59+09:00',
    },
    // 適用期間: 2026年11月6日(金) 〜 2026年11月8日(日) の3日間
    activePeriod: {
      start: '2026-11-06T00:00:00+09:00',
      end: '2026-11-08T23:59:59+09:00',
    },
    description: '仙台空港鉄道では、2026年11月6日(金)～11月8日(日)におきまして、一部列車の車両数を増やして運転いたします。',
    trainOverrides: [
      // ── 上り（仙台発 → 仙台空港行き）4便: 2両 → 4両 ──
      {
        trainNumber: '1320M', // 仙台 09:30発 → 仙台空港 09:57着
        cars: 4,
        note: '11/6(金)〜11/8(日)は2両→4両編成に増結して運転',
      },
      {
        trainNumber: '1328M', // 仙台 10:50発 → 仙台空港 11:17着
        cars: 4,
        note: '11/6(金)〜11/8(日)は2両→4両編成に増結して運転',
      },
      {
        trainNumber: '1336M', // 仙台 12:10発 → 仙台空港 12:37着
        cars: 4,
        note: '11/6(金)〜11/8(日)は2両→4両編成に増結して運転',
      },
      {
        trainNumber: '1344M', // 仙台 13:30発 → 仙台空港 13:57着
        cars: 4,
        note: '11/6(金)〜11/8(日)は2両→4両編成に増結して運転',
      },

      // ── 下り（仙台空港発 → 仙台行き）4便: 2両 → 4両 ──
      {
        trainNumber: '1321M', // 仙台空港 10:08発 → 仙台 10:33着
        cars: 4,
        note: '11/6(金)〜11/8(日)は2両→4両編成に増結して運転',
      },
      {
        trainNumber: '1329M', // 仙台空港 11:28発 → 仙台 11:53着
        cars: 4,
        note: '11/6(金)〜11/8(日)は2両→4両編成に増結して運転',
      },
      {
        trainNumber: '1337M', // 仙台空港 12:48発 → 仙台 13:13着
        cars: 4,
        note: '11/6(金)〜11/8(日)は2両→4両編成に増結して運転',
      },
      {
        trainNumber: '1345M', // 仙台空港 14:08発 → 仙台 14:33着
        cars: 4,
        note: '11/6(金)〜11/8(日)は2両→4両編成に増結して運転',
      },

      // ── 仙台駅到着番線変更（1便） ──
      {
        trainNumber: '1313M', // 仙台空港 08:36発 → 仙台 09:01着
        stationTracks: { sendai: '4' },
        note: '11/6(金)〜11/8(日)は仙台駅4番線到着に変更',
      },
    ],
  },
  {
    id: 'amplification-november-2026',
    title: '増結運転のお知らせ',
    url: 'https://www.senat.co.jp/2026/10/09/4708',
    noticePeriod: {
      start: '2026-10-09T00:00:00+09:00',
      end: '2026-11-28T23:59:59+09:00',
    },
    activeDates: ['2026-11-14', '2026-11-21', '2026-11-28'],
    description: '11月14日(土)・21日(土)・28日(土)の3日間、混雑緩和のため一部列車が2両から4両編成に増結されます。',
    trainOverrides: [
      // 上り（仙台発 -> 仙台空港行き）4便: 2両 -> 4両
      {
        trainNumber: '1330M',
        cars: 4,
        note: '11/14(土)・21(土)・28(土)は2両→4両編成に増結して運転',
      },
      {
        trainNumber: '1338M',
        cars: 4,
        note: '11/14(土)・21(土)・28(土)は2両→4両編成に増結して運転',
      },
      {
        trainNumber: '1346M',
        cars: 4,
        note: '11/14(土)・21(土)・28(土)は2両→4両編成に増結して運転',
      },
      {
        trainNumber: '1354M',
        cars: 4,
        note: '11/14(土)・21(土)・28(土)は2両→4両編成に増結して運転',
      },

      // 下り（仙台空港発 -> 仙台行き）4便: 2両 -> 4両
      {
        trainNumber: '1331M',
        cars: 4,
        note: '11/14(土)・21(土)・28(土)は2両→4両編成に増結して運転',
      },
      {
        trainNumber: '1339M',
        cars: 4,
        note: '11/14(土)・21(土)・28(土)は2両→4両編成に増結して運転',
      },
      {
        trainNumber: '1347M',
        cars: 4,
        note: '11/14(土)・21(土)・28(土)は2両→4両編成に増結して運転',
      },
      {
        trainNumber: '1355M',
        cars: 4,
        note: '11/14(土)・21(土)・28(土)は2両→4両編成に増結して運転',
      },
    ],
  },
];

/**
 * 日本時間（JST）の YYYY-MM-DD 文字列を取得
 */
export function getJstDateString(date: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const d = parts.find((p) => p.type === 'day')?.value;
    if (y && m && d) {
      return `${y}-${m}-${d}`;
    }
  } catch {
    // フォールバック
  }
  return date
    .toLocaleDateString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    .replace(/\//g, '-');
}

/**
 * 指定日時において告知バナーを表示すべき特別イベント一覧を取得
 */
export function getActiveNoticeEvents(now: Date = new Date()): SpecialEventOverride[] {
  const t = now.getTime();
  return SPECIAL_SCHEDULE_OVERRIDES.filter((ev) => {
    const s = new Date(ev.noticePeriod.start).getTime();
    const e = new Date(ev.noticePeriod.end).getTime();
    return t >= s && t <= e;
  });
}

/**
 * 指定日時において実際のダイヤ上書きを適用すべき特別イベント一覧を取得
 */
export function getActiveScheduleOverrides(now: Date = new Date()): SpecialEventOverride[] {
  const t = now.getTime();
  const jstDate = getJstDateString(now);

  return SPECIAL_SCHEDULE_OVERRIDES.filter((ev) => {
    if (ev.activeDates && ev.activeDates.length > 0) {
      return ev.activeDates.includes(jstDate);
    }
    if (ev.activePeriod) {
      const s = new Date(ev.activePeriod.start).getTime();
      const e = new Date(ev.activePeriod.end).getTime();
      return t >= s && t <= e;
    }
    return false;
  });
}

/**
 * 特定の列車番号に対する告知案内（告知期間中のみ有効）を取得
 */
export function getTrainNoticeInfo(
  trainNumber?: string,
  now: Date = new Date()
): {
  event: SpecialEventOverride;
  note: string;
  cars?: number;
  stationTracks?: Record<string, string>;
} | null {
  if (!trainNumber) return null;
  const activeEvents = getActiveNoticeEvents(now);
  for (const ev of activeEvents) {
    const match = ev.trainOverrides.find((o) => o.trainNumber === trainNumber);
    if (match) {
      return {
        event: ev,
        note: match.note,
        cars: match.cars,
        stationTracks: match.stationTracks,
      };
    }
  }
  return null;
}

/**
 * 列車オブジェクト（DepartureTrain または ScheduledTrain）に特別運行上書きを適用
 * 普段はそのまま返し、適用期間内（イベント指定日）であれば cars や stationTracks を上書きした新オブジェクトを返します。
 *
 * @param train 対象列車オブジェクト
 * @param now 判定日時（デフォルト: 現在時刻）
 * @param stationId 呼び出し元が特定の駅の場合に渡す駅ID（例: 'mitazono', 'sendai' 等）
 */
export function applySpecialOverrides<
  T extends {
    id?: string;
    stationId?: string;
    trainNumber?: string;
    cars: number;
    track?: string;
    stops?: any[];
    allStops?: any[];
  }
>(train: T, now: Date = new Date(), stationId?: string): T {
  if (!train || !train.trainNumber) return train;
  const activeEvents = getActiveScheduleOverrides(now);
  if (activeEvents.length === 0) return train;

  for (const ev of activeEvents) {
    const match = ev.trainOverrides.find((o) => o.trainNumber === train.trainNumber);
    if (match) {
      const updated: T = { ...train };
      if (match.cars !== undefined) {
        updated.cars = match.cars;
      }

      // 対象駅IDの判別
      // 1. 明示的な引数 stationId
      // 2. train.stationId
      // 3. train.id (例: '1313M-mitazono-down' や '1313M-sendai-airport-down') から抽出
      let targetStationId: string | undefined = stationId || updated.stationId;
      if (!targetStationId && updated.id) {
        const idMatch = updated.id.match(/^[^-]+-(.+)-(up|down)$/);
        if (idMatch) {
          targetStationId = idMatch[1];
        }
      }

      // match.stationTracks による特定駅の番線上書き
      if (match.stationTracks) {
        if (targetStationId) {
          const overrideTrack =
            match.stationTracks[targetStationId] ??
            (OVERRIDE_STATION_ID_TO_NAME[targetStationId]
              ? match.stationTracks[OVERRIDE_STATION_ID_TO_NAME[targetStationId]]
              : undefined) ??
            (OVERRIDE_STATION_NAME_TO_ID[targetStationId]
              ? match.stationTracks[OVERRIDE_STATION_NAME_TO_ID[targetStationId]]
              : undefined);

          if (overrideTrack !== undefined) {
            updated.track = overrideTrack;
          }
        }
      } else if (match.track !== undefined) {
        // 後方互換（非推奨の match.track が指定され、stationTracks が未指定の場合のみ）
        updated.track = match.track;
      }

      // stops および allStops の各停車駅に対する番線上書き
      if (match.stationTracks) {
        const resolveStopTrack = (s: any): string | undefined => {
          if (!s) return undefined;
          if (s.stationId && match.stationTracks![s.stationId] !== undefined) {
            return match.stationTracks![s.stationId];
          }
          if (s.stationName && match.stationTracks![s.stationName] !== undefined) {
            return match.stationTracks![s.stationName];
          }
          if (
            s.stationName &&
            OVERRIDE_STATION_NAME_TO_ID[s.stationName] &&
            match.stationTracks![OVERRIDE_STATION_NAME_TO_ID[s.stationName]] !== undefined
          ) {
            return match.stationTracks![OVERRIDE_STATION_NAME_TO_ID[s.stationName]];
          }
          if (
            s.stationId &&
            OVERRIDE_STATION_ID_TO_NAME[s.stationId] &&
            match.stationTracks![OVERRIDE_STATION_ID_TO_NAME[s.stationId]] !== undefined
          ) {
            return match.stationTracks![OVERRIDE_STATION_ID_TO_NAME[s.stationId]];
          }
          return undefined;
        };

        if (Array.isArray(updated.stops)) {
          updated.stops = updated.stops.map((s) => {
            const overrideTrack = resolveStopTrack(s);
            if (overrideTrack !== undefined) {
              return { ...s, track: overrideTrack };
            }
            return s;
          });
        }
        if (Array.isArray(updated.allStops)) {
          updated.allStops = updated.allStops.map((s) => {
            const overrideTrack = resolveStopTrack(s);
            if (overrideTrack !== undefined) {
              return { ...s, track: overrideTrack };
            }
            return s;
          });
        }
      }

      return updated;
    }
  }

  return train;
}
