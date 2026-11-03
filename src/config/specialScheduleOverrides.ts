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
  activePeriod: {
    start: string;
    end: string;
  };
  /** 説明・概要 */
  description: string;
  /** 対象列車の上書き設定 */
  trainOverrides: {
    trainNumber: string;
    /** 臨時変更後の両数 */
    cars?: 2 | 4 | 6 | 10;
    /** 臨時変更後の番線（例: 仙台駅4番線到着） */
    track?: string;
    /** 特定駅での番線変更（例: { sendai: '4' }） */
    stationTracks?: Record<string, string>;
    /** 列車詳細用の案内文 */
    note: string;
  }[];
}

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
        track: '4', // 仙台駅4番線到着に変更
        stationTracks: { sendai: '4' },
        note: '11/6(金)〜11/8(日)は仙台駅4番線到着に変更',
      },
    ],
  },
];

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
  return SPECIAL_SCHEDULE_OVERRIDES.filter((ev) => {
    const s = new Date(ev.activePeriod.start).getTime();
    const e = new Date(ev.activePeriod.end).getTime();
    return t >= s && t <= e;
  });
}

/**
 * 特定の列車番号に対する告知案内（今すぐ〜11/8まで有効）を取得
 */
export function getTrainNoticeInfo(
  trainNumber?: string,
  now: Date = new Date()
): { event: SpecialEventOverride; note: string } | null {
  if (!trainNumber) return null;
  const activeEvents = getActiveNoticeEvents(now);
  for (const ev of activeEvents) {
    const match = ev.trainOverrides.find((o) => o.trainNumber === trainNumber);
    if (match) {
      return { event: ev, note: match.note };
    }
  }
  return null;
}

/**
 * 列車オブジェクト（DepartureTrain または ScheduledTrain）に特別運行上書きを適用
 * 普段はそのまま返し、適用期間内（11/6〜11/8）であれば cars や track を上書きした新オブジェクトを返します。
 */
export function applySpecialOverrides<
  T extends {
    trainNumber?: string;
    cars: number;
    track?: string;
    stops?: any[];
    allStops?: any[];
  }
>(train: T, now: Date = new Date()): T {
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
      if (match.track !== undefined) {
        updated.track = match.track;
      }
      if (match.stationTracks) {
        if (Array.isArray(updated.stops)) {
          updated.stops = updated.stops.map((s) => {
            if (s && s.stationId && match.stationTracks![s.stationId]) {
              return { ...s, track: match.stationTracks![s.stationId] };
            }
            return s;
          });
        }
        if (Array.isArray(updated.allStops)) {
          updated.allStops = updated.allStops.map((s) => {
            if (s && s.stationId && match.stationTracks![s.stationId]) {
              return { ...s, track: match.stationTracks![s.stationId] };
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
