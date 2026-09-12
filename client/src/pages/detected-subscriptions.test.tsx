import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DetectedSubscriptions from './detected-subscriptions';
import { apiRequest } from '@/lib/queryClient';
import { generateRecommendationsFromSubscriptions } from '@/lib/recommendations';

vi.mock('@/components/premium-gate', () => ({
  PremiumGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/lib/currency-context', () => ({
  useCurrency: () => ({ formatAmount: (value: number) => `$${value.toFixed(2)}` }),
}));

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@/lib/subscription-context', () => ({
  useSubscription: () => ({ limits: {} }),
}));

vi.mock('@/hooks/use-family-data', () => ({
  useFamilyDataMode: () => ({ familyGroupId: null, showFamilyData: false }),
}));

vi.mock('@/lib/family-data', () => ({
  getVisibleFamilySubscriptions: (familyData: any) => familyData ?? [],
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/detected-subscriptions', vi.fn()],
}));

vi.mock('@/lib/queryClient', async () => {
  const actual = await vi.importActual<typeof import('@/lib/queryClient')>('@/lib/queryClient');
  return {
    ...actual,
    apiRequest: vi.fn(),
  };
});

describe('DetectedSubscriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hides a detection after approving it and keeps it hidden on stale refetches', async () => {
    const mockApiRequest = vi.mocked(apiRequest);
    let fetchCount = 0;

    mockApiRequest.mockImplementation(async (method: string, url: string) => {
      if (method === 'GET' && url === '/api/subscriptions') {
        fetchCount += 1;
        return {
          ok: true,
          json: async () => [
            {
              id: 'sub-1',
              name: 'Netflix',
              category: 'streaming',
              amount: 15.99,
              frequency: 'monthly',
              isDetected: fetchCount <= 2,
              status: 'active',
            },
          ],
        } as Response;
      }

      if (method === 'PATCH' && url === '/api/subscriptions/sub-1') {
        return {
          ok: true,
          json: async () => ({ id: 'sub-1', isDetected: false, status: 'active' }),
        } as Response;
      }

      return {
        ok: true,
        json: async () => [],
      } as Response;
    });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <DetectedSubscriptions />
      </QueryClientProvider>
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Approve' }));

    await waitFor(() => {
      expect(screen.queryByText('Netflix')).not.toBeInTheDocument();
    });
  });

  it('excludes pending detected subscriptions from AI recommendations', () => {
    const recommendations = generateRecommendationsFromSubscriptions([
      {
        id: 'sub-detected',
        name: 'Netflix',
        category: 'streaming',
        amount: 15.99,
        frequency: 'monthly',
        status: 'unused',
        isDetected: true,
      },
      {
        id: 'sub-approved',
        name: 'Spotify',
        category: 'music',
        amount: 10.99,
        frequency: 'monthly',
        status: 'unused',
        isDetected: false,
      },
    ]);

    expect(recommendations.map((row) => row.subscriptionId)).toEqual(['sub-approved']);
  });

});
