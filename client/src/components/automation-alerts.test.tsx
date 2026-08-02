import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AutomationAlerts } from './automation-alerts';
import type { Subscription } from '@shared/schema';

describe('AutomationAlerts', () => {
  it('renders the autopilot banner and triggers cancellation for zero-usage subscriptions', () => {
    const onCancelSubscription = vi.fn();
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
        isFreeTier={true}
        zeroUsageSubscriptions={[subscription]}
        onCancelSubscription={onCancelSubscription}
        isCancelling={false}
        cancellingSubscriptionId={null}
      />
    );

    expect(screen.getByText(/Autopilot locked/i)).toBeInTheDocument();
    expect(screen.getByText('Zero-usage alert')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onCancelSubscription).toHaveBeenCalledWith('sub-1');
  });
});
