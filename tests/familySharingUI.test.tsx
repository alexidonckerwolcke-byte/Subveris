// a DOM environment is required for rendering components
/**
 * @vitest-environment jsdom
 */

import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// create a map that our mocked useQuery will read from
const mockQueryData: Record<string, any> = {};
let mockTier: 'free' | 'premium' | 'family' = 'premium';

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

vi.mock('@/lib/subscription-context', () => ({
  useSubscription: () => ({ tier: mockTier }),
}));

// import after the mocks are defined
import { FamilySharing } from '../client/src/components/family-sharing';

// helper to reset mocks before each test
beforeEach(() => {
  for (const k of Object.keys(mockQueryData)) {
    delete mockQueryData[k];
  }
  mockTier = 'premium';
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
    // ensure there is at least one other member to share with
    mockQueryData[JSON.stringify(['/api/family-groups', 'g1', 'members'])] = [
      { userId: 'member-2', email: 'member2@example.com' },
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
    const shareHeader = await screen.findByText(/Share subscriptions/i);
    const shareSection = shareHeader.closest('div')?.parentElement as HTMLElement;
    const shareWithin = within(shareSection);
    // Find all 'Share' buttons in the share section and check their nearby
    // subscription names. This avoids matching 'sub1' that appears in the
    // shared-subscriptions list and is more deterministic than raw text matching.
    // Verify `sub2` appears in the available-to-share list (has a Share button nearby)
    const sub2Node = await screen.findByText('sub2');
    // Walk up from the name node to find the nearest ancestor that contains a button
    let ancestor: HTMLElement | null = sub2Node.closest('div');
    while (ancestor && ancestor.querySelector('button') === null) {
      ancestor = ancestor.parentElement as HTMLElement;
    }
    expect(ancestor).not.toBeNull();
    expect(within(ancestor as HTMLElement).getByRole('button', { name: /^Share$/i })).toBeTruthy();

    // `sub1` may appear in the shared list; ensure it's not present in the *available* list
    const sub1Node = screen.queryByText('sub1');
    if (sub1Node) {
      const sub1Container = sub1Node.closest('div') as HTMLElement;
      expect(within(sub1Container).queryByRole('button', { name: /^Share$/i })).toBeNull();
    }

    // simulate sharing sub2: clicking the button should invoke our mutation
    // stub which calls onSuccess (and therefore fires a toast). we then
    // update the mocked server response to include sub2 in sharedSubs and
    // rerender so the UI reflects the change.
    // match the exact label, not the "Unshare" button which also
    // contains the word "share".
    const shareButton = screen.getByRole('button', { name: /^Share$/i });
    fireEvent.click(shareButton);

    // Wait for the confirmation dialog and click its confirm Share button
    const dialog = await screen.findByRole('dialog');
    // select a member to share with so the confirm button is enabled
    const checkbox = within(dialog).getByRole('checkbox');
    fireEvent.click(checkbox);
    const confirmShare = within(dialog).getByRole('button', { name: /^Share$/i });
    fireEvent.click(confirmShare);
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Shared' })
    );

    // close the dialog so the main sharing UI is visible again
    const cancelButton = within(dialog).getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);

    // now pretend the server tells us sub2 is shared as well
    mockQueryData[JSON.stringify(['/api/family-groups', 'g1', 'family-data'])] = {
      sharedSubscriptions: [
        { subscription_id: 'sub1' },
        { subscription_id: 'sub2' },
      ],
      metrics: {},
    };
    rerender(<FamilySharing />);

    // after re-render the available-to-share section should no longer show sub2
    await waitFor(() => {
      expect(shareWithin.queryByText('sub2')).not.toBeInTheDocument();
    });
  });

  it('shows active family subscriptions in the shared family data view', async () => {
    mockQueryData[JSON.stringify(['/api/subscriptions'])] = [
      { id: 'sub1', status: 'active', name: 'Active Personal', amount: 10, currency: 'USD', frequency: 'monthly' },
    ];
    mockQueryData[JSON.stringify(['/api/family-groups'])] = [
      { id: 'g1', name: 'Family Group', ownerId: 'owner-1', memberCount: 1 },
    ];
    mockQueryData[JSON.stringify(['/api/family-groups', 'g1', 'settings'])] = { show_family_data: true };
    mockQueryData[JSON.stringify(['/api/family-groups', 'g1', 'family-data'])] = {
      subscriptions: [
        { id: 'shared-sub', status: 'active', name: 'Shared Active', amount: 12, currency: 'USD', frequency: 'monthly' },
      ],
      sharedSubscriptions: [],
      metrics: {},
    };

    render(<FamilySharing />);
    const grpEl = await screen.findByText('Family Group');
    fireEvent.click(grpEl);

    expect(await screen.findByText('Shared Active')).toBeInTheDocument();
    expect(screen.queryByText('No subscriptions available')).not.toBeInTheDocument();
  });

  it('disables family data view when the subscription tier falls back to free', async () => {
    mockTier = 'free';
    mockQueryData[JSON.stringify(['/api/family-groups'])] = [
      { id: 'g1', name: 'Family Group', ownerId: 'owner-1', memberCount: 1 },
    ];
    mockQueryData[JSON.stringify(['/api/family-groups', 'g1', 'settings'])] = { show_family_data: true };
    mockQueryData[JSON.stringify(['/api/family-groups', 'g1', 'family-data'])] = {
      subscriptions: [{ id: 'shared-sub', status: 'active', name: 'Shared Active' }],
      sharedSubscriptions: [],
      metrics: {},
    };

    render(<FamilySharing />);
    const grpEl = await screen.findByText('Family Group');
    fireEvent.click(grpEl);

    expect(await screen.findByText(/Your personal data only/i)).toBeInTheDocument();
    expect(screen.queryByText('Shared Active')).not.toBeInTheDocument();
  });
});
