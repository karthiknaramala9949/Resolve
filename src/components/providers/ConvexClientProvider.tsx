'use client';

import React, { ReactNode, useMemo } from 'react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';

const CONVEX_URL =
  process.env.NEXT_PUBLIC_CONVEX_URL ||
  'https://generous-falcon-999.convex.cloud'; // Fallback for local build & development

let convexClientInstance: ConvexReactClient | null = null;

export function getConvexClient(): ConvexReactClient {
  if (!convexClientInstance) {
    convexClientInstance = new ConvexReactClient(CONVEX_URL);
  }
  return convexClientInstance;
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => getConvexClient(), []);

  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}

