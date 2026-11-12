/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activityLogs from "../activityLogs.js";
import type * as auth from "../auth.js";
import type * as authHelper from "../authHelper.js";
import type * as cases from "../cases.js";
import type * as crons from "../crons.js";
import type * as crypto from "../crypto.js";
import type * as dashboard from "../dashboard.js";
import type * as devices from "../devices.js";
import type * as documents from "../documents.js";
import type * as folders from "../folders.js";
import type * as http from "../http.js";
import type * as notifications from "../notifications.js";
import type * as purchases from "../purchases.js";
import type * as rateLimits from "../rateLimits.js";
import type * as reminders from "../reminders.js";
import type * as search from "../search.js";
import type * as storage from "../storage.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activityLogs: typeof activityLogs;
  auth: typeof auth;
  authHelper: typeof authHelper;
  cases: typeof cases;
  crons: typeof crons;
  crypto: typeof crypto;
  dashboard: typeof dashboard;
  devices: typeof devices;
  documents: typeof documents;
  folders: typeof folders;
  http: typeof http;
  notifications: typeof notifications;
  purchases: typeof purchases;
  rateLimits: typeof rateLimits;
  reminders: typeof reminders;
  search: typeof search;
  storage: typeof storage;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
};
