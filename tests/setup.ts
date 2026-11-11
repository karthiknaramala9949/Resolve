import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
import { webcrypto } from 'node:crypto';

// Polyfill window.crypto.subtle in jsdom test environment using Node's native WebCrypto
if (typeof window !== 'undefined' && (!window.crypto || !window.crypto.subtle)) {
  Object.defineProperty(window, 'crypto', {
    value: webcrypto,
    writable: true,
    configurable: true,
  });
}
