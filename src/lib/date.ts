import { ceremony } from '../data/wedding';

const tz = ceremony.timeZone;

const formatter = new Intl.DateTimeFormat('ko-KR', {
  timeZone: tz,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  weekday: 'long',
  hour: 'numeric',
  minute: 'numeric',
  hour12: false,
});

const parts = (iso: string) => {
  const f = formatter.formatToParts(new Date(iso));
  const get = (t: Intl.DateTimeFormatPartTypes) => f.find((p) => p.type === t)?.value ?? '';
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    weekday: get('weekday'),
    hour: Number(get('hour')) % 24,
    minute: Number(get('minute')),
  };
};

export const when = parts(ceremony.start);

/** 12시 30분 → '낮 12시 30분', 14시 → '오후 2시' */
export function koreanTime(hour: number, minute: number): string {
  const period = hour < 12 ? '오전' : hour === 12 ? '낮' : hour < 18 ? '오후' : '저녁';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return minute === 0 ? `${period} ${h12}시` : `${period} ${h12}시 ${minute}분`;
}

export const dateLine = `${when.year}년 ${when.month}월 ${when.day}일 ${when.weekday}`;
export const timeLine = koreanTime(when.hour, when.minute);

/** 해당 월의 달력 셀 (일요일 시작). null은 빈 칸 */
export function monthGrid(year: number, month: number): (number | null)[] {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (number | null)[] = Array.from({ length: first }, () => null);
  for (let d = 1; d <= days; d += 1) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** 예식까지 남은 날 (당일 0, 지났으면 음수) — KST 기준 날짜 차이 */
export function daysUntil(): number {
  const todayParts = parts(new Date().toISOString());
  const a = Date.UTC(todayParts.year, todayParts.month - 1, todayParts.day);
  const b = Date.UTC(when.year, when.month - 1, when.day);
  return Math.round((b - a) / 86400000);
}

/**
 * D-day 문구: [강조 텍스트, 뒤 문구].
 * KST 달력 날짜 기준이므로 예식 전날 오후에도 '오늘'이 되지 않습니다.
 */
export function ddayPhrase(): [string, string] {
  const d = daysUntil();
  if (d > 0) return [`${d}일`, ' 남았습니다.'];
  if (d === 0) return ['오늘', '입니다.'];
  return ['', ' 잘 마무리되었습니다. 함께해 주셔서 감사합니다.'];
}
