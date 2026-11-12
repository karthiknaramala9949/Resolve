'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthSetupRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/app/profile');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#FAF8F4] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-coral border-t-transparent animate-spin" />
        <p className="text-xs text-steel-grey-600 font-medium">Navigating to profile...</p>
      </div>
    </div>
  );
}
