import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

export interface BoardRowOverride {
  departureTime: string;
  destination: string;
  cars: string;
}

interface DebugContextValue {
  /** URLクエリ (?debug=1 等) によりデバッグモードが有効かどうか */
  isDebugMode: boolean;
  /** ヘッダー直下の全体デバッグパネルが開いているかどうか */
  isHeaderPanelOpen: boolean;
  setIsHeaderPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  /** 駅詳細シート内の電光掲示板直上デバッグパネルが開いているかどうか */
  isSheetPanelOpen: boolean;
  setIsSheetPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  /** アプリ全体の基準現在時刻（シミュレーション時刻または実時刻） */
  now: Date;
  /** 時刻または日付がオーバーライド中かどうか */
  isTimeOverridden: boolean;
  /** 日付がオーバーライド中かどうか */
  isDateOverridden: boolean;
  /** 日付オーバーライド値（YYYY-MM-DD または null） */
  overrideDateString: string | null;
  /** 現在の基準時刻の分（0〜1439、鉄道時刻4:00基準スライダー用は240〜1439） */
  effectiveMinutes: number;
  /** 分単位（0〜1439）でシミュレーション時刻を直接設定 */
  setOverrideMinutes: (minutes: number | null) => void;
  /** HH:mm 文字列でシミュレーション時刻を設定 */
  setOverrideTimeString: (timeStr: string) => void;
  /** 現在（またはシミュレーション中）の時刻から相対分数を加減算 */
  adjustTimeMinutes: (deltaMinutes: number) => void;
  /** YYYY-MM-DD 文字列でシミュレーション日付を設定 */
  setOverrideDateString: (dateStr: string | null) => void;
  /** 相対日数を加減算 */
  adjustDateDays: (deltaDays: number) => void;
  /** 実時刻にリセット */
  resetTime: () => void;
  /** 実日付にリセット */
  resetDate: () => void;
  /** 時刻・日付の両方を実日時にリセット */
  resetAll: () => void;
  /** 電光掲示板の各段（1〜3段目）の直接オーバーライド設定 */
  rowOverrides: [BoardRowOverride, BoardRowOverride, BoardRowOverride];
  /** 各段のオーバーライドを更新 */
  setRowOverride: (index: 0 | 1 | 2, patch: Partial<BoardRowOverride>) => void;
  /** 0〜9の全数字確認用プリセットを適用 */
  applyDigitPreset: (preset: 1 | 2) => void;
  /** 各段のオーバーライドをクリア */
  clearRowOverrides: () => void;
  /** いずれかの段がオーバーライド中かどうか */
  hasRowOverrides: boolean;
}

const EMPTY_ROW: BoardRowOverride = { departureTime: '', destination: '', cars: '' };

export function checkIsDebugMode(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  if (!params.has('debug')) return false;
  const val = (params.get('debug') || '').toLowerCase();
  return val !== '0' && val !== 'false';
}

const DebugContext = createContext<DebugContextValue | null>(null);

