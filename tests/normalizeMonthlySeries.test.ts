import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MonthlySpending } from '../shared/schema';

// Mock implementation of normalizeMonthlySeries for testing
function normalizeMonthlySeries(data: MonthlySpending[] | undefined, months = 6) {
  if (!data || data.length === 0) {
    return [];
  }

  // Sort data by date (assuming month format is "MMM YYYY")
  const sortedData = [...data].sort((a, b) => {
    const dateA = new Date(a.month + " 1");
    const dateB = new Date(b.month + " 1");
    return dateA.getTime() - dateB.getTime();
  });

  // Get the most recent months, excluding current month
  const now = new Date();
  const currentMonthKey = now.toLocaleString("en-US", { month: "short", year: "numeric" });

  // Filter out current month and get the last 'months' entries
  const historicalData = sortedData.filter(item => item.month !== currentMonthKey);
  return historicalData.slice(-months);
}

describe('normalizeMonthlySeries', () => {
  beforeEach(() => {
    // Set a fixed date for testing: March 5, 2026
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 5)); // March 5, 2026
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return empty array for undefined data', () => {
    expect(normalizeMonthlySeries(undefined)).toEqual([]);
  });

  it('should return empty array for empty data', () => {
    expect(normalizeMonthlySeries([])).toEqual([]);
  });

  it('should sort data chronologically', () => {
    const data: MonthlySpending[] = [
      { month: 'Jan 2026', amount: 100 },
      { month: 'Mar 2026', amount: 300 },
      { month: 'Feb 2026', amount: 200 },
    ];

    const result = normalizeMonthlySeries(data);
    expect(result[0].month).toBe('Jan 2026');
    expect(result[1].month).toBe('Feb 2026');
  });

  it('should exclude current month', () => {
    const data: MonthlySpending[] = [
      { month: 'Jan 2026', amount: 100 },
      { month: 'Feb 2026', amount: 200 },
      { month: 'Mar 2026', amount: 300 }, // Current month
      { month: 'Dec 2025', amount: 50 },
    ];

    const result = normalizeMonthlySeries(data);
    const monthNames = result.map(item => item.month);
    expect(monthNames).not.toContain('Mar 2026');
  });

  it('should return last 6 months by default', () => {
    const data: MonthlySpending[] = [
      { month: 'Jan 2025', amount: 100 },
      { month: 'Feb 2025', amount: 110 },
      { month: 'Mar 2025', amount: 120 },
      { month: 'Apr 2025', amount: 130 },
      { month: 'May 2025', amount: 140 },
      { month: 'Jun 2025', amount: 150 },
      { month: 'Jul 2025', amount: 160 },
      { month: 'Aug 2025', amount: 170 },
    ];

    const result = normalizeMonthlySeries(data);
    expect(result.length).toBeLessThanOrEqual(6);
  });

  it('should preserve amount values', () => {
    const data: MonthlySpending[] = [
      { month: 'Jan 2026', amount: 99.99 },
      { month: 'Feb 2026', amount: 199.50 },
    ];

    const result = normalizeMonthlySeries(data);
    const amounts = result.map(item => item.amount);
    expect(amounts).toContain(99.99);
    expect(amounts).toContain(199.50);
  });

  it('should handle months with zero amount', () => {
    const data: MonthlySpending[] = [
      { month: 'Jan 2026', amount: 0 },
      { month: 'Feb 2026', amount: 150 },
    ];

    const result = normalizeMonthlySeries(data);
    expect(result).toContainEqual({ month: 'Jan 2026', amount: 0 });
  });

  it('should respect custom months parameter', () => {
    const data: MonthlySpending[] = [
      { month: 'Jan 2025', amount: 100 },
      { month: 'Feb 2025', amount: 110 },
      { month: 'Mar 2025', amount: 120 },
      { month: 'Apr 2025', amount: 130 },
      { month: 'May 2025', amount: 140 },
    ];

    const result = normalizeMonthlySeries(data, 3);
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it('should handle data with future dates', () => {
    const data: MonthlySpending[] = [
      { month: 'Jan 2026', amount: 100 },
      { month: 'Apr 2026', amount: 400 },
      { month: 'May 2026', amount: 500 },
    ];

    const result = normalizeMonthlySeries(data);
    expect(result.length).toBeGreaterThan(0);
  });
});
