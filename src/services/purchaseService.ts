/**
 * Centralized Purchases & Warranty Service (Convex-First Single Source of Truth)
 *
 * Coordinates purchases, return deadlines, and warranty records directly via Convex.
 */

import { Purchase } from '@/lib/db/types';
import { getConvexClient } from '@/components/providers/ConvexClientProvider';
import { ensureSessionToken } from '@/lib/auth/sessionToken';
import { api } from '../../convex/_generated/api';

function mapConvexPurchaseToAppPurchase(doc: any): Purchase {
  return {
    id: doc.clientGeneratedId || doc._id,
    store: doc.store,
    product: doc.product,
    orderRef: doc.orderRef,
    amount: doc.amount,
    purchaseDate: doc.purchaseDate,
    deliveryDate: doc.deliveryDate,
    returnWindowDays: doc.returnWindowDays,
    warrantyMonths: doc.warrantyMonths,
    notes: doc.notes,
    serialNo: doc.serialNo,
    createdAt: doc.createdAt,
  };
}

export const purchaseService = {
  /**
   * Retrieves all saved purchases directly from Convex.
   */
  async listPurchases(): Promise<Purchase[]> {
    try {
      const sessionToken = await ensureSessionToken();
      if (!sessionToken || sessionToken === 'default-session-token') {
        return [];
      }
      const convex = getConvexClient();
      const items = await convex.query(api.purchases.list, { sessionToken });
      return (items || []).map(mapConvexPurchaseToAppPurchase);
    } catch (err) {
      console.warn('[PurchaseService] Deferred query (offline or unauthenticated):', err);
      return [];
    }
  },

  /**
   * Retrieves a single purchase by id from Convex.
   */
  async getPurchaseById(id: string): Promise<Purchase | undefined> {
    const all = await this.listPurchases();
    return all.find((p) => p.id === id);
  },

  /**
   * Saves or updates a purchase record in Convex.
   */
  async savePurchase(purchase: Purchase): Promise<Purchase> {
    const sessionToken = await ensureSessionToken();
    const convex = getConvexClient();

    // Check if the purchase exists to decide between update and create
    const all = await this.listPurchases();
    const existing = all.find((p) => p.id === purchase.id);

    if (existing) {
      const updated = await convex.mutation(api.purchases.update, {
        sessionToken,
        id: purchase.id,
        store: purchase.store,
        product: purchase.product,
        orderRef: purchase.orderRef,
        amount: purchase.amount,
        purchaseDate: purchase.purchaseDate,
        deliveryDate: purchase.deliveryDate,
        returnWindowDays: purchase.returnWindowDays,
        warrantyMonths: purchase.warrantyMonths,
        notes: purchase.notes,
        serialNo: purchase.serialNo,
      });
      return mapConvexPurchaseToAppPurchase(updated);
    }

    const created = await convex.mutation(api.purchases.create, {
      sessionToken,
      clientGeneratedId: purchase.id,
      store: purchase.store,
      product: purchase.product,
      orderRef: purchase.orderRef,
      amount: purchase.amount,
      purchaseDate: purchase.purchaseDate,
      deliveryDate: purchase.deliveryDate,
      returnWindowDays: purchase.returnWindowDays,
      warrantyMonths: purchase.warrantyMonths,
      notes: purchase.notes,
      serialNo: purchase.serialNo,
    });
    return mapConvexPurchaseToAppPurchase(created);
  },

  /**
   * Deletes a purchase record from Convex.
   */
  async deletePurchase(id: string): Promise<void> {
    const sessionToken = await ensureSessionToken();
    const convex = getConvexClient();
    await convex.mutation(api.purchases.deletePurchase, {
      sessionToken,
      id,
    });
  },
};
