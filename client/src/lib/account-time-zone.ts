import { getZonedDateParts, getZonedMonthBounds, isValidTimeZone } from "@shared/month-boundary";

const TIME_ZONE_STORAGE_KEY = "subveris.account-time-zone";

export function getDetectedTimeZone(): string {
  const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return isValidTimeZone(detected) ? detected : "UTC";
}

export function getAccountTimeZone(): string {
  if (typeof localStorage !== "undefined") {
    const stored = localStorage.getItem(TIME_ZONE_STORAGE_KEY);
    if (isValidTimeZone(stored)) return stored;
  }
  return getDetectedTimeZone();
}

export function storeAccountTimeZone(timeZone: string): void {
  if (!isValidTimeZone(timeZone) || typeof localStorage === "undefined") return;
  localStorage.setItem(TIME_ZONE_STORAGE_KEY, timeZone);
}

export function getAccountMonthKey(date = new Date(), timeZone = getAccountTimeZone()): string {
  const { year, month } = getZonedDateParts(date, timeZone);
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function getAccountMonthBounds(date = new Date(), timeZone = getAccountTimeZone()) {
  return getZonedMonthBounds(date, timeZone);
}