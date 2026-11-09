'use client';

import React, { Suspense } from 'react';
import { CasesListPage } from '@/features/cases/pages/CasesListPage';

export default function Page() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-neutral-500">Loading cases...</div>}>
      <CasesListPage />
    </Suspense>
  );
}
