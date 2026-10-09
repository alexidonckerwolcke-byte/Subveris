import { getAccountTimeZone, getAccountMonthBounds, getAccountMonthKey } from "./account-time-zone";
import { getZonedMonthBounds, getZonedTimeZoneOffsetMinutes, getZonedDateString } from "@shared/month-boundary";
import { isSubscriptionDeleted } from "./utils";

export function getLocalMonthKey(date = new Date(), timeZone = getAccountTimeZone()): string {
  return getAccountMonthKey(date, timeZone);
}

export function getLocalMonthBounds(date = new Date(), timeZone = getAccountTimeZone()) {
  return getAccountMonthBounds(date, timeZone);
}

export function getLocalDateQueryParams(date = new Date(), timeZone = getAccountTimeZone()): string {
  const localDate = getZonedDateString(date, timeZone);
  const monthBounds = getZonedMonthBounds(date, timeZone);
  return [
    `localDate=${encodeURIComponent(localDate)}`,
    `offsetMinutes=${encodeURIComponent(String(getZonedTimeZoneOffsetMinutes(date, timeZone)))}`,
    `monthStartOffsetMinutes=${encodeURIComponent(String(getZonedTimeZoneOffsetMinutes(monthBounds.monthStart, timeZone)))}`,
    `nextMonthOffsetMinutes=${encodeURIComponent(String(getZonedTimeZoneOffsetMinutes(monthBounds.nextMonthStart, timeZone)))}`,
    `timeZone=${encodeURIComponent(timeZone)}`,
  ].join("&");
}

export function isSubscriptionSavingsEventInCurrentMonth(
  subscription: any,
  now = new Date(),
  timeZone = getAccountTimeZone(),
): boolean {
  if (!isSubscriptionDeleted(subscription)) return false;

  const timestamp = subscription.deleted_at || subscription.deletedAt ||
    subscription.cancellation_confirmed_at || subscription.cancellationConfirmedAt ||
    subscription.canceled_at || subscription.canceledAt;
  if (!timestamp) return false;

  const eventDate = new Date(timestamp);
  if (Number.isNaN(eventDate.getTime())) return false;

  const { monthStart, nextMonthStart } = getZonedMonthBounds(now, timeZone);
  return eventDate >= monthStart && eventDate < nextMonthStart;
}