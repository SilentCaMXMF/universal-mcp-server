/**
 * Test setup utilities
 */

import { beforeAll, afterAll, vi } from 'vitest';

// Global test setup
beforeAll(async () => {
  console.log('🧪 Setting up test environment');
});

afterAll(async () => {
  console.log('🧹 Cleaning up test environment');
});

// Mock console methods to reduce noise during tests
const originalConsole = global.console;

beforeAll(() => {
  global.console = {
    ...originalConsole,
    log: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
});

afterAll(() => {
  global.console = originalConsole;
});

export {};
