import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Global fetch fallback mock for Vitest jsdom
if (!globalThis.fetch) {
  globalThis.fetch = vi.fn().mockImplementation(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ executions: [] }),
    })
  );
}
