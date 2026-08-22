import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AutomationAlerts } from './automation-alerts';
import type { Subscription } from '@shared/schema';

describe('AutomationAlerts', () => {
  it('links zero-usage subscriptions to the Subveris cancellation guide', () => {
    const subscription = {
      id: 'sub-1',
      userId: 'user-1',
      name: 'Netflix',
      category: 'streaming',
      amount: 15.99,
      currency: 'USD',
      frequency: 'monthly',
      nextBillingDate: '2025-09-01',
      status: 'active',
      usageCount: 0,
      monthlyUsageCount: 0,
      isDetected: true,
      isZeroUsageFlag: true,
    } as Subscription;

    render(
      <AutomationAlerts
        zeroUsageSubscriptions={[subscription]}
      />
    );

    expect(screen.getByText('Zero-usage alert')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view guide/i })).toHaveAttribute('href', '/cancel-netflix');
  });
});
