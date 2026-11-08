import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from '@/design-system';
import { AppShell } from '@/components/layout/AppShell';
import { NotFoundPage } from '@/components/common/NotFoundPage';

// Route-level code-splitting for high-performance sub-120KB initial JS budget
const LandingPage = React.lazy(() =>
  import('@/features/landing/pages/LandingPage').then((m) => ({ default: m.LandingPage }))
);
const OverviewPage = React.lazy(() =>
  import('@/features/cases/pages/OverviewPage').then((m) => ({ default: m.OverviewPage }))
);
const CasesListPage = React.lazy(() =>
  import('@/features/cases/pages/CasesListPage').then((m) => ({ default: m.CasesListPage }))
);
const CaseDetailPage = React.lazy(() =>
  import('@/features/cases/pages/CaseDetailPage').then((m) => ({ default: m.CaseDetailPage }))
);
const DocumentsPage = React.lazy(() =>
  import('@/features/documents/pages/DocumentsPage').then((m) => ({ default: m.DocumentsPage }))
);
const PurchasesPage = React.lazy(() =>
  import('@/features/purchases/pages/PurchasesPage').then((m) => ({ default: m.PurchasesPage }))
);
const HelpPage = React.lazy(() =>
  import('@/features/help/pages/HelpPage').then((m) => ({ default: m.HelpPage }))
);
const RemindersPage = React.lazy(() =>
  import('@/features/reminders/pages/RemindersPage').then((m) => ({ default: m.RemindersPage }))
);
const PrivacyPage = React.lazy(() =>
  import('@/features/privacy/pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage }))
);
const SettingsPage = React.lazy(() =>
  import('@/features/settings/pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);

const PageLoader: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] py-16 gap-3" aria-busy="true" aria-label="Loading page...">
    <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
    <p className="text-xs text-neutral-500 font-sans">Loading...</p>
  </div>
);

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Landing / Marketing route */}
            <Route path="/" element={<LandingPage />} />

            {/* Consumer Workspace Shell */}
            <Route path="/app" element={<AppShell />}>
              <Route index element={<Navigate to="/app/overview" replace />} />
              <Route path="overview" element={<OverviewPage />} />
              <Route path="cases" element={<CasesListPage />} />
              <Route path="cases/:id" element={<CaseDetailPage />} />
              <Route path="documents" element={<DocumentsPage />} />
              <Route path="purchases" element={<PurchasesPage />} />
              <Route path="help" element={<HelpPage />} />
              <Route path="reminders" element={<RemindersPage />} />
              <Route path="privacy" element={<PrivacyPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Catch-all fallback */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ToastProvider>
  );
};
