import { caseRepository, purchaseRepository, reminderRepository } from '@/lib/db/repositories';

export async function exportFullBackup(): Promise<void> {
  const [cases, purchases, reminders] = await Promise.all([
    caseRepository.getAll(),
    purchaseRepository.getAll(),
    reminderRepository.getAll(),
  ]);

  const exportBundle = {
    app: 'RESOLVE-ONE',
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    disclaimer: 'Unencrypted client-side export of local dispute records.',
    data: {
      cases,
      purchases,
      reminders,
    },
  };

  const blob = new Blob([JSON.stringify(exportBundle, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `RESOLVE-ONE-Backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

