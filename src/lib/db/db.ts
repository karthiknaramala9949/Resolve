/**
 * Local State & Session Cache Management
 *
 * All authoritative persistent business records are managed exclusively by Convex.
 * This file retains session clearing utilities for logging out or wiping local session state.
 * Dexie and IndexedDB have been retired.
 */

/**
 * Clears local session caches, temporary cryptographic keys, and UI preferences.
 * Enforces zero data leakage across different user sessions or on logout.
 */
export async function clearLocalUserData(): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem('resolve_convex_token');
      sessionStorage.removeItem('resolve-one-e2ee-session-pass');
      localStorage.removeItem('resolve-one-last-sync-at');
      localStorage.removeItem('resolve-one-encrypted');
      localStorage.removeItem('resolve-one-enc-salt');
      localStorage.removeItem('resolve-one-enc-iv');
      localStorage.removeItem('resolve-one-enc-check');
      localStorage.removeItem('resolve_guest_user');
    } catch {
      // Ignore
    }
  }
}
