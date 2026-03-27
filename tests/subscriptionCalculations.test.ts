import { describe, it, expect } from 'vitest';
import type { Subscription } from '../shared/schema';

// Helper function to calculate potential savings
function calculatePotentialSavings(subscriptions: Subscription[]): number {
  return subscriptions
    .filter(s => s.status === 'unused' || s.status === 'to-cancel')
    .reduce((sum: number, s: Subscription) => {
      const amount = typeof s.amount === 'number' ? s.amount : parseFloat(s.amount as any);
      const frequency = s.frequency || 'monthly';
      
      let monthlyAmount = amount;
      if (frequency === 'yearly') {
        monthlyAmount = amount / 12;
      } else if (frequency === 'quarterly') {
        monthlyAmount = amount / 3;
      } else if (frequency === 'weekly') {
        monthlyAmount = (amount * 52) / 12;
      }
      
      return sum + monthlyAmount;
    }, 0);
}

// Helper function to count subscriptions by status
function countSubscriptionsByStatus(subscriptions: Subscription[], status: string): number {
  return subscriptions.filter(s => s.status === status).length;
}

describe('Subscription Calculations', () => {
  describe('calculatePotentialSavings', () => {
    it('should calculate savings for unused subscriptions', () => {
      const subs: Subscription[] = [
        {
          id: '1',
          name: 'Netflix',
          status: 'unused',
          amount: 15.99,
          frequency: 'monthly',
          category: 'streaming',
          nextBillingDate: '2026-04-05',
          currency: 'USD',
          userId: 'user1',
        } as any,
      ];

      const savings = calculatePotentialSavings(subs);
      expect(savings).toBeCloseTo(15.99, 2);
    });

    it('should calculate savings for to-cancel subscriptions', () => {
      const subs: Subscription[] = [
        {
          id: '1',
          name: 'Spotify',
          status: 'to-cancel',
          amount: 10.99,
          frequency: 'monthly',
          category: 'streaming',
          nextBillingDate: '2026-04-05',
          currency: 'USD',
          userId: 'user1',
        } as any,
      ];

      const savings = calculatePotentialSavings(subs);
      expect(savings).toBeCloseTo(10.99, 2);
    });

    it('should exclude active subscriptions from savings', () => {
      const subs: Subscription[] = [
        {
          id: '1',
          name: 'Netflix',
          status: 'active',
          amount: 15.99,
          frequency: 'monthly',
          category: 'streaming',
          nextBillingDate: '2026-04-05',
          currency: 'USD',
          userId: 'user1',
        } as any,
      ];

      const savings = calculatePotentialSavings(subs);
      expect(savings).toBe(0);
    });

    it('should exclude deleted subscriptions from savings', () => {
      const subs: Subscription[] = [
        {
          id: '1',
          name: 'Netflix',
          status: 'deleted',
          amount: 15.99,
          frequency: 'monthly',
          category: 'streaming',
          nextBillingDate: '2026-04-05',
          currency: 'USD',
          userId: 'user1',
        } as any,
      ];

      const savings = calculatePotentialSavings(subs);
      expect(savings).toBe(0);
    });

    it('should sum multiple unused subscriptions', () => {
      const subs: Subscription[] = [
        {
          id: '1',
          name: 'Netflix',
          status: 'unused',
          amount: 15.99,
          frequency: 'monthly',
          category: 'streaming',
          nextBillingDate: '2026-04-05',
          currency: 'USD',
          userId: 'user1',
        } as any,
        {
          id: '2',
          name: 'Spotify',
          status: 'unused',
          amount: 10.99,
          frequency: 'monthly',
          category: 'streaming',
          nextBillingDate: '2026-04-05',
          currency: 'USD',
          userId: 'user1',
        } as any,
      ];

      const savings = calculatePotentialSavings(subs);
      expect(savings).toBeCloseTo(26.98, 2);
    });

    it('should handle yearly billing frequency', () => {
      const subs: Subscription[] = [
        {
          id: '1',
          name: 'Adobe',
          status: 'unused',
          amount: 119.88,
          frequency: 'yearly',
          category: 'software',
          nextBillingDate: '2026-04-05',
          currency: 'USD',
          userId: 'user1',
        } as any,
      ];

      const savings = calculatePotentialSavings(subs);
      expect(savings).toBeCloseTo(9.99, 2);
    });

    it('should handle empty subscription list', () => {
      const savings = calculatePotentialSavings([]);
      expect(savings).toBe(0);
    });

    it('should handle zero amount subscriptions', () => {
      const subs: Subscription[] = [
        {
          id: '1',
          name: 'Free Tier',
          status: 'unused',
          amount: 0,
          frequency: 'monthly',
          category: 'streaming',
          nextBillingDate: '2026-04-05',
          currency: 'USD',
          userId: 'user1',
        } as any,
      ];

      const savings = calculatePotentialSavings(subs);
      expect(savings).toBe(0);
    });

    it('should handle negative amounts gracefully', () => {
      const subs: Subscription[] = [
        {
          id: '1',
          name: 'Refund',
          status: 'to-cancel',
          amount: -5.99,
          frequency: 'monthly',
          category: 'other',
          nextBillingDate: '2026-04-05',
          currency: 'USD',
          userId: 'user1',
        } as any,
      ];

      const savings = calculatePotentialSavings(subs);
      expect(savings).toBeLessThan(0);
    });
  });

  describe('countSubscriptionsByStatus', () => {
    it('should count active subscriptions', () => {
      const subs: Subscription[] = [
        {
          id: '1',
          name: 'Netflix',
          status: 'active',
          amount: 15.99,
          frequency: 'monthly',
          category: 'streaming',
          nextBillingDate: '2026-04-05',
          currency: 'USD',
          userId: 'user1',
        } as any,
        {
          id: '2',
          name: 'Spotify',
          status: 'active',
          amount: 10.99,
          frequency: 'monthly',
          category: 'streaming',
          nextBillingDate: '2026-04-05',
          currency: 'USD',
          userId: 'user1',
        } as any,
      ];

      const count = countSubscriptionsByStatus(subs, 'active');
      expect(count).toBe(2);
    });

    it('should count unused subscriptions', () => {
      const subs: Subscription[] = [
        {
          id: '1',
          name: 'HBO Max',
          status: 'unused',
          amount: 15.99,
          frequency: 'monthly',
          category: 'streaming',
          nextBillingDate: '2026-04-05',
          currency: 'USD',
          userId: 'user1',
        } as any,
      ];

      const count = countSubscriptionsByStatus(subs, 'unused');
      expect(count).toBe(1);
    });

    it('should return 0 for status with no matches', () => {
      const subs: Subscription[] = [
        {
          id: '1',
          name: 'Netflix',
          status: 'active',
          amount: 15.99,
          frequency: 'monthly',
          category: 'streaming',
          nextBillingDate: '2026-04-05',
          currency: 'USD',
          userId: 'user1',
        } as any,
      ];

      const count = countSubscriptionsByStatus(subs, 'deleted');
      expect(count).toBe(0);
    });

    it('should handle empty list', () => {
      const count = countSubscriptionsByStatus([], 'active');
      expect(count).toBe(0);
    });
  });
});
