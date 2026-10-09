export interface ZonedDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export function isValidTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || value.trim() === "") return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(0);
    return true;
  } catch {
    return false;
  }
}

export function getZonedDateParts(date: Date, timeZone: string): ZonedDateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

export function getZonedMonthKey(date: Date, timeZone: string): string {
  const { year, month } = getZonedDateParts(date, timeZone);
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function getZonedMonthKeyForDate(
  value: string | Date | null | undefined,
  timeZone: string,
): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : getZonedMonthKey(value, timeZone);
  }

  const dateValue = value.trim();
  const dateOnlyMonth = dateValue.match(/^(\d{4}-\d{2})-\d{2}$/)?.[1];
  if (dateOnlyMonth) return dateOnlyMonth;

  const parsed = new Date(dateValue);
  return Number.isNaN(parsed.getTime()) ? null : getZonedMonthKey(parsed, timeZone);
}

export function getZonedDateString(date: Date, timeZone: string): string {
  const { year, month, day } = getZonedDateParts(date, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function getZonedLocalDateTime(
  year: number,
  monthIndex: number,
  day: number,
  timeZone: string,
  hour = 0,
  minute = 0,
  second = 0,
): Date {
  const targetWallTime = Date.UTC(year, monthIndex, day, hour, minute, second);
  let timestamp = targetWallTime;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = getZonedDateParts(new Date(timestamp), timeZone);
    const representedWallTime = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    const correction = targetWallTime - representedWallTime;
    timestamp += correction;
    if (correction === 0) break;
  }

  return new Date(timestamp);
}

export function getZonedMonthBounds(date: Date, timeZone: string) {
  const { year, month, day } = getZonedDateParts(date, timeZone);
  const monthIndex = month - 1;
  return {
    monthStart: getZonedLocalDateTime(year, monthIndex, 1, timeZone),
    nextMonthStart: getZonedLocalDateTime(year, monthIndex + 1, 1, timeZone),
    todayStart: getZonedLocalDateTime(year, monthIndex, day, timeZone),
    monthKey: `${year}-${String(month).padStart(2, "0")}`,
  };
}

export function getZonedTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const parts = getZonedDateParts(date, timeZone);
  const zonedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return Math.round((date.getTime() - zonedAsUtc) / 60_000);
}