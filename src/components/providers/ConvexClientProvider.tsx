'use client';

import React, { ReactNode, useMemo } from 'react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';

const CONVEX_URL =
  process.env.NEXT_PUBLIC_CONVEX_URL || 'https://quirky-skunk-768.convex.cloud';

let convexClientInstance: ConvexReactClient | null = null;

export function getConvexClient(): ConvexReactClient {
  if (!CONVEX_URL) {
    throw new Error(
      'NEXT_PUBLIC_CONVEX_URL environment variable is missing. Convex backend connection aborted.'
    );
  }
  if (!convexClientInstance) {
    convexClientInstance = new ConvexReactClient(CONVEX_URL);
  }
  return convexClientInstance;
}

function ConvexConnectedProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => getConvexClient(), []);
  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!CONVEX_URL) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F4] p-6 text-charcoal">
        <div className="max-w-md w-full bg-white rounded-2xl p-6 border border-amber-200 shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 font-bold text-xl">
            !
          </div>
          <h2 className="text-lg font-bold text-charcoal">Convex Backend Not Configured</h2>
          <p className="text-sm text-steel-grey-600 leading-relaxed">
            The application requires <code className="px-1.5 py-0.5 rounded bg-steel-grey-100 text-xs font-mono">NEXT_PUBLIC_CONVEX_URL</code> to connect to backend services.
          </p>
          <div className="p-3 bg-steel-grey-50 rounded-xl text-xs text-steel-grey-700 font-mono break-all">
            NEXT_PUBLIC_CONVEX_URL=https://&lt;deployment&gt;.convex.cloud
          </div>
        </div>
      </div>
    );
  }

  return <ConvexConnectedProvider>{children}</ConvexConnectedProvider>;
}

