/**
 * Centralized Device Management Service
 *
 * Scopes device registration, listing, and removal directly through Convex backend.
 */
import { getConvexClient } from '@/components/providers/ConvexClientProvider';
import { api } from '../../convex/_generated/api';
import { ApiError } from './apiClient';

export interface DeviceRecord {
  _id: string;
  userId: string;
  deviceId: string;
  deviceName: string;
  deviceType: string;
  lastSyncAt: string;
  createdAt: string;
}

export const deviceService = {
  /**
   * Registers or updates a device for the authenticated session.
   * Handles { ok: false, code, error } safely.
   */
  async registerDevice(payload: {
    sessionToken: string;
    deviceId: string;
    deviceName: string;
    deviceType: string;
    publicKey?: string;
  }): Promise<DeviceRecord> {
    const convex = getConvexClient();
    const res = await convex.mutation(api.devices.registerDevice, payload);
    if (!res || res.ok === false || !res.device) {
      throw new ApiError(res?.error || 'Failed to register device', res?.code === 'FORBIDDEN' ? 403 : 400);
    }
    return res.device as DeviceRecord;
  },

  /**
   * Removes a registered device belonging to the authenticated account.
   */
  async removeDevice(payload: {
    sessionToken: string;
    deviceId: string;
  }): Promise<boolean> {
    const convex = getConvexClient();
    const res = await convex.mutation(api.devices.removeDevice, payload);
    if (!res || res.ok === false) {
      throw new ApiError(res?.error || 'Failed to remove device', res?.code === 'FORBIDDEN' ? 403 : 400);
    }
    return true;
  },

  /**
   * Lists all registered devices for the current session.
   */
  async listDevices(sessionToken: string): Promise<DeviceRecord[]> {
    const convex = getConvexClient();
    return (await convex.query(api.devices.list, { sessionToken })) || [];
  },
};
