'use client';

import { db } from '../db/db';
import { SyncQueueItem, Case, Purchase, Reminder } from '../db/types';
import { getConvexClient } from '@/components/providers/ConvexClientProvider';
import { api } from '../../../convex/_generated/api';

export type SyncState = 'synced' | 'syncing' | 'offline' | 'error';

type SyncListener = (state: SyncState, details?: { pendingCount: number; lastSyncedAt?: string }) => void;

class SyncEngine {
  private syncState: SyncState = 'synced';
  private listeners: Set<SyncListener> = new Set();
  private intervalId: any = null;
  private currentSessionToken: string | null = null;
  private isProcessing = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
    }
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.syncState, {
      pendingCount: 0,
      lastSyncedAt: this.getLastSyncedAt() || undefined,
    });
    return () => this.listeners.delete(listener);
  }

  private notify(state: SyncState, pendingCount = 0) {
    this.syncState = state;
    const lastSyncedAt = this.getLastSyncedAt() || undefined;
    for (const listener of this.listeners) {
      listener(state, { pendingCount, lastSyncedAt });
    }
  }

  public setSessionToken(token: string | null) {
    this.currentSessionToken = token;
    if (token) {
      this.startSyncLoop();
    } else {
      this.stopSyncLoop();
    }
  }

  private handleNetworkChange(isOnline: boolean) {
    if (!isOnline) {
      this.notify('offline');
    } else {
      this.notify('synced');
      this.triggerSync();
    }
  }

  public getLastSyncedAt(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('resolve-one-last-sync-at');
  }

  private setLastSyncedAt(timestamp: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('resolve-one-last-sync-at', timestamp);
    }
  }

  /**
   * Enqueue a local mutation for offline sync.
   */
  public async enqueue(
    entity: 'cases' | 'purchases' | 'reminders',
    operation: 'create' | 'update' | 'delete',
    clientGeneratedId: string,
    data: any
  ): Promise<void> {
    const now = new Date().toISOString();
    const item: SyncQueueItem = {
      id: `SQ-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      entity,
      operation,
      clientGeneratedId,
      data,
      timestamp: now,
      status: 'pending',
      retryCount: 0,
    };

    await db.syncQueue.put(item);
    this.triggerSync();
  }

  /**
   * Run sync process (push pending queue, then pull remote changes).
   */
  public async triggerSync(): Promise<void> {
    if (typeof window === 'undefined') return;
    if (!navigator.onLine) {
      this.notify('offline');
      return;
    }

    if (!this.currentSessionToken || this.isProcessing) {
      return;
    }

    try {
      this.isProcessing = true;
      const pendingItems = await db.syncQueue.where('status').equals('pending').toArray();
      this.notify('syncing', pendingItems.length);

      const convex = getConvexClient();

      // 1. PUSH BATCH
      if (pendingItems.length > 0) {
        const operations = pendingItems.map((p) => ({
          id: p.id,
          entity: p.entity,
          operation: p.operation,
          clientGeneratedId: p.clientGeneratedId,
          data: p.data,
          clientTimestamp: p.timestamp,
        }));

        const pushResult = await convex.mutation(api.sync.pushBatch, {
          sessionToken: this.currentSessionToken,
          operations,
        });

        // Delete processed items from local queue
        for (const res of pushResult.results) {
          if (res.success) {
            await db.syncQueue.delete(res.queueId);
          } else {
            await db.syncQueue.update(res.queueId, {
              status: 'failed',
              lastError: res.message,
            });
          }
        }
      }

      // 2. PULL DELTAS
      const lastSync = this.getLastSyncedAt() || undefined;
      const pullResult = await convex.query(api.sync.pullChanges, {
        sessionToken: this.currentSessionToken,
        sinceTimestamp: lastSync,
      });

      // Upsert server cases into Dexie
      if (pullResult.cases && pullResult.cases.length > 0) {
        for (const serverCase of pullResult.cases) {
          const localId = serverCase.clientGeneratedId || serverCase._id;
          const caseRecord: Case = {
            id: localId,
            title: serverCase.title,
            issueType: serverCase.issueType,
            company: serverCase.company,
            orderRef: serverCase.orderRef,
            product: serverCase.product,
            amount: serverCase.amount,
            purchasedAt: serverCase.purchasedAt,
            desiredOutcome: serverCase.desiredOutcome,
            description: serverCase.description,
            status: serverCase.status as any,
            createdAt: serverCase.createdAt,
            updatedAt: serverCase.updatedAt,
            nextAction: serverCase.nextAction,
            nextStepReason: serverCase.nextStepReason,
            claimedOutcome: serverCase.claimedOutcome,
            customerConfirmedOutcome: serverCase.customerConfirmedOutcome,
            threeStateOutcome: serverCase.threeStateOutcome,
            evidence: serverCase.evidence as any,
            timeline: serverCase.timeline as any,
            tags: serverCase.tags,
            customerNotes: serverCase.customerNotes,
          };
          await db.cases.put(caseRecord);
        }
      }

      // Upsert server purchases into Dexie
      if (pullResult.purchases && pullResult.purchases.length > 0) {
        for (const p of pullResult.purchases) {
          const localId = p.clientGeneratedId || p._id;
          const purchaseRecord: Purchase = {
            id: localId,
            store: p.store,
            product: p.product,
            orderRef: p.orderRef,
            amount: p.amount,
            purchaseDate: p.purchaseDate,
            deliveryDate: p.deliveryDate,
            returnWindowDays: p.returnWindowDays,
            warrantyMonths: p.warrantyMonths,
            notes: p.notes,
            serialNo: p.serialNo,
            createdAt: p.createdAt,
          };
          await db.purchases.put(purchaseRecord);
        }
      }

      // Upsert server reminders into Dexie
      if (pullResult.reminders && pullResult.reminders.length > 0) {
        for (const r of pullResult.reminders) {
          const localId = r.clientGeneratedId || r._id;
          const reminderRecord: Reminder = {
            id: localId,
            caseId: r.caseId,
            title: r.title,
            date: r.date,
            done: r.done,
            createdAt: r.createdAt,
          };
          await db.reminders.put(reminderRecord);
        }
      }

      this.setLastSyncedAt(pullResult.timestamp);
      this.notify('synced', 0);
    } catch (err) {
      console.error('[SyncEngine] Error during synchronization:', err);
      this.notify('error');
    } finally {
      this.isProcessing = false;
    }
  }

  public startSyncLoop() {
    this.stopSyncLoop();
    this.triggerSync();
    this.intervalId = setInterval(() => {
      this.triggerSync();
    }, 30000); // 30 seconds
  }

  public stopSyncLoop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const syncEngine = new SyncEngine();

