import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ExtensionTracker } from '../client/src/components/extension-tracker';

describe('ExtensionTracker', () => {
  it('renders tracked subscriptions when website_domain is present', () => {
    render(
      <ExtensionTracker
        subscriptions={[{ id: 'sub1', name: 'Spotify', status: 'active', website_domain: 'spotify.com', usageCount: 5 }]}
      />
    );

    expect(screen.getByText('Spotify')).toBeInTheDocument();
    expect(screen.getByText('spotify.com')).toBeInTheDocument();
    expect(screen.getByText(/5 uses/)).toBeInTheDocument();
  });

  it('shows the empty state when no subscriptions have domains', () => {
    render(
      <ExtensionTracker
        subscriptions={[{ id: 'sub2', name: 'Netflix', status: 'active', usageCount: 3 }] as any}
      />
    );

    expect(screen.getByText(/No subscriptions have website domains configured yet/i)).toBeInTheDocument();
  });
});
