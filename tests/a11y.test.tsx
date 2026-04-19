import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import '@testing-library/jest-dom';
expect.extend(toHaveNoViolations);

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<any>('@tanstack/react-query');
  return {
    ...actual,
    useQuery: ({ queryKey }: any) => ({ data: [], isLoading: false, error: null }),
    useMutation: ({ onSuccess }: any) => ({
      mutate: (arg: any) => {
        if (onSuccess) onSuccess(arg);
      },
      isPending: false,
    }),
  };
});

vi.mock('@/lib/currency-context', () => ({
  useCurrency: () => ({ formatAmount: (n: number) => `$${n.toFixed(2)}` }),
}));

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ user: { id: 'owner-1' } }),
}));

import { FamilySharing } from '../client/src/components/family-sharing';

describe('Accessibility', () => {
  it('FamilySharing has no a11y violations', async () => {
    const { container } = render(<FamilySharing />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
