/**
 * 運行カレンダー・休日判定ユーティリティ
 * 
 * JR東日本および仙台空港アクセス線のダイヤ運行基準:
 * 「土曜日・日曜日・祝日（振替休日・国民の休日を含む）、および12月30日〜1月3日」
 * は土休日ダイヤ（平日専用列車は運休）となります。
 */

/** 春分の日を計算 */
function getVernalEquinoxDay(year: number): number {
  if (year < 1980 || year > 2099) return 20;
  return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

/** 秋分の日を計算 */
function getAutumnalEquinoxDay(year: number): number {
  if (year < 1980 || year > 2099) return 23;
  return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

/** 第n月曜日の日付を算出 (monthは1〜12) */
function getNthMonday(year: number, month: number, nth: number): number {
  const firstDay = new Date(year, month - 1, 1).getDay();
  // 月曜日(1)までのオフセット
  const offset = (1 - firstDay + 7) % 7;
  return 1 + offset + (nth - 1) * 7;
}

/** 指定年における祝日の一覧（"YYYY-MM-DD" の Set）を生成 */
export function getHolidaysSet(year: number): Set<string> {
  const holidayDates = new Set<string>();

  const addDate = (m: number, d: number) => {
    const mm = String(m).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    holidayDates.add(`${year}-${mm}-${dd}`);
  };

  // 1. 固定祝日
  addDate(1, 1);   // 元日
  addDate(2, 11);  // 建国記念の日
  addDate(2, 23);  // 天皇誕生日
  addDate(4, 29);  // 昭和の日
  addDate(5, 3);   // 憲法記念日
  addDate(5, 4);   // みどりの日
  addDate(5, 5);   // こどもの日
  addDate(8, 11);  // 山の日
  addDate(11, 3);  // 文化の日
  addDate(11, 23); // 勤労感謝の日

  // 2. ハッピーマンデー祝日
  addDate(1, getNthMonday(year, 1, 2));   // 成人の日 (1月第2月曜)
  addDate(7, getNthMonday(year, 7, 3));   // 海の日 (7月第3月曜)
  addDate(9, getNthMonday(year, 9, 3));   // 敬老の日 (9月第3月曜)
  addDate(10, getNthMonday(year, 10, 2)); // スポーツの日 (10月第2月曜)

  // 3. 春分の日・秋分の日
  addDate(3, getVernalEquinoxDay(year));
  addDate(9, getAutumnalEquinoxDay(year));

  // 4. 振替休日判定（祝日が日曜の場合、翌平日が振替休日）
  const sortedDates = Array.from(holidayDates).sort();
  for (const dateStr of sortedDates) {
    const d = new Date(dateStr + 'T00:00:00');
    if (d.getDay() === 0) { // 日曜日
      let cur = new Date(d);
      while (true) {
        cur.setDate(cur.getDate() + 1);
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const dt = String(cur.getDate()).padStart(2, '0');
        const key = `${y}-${m}-${dt}`;
        if (!holidayDates.has(key)) {
          holidayDates.add(key);
          break;
        }
      }
    }
  }

  // 5. 国民の休日判定（祝日と祝日に挟まれた平日）
  const allHolidays = Array.from(holidayDates).sort();
  for (let i = 0; i < allHolidays.length - 1; i++) {
    const d1 = new Date(allHolidays[i] + 'T00:00:00');
    const d2 = new Date(allHolidays[i + 1] + 'T00:00:00');
    const diffDays = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 2) {
      const mid = new Date(d1);
      mid.setDate(mid.getDate() + 1);
      if (mid.getDay() !== 0) {
        const y = mid.getFullYear();
        const m = String(mid.getMonth() + 1).padStart(2, '0');
        const dt = String(mid.getDate()).padStart(2, '0');
        holidayDates.add(`${y}-${m}-${dt}`);
      }
    }
  }

  return holidayDates;
}

const holidayCache = new Map<number, Set<string>>();

/**
 * 指定された日付が「土曜・休日・12月30日〜1月3日（運休対象日）」かどうか判定
 */
export function isWeekendHolidayOrYearEnd(date: Date): boolean {
  const dayOfWeek = date.getDay();
  // 土曜日 (6) または 日曜日 (0)
  if (dayOfWeek === 0 || dayOfWeek === 6) return true;

  const month = date.getMonth() + 1; // 1〜12
  const day = date.getDate();

  // 年末年始: 12月30日〜1月3日
  if (month === 12 && day >= 30) return true;
  if (month === 1 && day <= 3) return true;

  // 国民の祝日・振替休日判定
  const year = date.getFullYear();
  let holidays = holidayCache.get(year);
  if (!holidays) {
    holidays = getHolidaysSet(year);
    holidayCache.set(year, holidays);
  }

  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return holidays.has(`${year}-${mm}-${dd}`);
}

/**
 * 列車が本日運行されるかどうかを判定
 * `train.calendar === 'weekday'` の場合、土曜・休日・12/30〜1/3は運休（false）
 */
export function isTrainRunningToday(calendar?: 'weekday' | 'all' | 'holiday', date = new Date()): boolean {
  if (calendar === 'weekday') {
    return !isWeekendHolidayOrYearEnd(date);
  }
  return true;
}
