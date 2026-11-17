'use client';

import React, { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'error-callback'?: (errorCode: string) => void;
          'expired-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
          size?: 'normal' | 'compact' | 'flexible';
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onloadTurnstileCallback?: () => void;
  }
}

interface TurnstileProps {
  onSuccess: (token: string) => void;
  onError?: (error?: string) => void;
  onExpire?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
}

export function Turnstile({
  onSuccess,
  onError,
  onExpire,
  theme = 'light',
  className = '',
}: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const siteKey =
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';

  useEffect(() => {
    let isMounted = true;

    // Check if script already injected
    const SCRIPT_ID = 'cf-turnstile-script';
    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

    function renderWidget() {
      if (!isMounted || !containerRef.current || !window.turnstile) return;
      if (widgetIdRef.current) return; // Already rendered

      try {
        const id = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme,
          callback: (token: string) => {
            if (isMounted) onSuccess(token);
          },
          'error-callback': (code: string) => {
            console.warn('[Turnstile Widget Error]:', code);
            if (isMounted) onError?.(code);
          },
          'expired-callback': () => {
            if (isMounted) onExpire?.();
          },
        });
        widgetIdRef.current = id;
      } catch (err) {
        console.warn('[Turnstile Render Failed]:', err);
        if (isMounted) setLoadError(true);
      }
    }

    if (window.turnstile) {
      renderWidget();
    } else {
      if (!script) {
        script = document.createElement('script');
        script.id = SCRIPT_ID;
        script.src =
          'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback&render=explicit';
        script.async = true;
        script.defer = true;
        script.onerror = () => {
          if (isMounted) setLoadError(true);
        };
        document.head.appendChild(script);
      }

      window.onloadTurnstileCallback = () => {
        renderWidget();
      };
    }

    return () => {
      isMounted = false;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {}
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, theme, onSuccess, onError, onExpire]);

  // If script blocked or network unavailable in dev, provide dev bypass
  if (loadError && process.env.NODE_ENV !== 'production') {
    return (
      <div className="text-xs text-steel-grey-500 bg-steel-grey-50 p-2.5 rounded-lg border border-steel-grey-200">
        <span>Turnstile local fallback: </span>
        <button
          type="button"
          onClick={() => onSuccess('dev-mock-turnstile-token')}
          className="text-coral underline font-medium hover:text-coral-700 ml-1"
        >
          Verify CAPTCHA (Dev Bypass)
        </button>
      </div>
    );
  }

  return (
    <div className={`turnstile-container flex justify-center my-2 ${className}`}>
      <div ref={containerRef} />
    </div>
  );
}

