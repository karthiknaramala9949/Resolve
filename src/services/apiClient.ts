/**
 * Centralized Reusable API Client
 *
 * Provides standardized request/response handling, timeout control (AbortSignal),
 * centralized plain-English error transformation, and offline-awareness.
 */

export class ApiError extends Error {
  public status: number;
  public code?: string;
  public isOffline: boolean;
  public details?: any;

  constructor(message: string, status: number = 500, isOffline: boolean = false, code?: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.isOffline = isOffline;
    this.code = code;
    this.details = details;
  }
}

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  params?: Record<string, string | number | boolean | undefined>;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  ok: boolean;
}

const DEFAULT_TIMEOUT_MS = 15000;

function formatErrorMessage(status: number, serverError?: string): string {
  if (serverError && typeof serverError === 'string' && serverError.trim()) {
    // If server provides a user-friendly message, prefer it
    return serverError;
  }

  switch (status) {
    case 400:
      return 'Please check your information and try again.';
    case 401:
      return 'Your session has ended. Please sign in again.';
    case 403:
      return "You don't have permission to perform this action.";
    case 404:
      return 'The requested record could not be found.';
    case 409:
      return 'A conflict occurred. Please refresh the page and try again.';
    case 429:
      return 'Too many attempts. Please try again in a few minutes.';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'Something went wrong on our end. Please try again in a moment.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

export async function request<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, params, headers, ...customConfig } = options;

  // Offline detection before initiating network call
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new ApiError(
      'You are currently offline. Please check your internet connection.',
      0,
      true,
      'OFFLINE'
    );
  }

  // Build URL with query params
  let url = endpoint;
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    }
    const qStr = searchParams.toString();
    if (qStr) {
      url += (url.includes('?') ? '&' : '?') + qStr;
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const config: RequestInit = {
    ...customConfig,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...headers,
    },
    credentials: 'include', // Secure session cookies
    signal: controller.signal,
  };

  try {
    const response = await fetch(url, config);
    clearTimeout(timeoutId);

    let parsedBody: any = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      parsedBody = await response.json().catch(() => null);
    } else {
      const text = await response.text().catch(() => '');
      parsedBody = text ? { message: text } : null;
    }

    if (!response.ok) {
      const message = formatErrorMessage(
        response.status,
        parsedBody?.error || parsedBody?.message
      );
      throw new ApiError(
        message,
        response.status,
        false,
        parsedBody?.code,
        parsedBody
      );
    }

    return parsedBody as T;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error instanceof ApiError) {
      throw error;
    }

    if (error.name === 'AbortError') {
      throw new ApiError(
        'Request timed out. Please check your connection and try again.',
        408,
        false,
        'TIMEOUT'
      );
    }

    const isNetworkError =
      (typeof navigator !== 'undefined' && !navigator.onLine) ||
      (error instanceof TypeError && error.message.toLowerCase().includes('fetch'));

    if (isNetworkError) {
      throw new ApiError(
        'Network connection error. Please check your connection and try again.',
        0,
        true,
        'NETWORK_ERROR'
      );
    }

    throw new ApiError(
      error.message || 'An unexpected error occurred. Please try again.',
      500,
      false,
      'UNKNOWN'
    );
  }
}

export const apiClient = {
  get: <T = any>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T = any>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};

