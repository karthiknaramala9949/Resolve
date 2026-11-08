import { IPurchaseRepository } from './IPurchaseRepository';
import { db, ResolveOneDB } from '../db';
import { Purchase } from '../types';

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
    await this.database.purchases.put(purchase);
    return purchase;
  }

  async delete(id: string): Promise<void> {
    await this.database.purchases.delete(id);
  }

  async importBatch(purchases: Purchase[]): Promise<number> {
    await this.database.purchases.bulkPut(purchases);
    return purchases.length;
  }
}

