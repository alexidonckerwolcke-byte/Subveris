import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import '@testing-library/jest-dom';
expect.extend(toHaveNoViolations);

import { FamilySharing } from '../client/src/components/family-sharing';

describe('Accessibility', () => {
  it('FamilySharing has no a11y violations', async () => {
    const { container } = render(<FamilySharing />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