export const DebugProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDebugMode, setIsDebugMode] = useState<boolean>(() => checkIsDebugMode());
  const [isHeaderPanelOpen, setIsHeaderPanelOpen] = useState<boolean>(false);
  const [isSheetPanelOpen, setIsSheetPanelOpen] = useState<boolean>(true);

  const [realNow, setRealNow] = useState<Date>(() => new Date());
  const [overrideMinutes, setOverrideMinutesState] = useState<number | null>(null);
  const [overrideDate, setOverrideDateState] = useState<string | null>(null); // 'YYYY-MM-DD'

  const [rowOverrides, setRowOverrides] = useState<
    [BoardRowOverride, BoardRowOverride, BoardRowOverride]
  >([{ ...EMPTY_ROW }, { ...EMPTY_ROW }, { ...EMPTY_ROW }]);

  // URLパラメータの動的変化（ブラウザ履歴・リンク変更）を監視
  useEffect(() => {
    const handleUrlChange = () => {
      setIsDebugMode(checkIsDebugMode());
    };
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  // 実時刻の1秒毎の更新タイマー
  useEffect(() => {
    const timer = setInterval(() => {
      setRealNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const now = useMemo(() => {
    if (!isDebugMode || (overrideMinutes === null && overrideDate === null)) {
      return realNow;
    }
    const d = new Date(realNow);

    // 日付の上書き (YYYY-MM-DD)
    if (overrideDate) {
      const parts = overrideDate.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(day)) {
        d.setFullYear(y, m - 1, day);
      }
    }

    // 時刻の上書き (0〜1439分)
    if (overrideMinutes !== null) {
      const normalized = ((overrideMinutes % 1440) + 1440) % 1440;
      const h = Math.floor(normalized / 60);
      const m = normalized % 60;
      d.setHours(h, m, 0, 0);
    }

    return d;
  }, [isDebugMode, overrideMinutes, overrideDate, realNow]);

  const effectiveMinutes = useMemo(() => {
    return now.getHours() * 60 + now.getMinutes();
  }, [now]);

  const setOverrideMinutes = useCallback((minutes: number | null) => {
    if (minutes === null) {
      setOverrideMinutesState(null);
    } else {
      const normalized = ((Math.round(minutes) % 1440) + 1440) % 1440;
      setOverrideMinutesState(normalized);
    }
  }, []);

  const setOverrideTimeString = useCallback((timeStr: string) => {
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return;
    const h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    if (h >= 0 && h < 24 && m >= 0 && m < 60) {
      setOverrideMinutesState(h * 60 + m);
    }
  }, []);

  const adjustTimeMinutes = useCallback(
    (deltaMinutes: number) => {
      setOverrideMinutesState((prev) => {
        const base = prev !== null ? prev : realNow.getHours() * 60 + realNow.getMinutes();
        return (((base + deltaMinutes) % 1440) + 1440) % 1440;
      });
    },
    [realNow]
  );

  const setOverrideDateString = useCallback((dateStr: string | null) => {
    if (!dateStr || dateStr.trim() === '') {
      setOverrideDateState(null);
    } else {
      const match = dateStr.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (match) {
        const y = match[1];
        const m = match[2].padStart(2, '0');
        const day = match[3].padStart(2, '0');
        setOverrideDateState(`${y}-${m}-${day}`);
      }
    }
  }, []);

  const adjustDateDays = useCallback(
    (deltaDays: number) => {
      setOverrideDateState((prev) => {
        let base: Date;
        if (prev) {
          const parts = prev.split('-');
          base = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        } else {
          base = new Date(realNow);
        }
        base.setDate(base.getDate() + deltaDays);
        const y = base.getFullYear();
        const m = String(base.getMonth() + 1).padStart(2, '0');
        const day = String(base.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      });
    },
    [realNow]
  );

  const resetTime = useCallback(() => {
    setOverrideMinutesState(null);
  }, []);

  const resetDate = useCallback(() => {
    setOverrideDateState(null);
  }, []);

  const resetAll = useCallback(() => {
    setOverrideMinutesState(null);
    setOverrideDateState(null);
  }, []);

  const setRowOverride = useCallback((index: 0 | 1 | 2, patch: Partial<BoardRowOverride>) => {
    setRowOverrides((prev) => {
      const next: [BoardRowOverride, BoardRowOverride, BoardRowOverride] = [
        { ...prev[0] },
        { ...prev[1] },
        { ...prev[2] },
      ];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }, []);

  const applyDigitPreset = useCallback((preset: 1 | 2) => {
    if (preset === 1) {
      setRowOverrides((prev) => [
        { ...prev[0], departureTime: '12:34' },
        { ...prev[1], departureTime: '56:78' },
        { ...prev[2], departureTime: '90:12' },
      ]);
    } else {
      setRowOverrides((prev) => [
        { ...prev[0], departureTime: '90:12' },
        { ...prev[1], departureTime: ' 3:45' },
        { ...prev[2], departureTime: ' 6:78' },
      ]);
    }
  }, []);

  const clearRowOverrides = useCallback(() => {
    setRowOverrides([{ ...EMPTY_ROW }, { ...EMPTY_ROW }, { ...EMPTY_ROW }]);
  }, []);

  const hasRowOverrides = useMemo(() => {
    if (!isDebugMode) return false;
    return rowOverrides.some(
      (r) =>
        r.departureTime.trim().length > 0 ||
        r.destination.trim().length > 0 ||
        r.cars.trim().length > 0
    );
  }, [isDebugMode, rowOverrides]);

  const value = useMemo<DebugContextValue>(
    () => ({
      isDebugMode,
      isHeaderPanelOpen,
      setIsHeaderPanelOpen,
      isSheetPanelOpen,
      setIsSheetPanelOpen,
      now,
      isTimeOverridden: isDebugMode && (overrideMinutes !== null || overrideDate !== null),
      isDateOverridden: isDebugMode && overrideDate !== null,
      overrideDateString: overrideDate,
      effectiveMinutes,
      setOverrideMinutes,
      setOverrideTimeString,
      adjustTimeMinutes,
      setOverrideDateString,
      adjustDateDays,
      resetTime,
      resetDate,
      resetAll,
      rowOverrides,
      setRowOverride,
      applyDigitPreset,
      clearRowOverrides,
      hasRowOverrides,
    }),
    [
      isDebugMode,
      isHeaderPanelOpen,
      isSheetPanelOpen,
      now,
      overrideMinutes,
      overrideDate,
      effectiveMinutes,
      setOverrideMinutes,
      setOverrideTimeString,
      adjustTimeMinutes,
      setOverrideDateString,
      adjustDateDays,
      resetTime,
      resetDate,
      resetAll,
      rowOverrides,
      setRowOverride,
      applyDigitPreset,
      clearRowOverrides,
      hasRowOverrides,
    ]
  );

  return <DebugContext.Provider value={value}>{children}</DebugContext.Provider>;
};

export function useDebug(): DebugContextValue {
  const ctx = useContext(DebugContext);
  if (!ctx) {
    throw new Error('useDebug must be used within a DebugProvider');
  }
  return ctx;
}
