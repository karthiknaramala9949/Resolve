import type { Metadata, Viewport } from 'next';
import React from 'react';
import '@/index.css';
import { ToastProvider } from '@/design-system';
import { DatabaseBootstrap } from '@/components/providers/DatabaseBootstrap';

export const metadata: Metadata = {
  title: 'RESOLVE-ONE — Consumer Dispute Resolution for India',
  description: 'Turn your stressful complaint into an organized dispute pack and official escalation in under 3 minutes.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/favicon.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#17191C',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.remove('dark');if(typeof window!=='undefined'){try{localStorage.removeItem('resolve-one-theme');}catch(e){}}if(typeof window!=='undefined'&&typeof window.__name==='undefined'){window.__name=function(t,v){try{Object.defineProperty(t,'name',{value:v,configurable:true})}catch(e){}return t;}};`,
          }}
        />
      </head>
      <body suppressHydrationWarning className="min-h-screen bg-white text-charcoal font-sans antialiased selection:bg-coral-100 selection:text-coral-900">
        <ToastProvider>
          <DatabaseBootstrap>
            {children}
          </DatabaseBootstrap>
        </ToastProvider>
      </body>
    </html>
  );
}
