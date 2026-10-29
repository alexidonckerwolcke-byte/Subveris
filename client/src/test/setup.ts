import '@testing-library/jest-dom/vitest';

if (!navigator.locks) {
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: {
      request: async (
        name: string,
        _options: LockOptions,
        callback: (lock: Lock | null) => Promise<unknown>,
      ) => callback({ name, mode: 'exclusive' } as Lock),
    },
  });
}
