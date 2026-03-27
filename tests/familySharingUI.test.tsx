// a DOM environment is required for rendering components
/**
 * @vitest-environment jsdom
 */

import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// create a map that our mocked useQuery will read from
const mockQueryData: Record<string, any> = {};

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<any>('@tanstack/react-query');
  return {
    ...actual,
    useQuery: ({ queryKey, enabled }: any) => {
      const key = JSON.stringify(queryKey);
      return { data: mockQueryData[key], isLoading: false, error: null };
    },
    useMutation: ({ onSuccess, onError }: any) => {
      // simple stub that immediately calls onSuccess when mutate is invoked
      return {
        mutate: (arg: any) => {
          if (onSuccess) onSuccess(arg);
        },
        isPending: false,
      };
    },
  };
});

// we'll need to assert that certain mutations trigger toasts later in
// the tests, so keep a reference to the mock function here.
const toastMock = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/lib/currency-context', () => ({
  useCurrency: () => ({ formatAmount: (n: number) => `$${n.toFixed(2)}` }),
}));

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ user: { id: 'owner-1' } }),
}));

// import after the mocks are defined
import { FamilySharing } from '../client/src/components/family-sharing';

// helper to reset mocks before each test
beforeEach(() => {
  for (const k of Object.keys(mockQueryData)) {
    delete mockQueryData[k];
  }
});

describe('FamilySharing UI', () => {
  it('shows empty state when no groups exist', async () => {
    // no groups in mock data
    mockQueryData[JSON.stringify(['/api/family-groups'])] = [];

    render(<FamilySharing />);

    await expect(screen.findByText(/No family groups yet/i)).resolves.toBeInTheDocument();
  });

  it('lists existing groups and highlights selection', async () => {
    const groups = [
      { id: 'g1', name: 'Test Group', ownerId: 'owner-1', memberCount: 2 },
    ];
    mockQueryData[JSON.stringify(['/api/family-groups'])] = groups;

    render(<FamilySharing />);

    // group name should be visible
    expect(await screen.findByText('Test Group')).toBeInTheDocument();

    // click the group text itself; the click will bubble up to the
    // container that actually handles the onClick handler.  this is much
    // more reliable than walking parentElement chains in a jsdom tree.
    const groupEl = screen.getByText('Test Group');
    fireEvent.click(groupEl);

    // after the state update the members panel should render.  we
    // anchor the regex to avoid matching the explanatory note below the
    // header which also includes the words "family members".
    await screen.findByText(/^Family Members$/i);
  });

  it('does not show sharing controls to a non-owner', async () => {
    // make a group owned by someone else so `isOwner` is false
    mockQueryData[JSON.stringify(['/api/family-groups'])] = [
      { id: 'g2', name: 'Other Group', ownerId: 'someone-else', memberCount: 1 },
    ];
    render(<FamilySharing />);

    const grp = await screen.findByText('Other Group');
    fireEvent.click(grp);
    await screen.findByText(/^Family Members$/i);
    expect(screen.queryByText(/Share subscriptions/i)).not.toBeInTheDocument();
  });

  it('filters available subscriptions correctly in the UI', async () => {
    // simulate one subscription owned and one already shared
    mockQueryData[JSON.stringify(['/api/subscriptions'])] = [
      { id: 'sub1', status: 'active', name: 'sub1' },
      { id: 'sub2', status: 'active', name: 'sub2' },
    ];
    // family-data with one shared subscription
    mockQueryData[JSON.stringify(['/api/family-groups', 'g1', 'family-data'])] = {
      sharedSubscriptions: [{ subscription_id: 'sub1' }],
      metrics: {},
    };
    // still need groups to select
    mockQueryData[JSON.stringify(['/api/family-groups'])] = [
      { id: 'g1', name: 'Group1', ownerId: 'owner-1', memberCount: 0 },
    ];
    // the family-data query is only enabled when the owner has allowed
    // family data to be shown; we need to replicate that so our helper
    // receives the shared subscription payload we configured above.
    mockQueryData[JSON.stringify(['/api/family-groups', 'g1', 'settings'])] = {
      show_family_data: true,
    };

    const { rerender } = render(<FamilySharing />);
    const grpEl = await screen.findByText('Group1');
    fireEvent.click(grpEl);

    // after selecting the group the "Share subscriptions" section should render
    await screen.findByText(/Share subscriptions/i);

    // the eligible list should contain only sub2 (since sub1 is already shared)
    expect(screen.getByText('sub2')).toBeInTheDocument();
    expect(screen.queryByText('sub1')).not.toBeInTheDocument();

    // simulate sharing sub2: clicking the button should invoke our mutation
    // stub which calls onSuccess (and therefore fires a toast). we then
    // update the mocked server response to include sub2 in sharedSubs and
    // rerender so the UI reflects the change.
    // match the exact label, not the "Unshare" button which also
    // contains the word "share".
    const shareButton = screen.getByRole('button', { name: /^Share$/i });
    fireEvent.click(shareButton);
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Shared' })
    );

    // now pretend the server tells us sub2 is shared as well
    mockQueryData[JSON.stringify(['/api/family-groups', 'g1', 'family-data'])] = {
      sharedSubscriptions: [
        { subscription_id: 'sub1' },
        { subscription_id: 'sub2' },
      ],
      metrics: {},
    };
    rerender(<FamilySharing />);

    // after re-render the eligible list should no longer show sub2
    await waitFor(() => {
      expect(screen.queryByText('sub2')).not.toBeInTheDocument();
    });
  });
});
