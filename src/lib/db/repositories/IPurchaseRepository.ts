import { Purchase } from '../types';

export interface IPurchaseRepository {
  getAll(): Promise<Purchase[]>;
  getById(id: string): Promise<Purchase | undefined>;
  save(purchase: Purchase): Promise<Purchase>;
  delete(id: string): Promise<void>;
  importBatch(purchases: Purchase[]): Promise<number>;
}

