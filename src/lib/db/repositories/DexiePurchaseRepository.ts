import { IPurchaseRepository } from './IPurchaseRepository';
import { db, ResolveOneDB } from '../db';
import { Purchase } from '../types';
import { syncEngine } from '@/lib/sync/syncEngine';

export class DexiePurchaseRepository implements IPurchaseRepository {
  private database: ResolveOneDB;

  constructor(database: ResolveOneDB = db) {
    this.database = database;
  }

  async getAll(): Promise<Purchase[]> {
    return this.database.purchases.toArray();
  }

  async getById(id: string): Promise<Purchase | undefined> {
    return this.database.purchases.get(id);
  }

  async save(purchase: Purchase): Promise<Purchase> {
    const existing = await this.database.purchases.get(purchase.id);
    await this.database.purchases.put(purchase);

    try {
      await this.database.syncQueue.put({
        id: `SQ-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        entity: 'purchases',
        operation: existing ? 'update' : 'create',
        clientGeneratedId: purchase.id,
        data: purchase,
        timestamp: new Date().toISOString(),
        status: 'pending',
        retryCount: 0,
      });
      if (typeof window !== 'undefined') {
        syncEngine.triggerSync();
      }
    } catch {}

    return purchase;
  }

  async delete(id: string): Promise<void> {
    await this.database.purchases.delete(id);

    try {
      await this.database.syncQueue.put({
        id: `SQ-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        entity: 'purchases',
        operation: 'delete',
        clientGeneratedId: id,
        data: {},
        timestamp: new Date().toISOString(),
        status: 'pending',
        retryCount: 0,
      });
      if (typeof window !== 'undefined') {
        syncEngine.triggerSync();
      }
    } catch {}
  }

  async importBatch(purchases: Purchase[]): Promise<number> {
    await this.database.purchases.bulkPut(purchases);
    for (const p of purchases) {
      try {
        await this.database.syncQueue.put({
          id: `SQ-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          entity: 'purchases',
          operation: 'create',
          clientGeneratedId: p.id,
          data: p,
          timestamp: new Date().toISOString(),
          status: 'pending',
          retryCount: 0,
        });
      } catch {}
    }
    if (typeof window !== 'undefined') {
      syncEngine.triggerSync();
    }
    return purchases.length;
  }
}
