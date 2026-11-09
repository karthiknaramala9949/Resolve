'use client';

import React, { useState, useEffect } from 'react';
import {
  Button,
  Card,
  EvidenceTile,
  EmptyState,
  BottomSheet,
  Select,
  useToast,
} from '@/design-system';
import {
  Plus,
  Download,
  Copy,
  ExternalLink,
  ShieldAlert,
  FileText,
  UploadCloud,
  CheckCircle2,
} from 'lucide-react';
import { caseRepository, evidenceRepository } from '@/lib/db/repositories';
import { Case, EvidenceMeta } from '@/lib/db/types';
import { formatComplaintLetter } from '@/lib/pdf/complaintLetter';
import { detectSensitiveInfo } from '@/lib/rules/redactionChecker';
import { validateUploadedFile, ALLOWED_EXTENSIONS } from '@/lib/rules/fileValidator';

export const DocumentsPage: React.FC = () => {
  const { toast } = useToast();
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [isPackModalOpen, setIsPackModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // File upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [targetCaseId, setTargetCaseId] = useState<string>('');
  const [redactionNotices, setRedactionNotices] = useState<any[]>([]);

  const loadData = async () => {
    const allCases = await caseRepository.getAll();
    setCases(allCases);
    if (allCases.length > 0 && !selectedCaseId) {
      setSelectedCaseId(allCases[0].id);
      setTargetCaseId(allCases[0].id);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const activeCase = cases.find((c) => c.id === selectedCaseId);
  const allEvidence: Array<{ caseId: string; caseTitle: string; item: EvidenceMeta }> = [];
  cases.forEach((c) => {
    (c.evidence || []).forEach((ev) => {
      allEvidence.push({
        caseId: c.id,
        caseTitle: c.title,
        item: ev,
      });
    });
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validation = validateUploadedFile(file);
      if (!validation.valid) {
        toast(validation.error || 'Invalid file', 'error');
        e.target.value = '';
        setUploadFile(null);
        return;
      }
      setUploadFile(file);

      // Check filename for sensitive patterns
      const notices = detectSensitiveInfo(file.name);
      setRedactionNotices(notices);
    }
  };

  const handleUploadSubmit = async () => {
    if (!uploadFile || !targetCaseId) {
      toast('Please select a file and target case.', 'warning');
      return;
    }

    const validation = validateUploadedFile(uploadFile);
    if (!validation.valid) {
      toast(validation.error || 'Invalid file', 'error');
      return;
    }

    try {
      const newEvId = `EV-${Date.now().toString().slice(-4)}`;
      const savedBlob = await evidenceRepository.saveBlob(uploadFile, {
        id: newEvId,
        name: uploadFile.name,
        type: uploadFile.type,
        size: uploadFile.size,
      });

      const meta: EvidenceMeta = {
        id: newEvId,
        name: uploadFile.name,
        mime: uploadFile.type || 'application/octet-stream',
        size: uploadFile.size,
        source: 'customer_upload',
        addedAt: new Date().toISOString(),
        sha256: savedBlob.sha256,
        redactionHint: redactionNotices.length > 0 ? redactionNotices[0].warning : undefined,
      };

      await caseRepository.addEvidenceMeta(targetCaseId, meta);
      await caseRepository.addTimelineEvent(targetCaseId, {
        title: `Evidence uploaded: ${uploadFile.name}`,
        detail: `Fingerprinted with SHA-256: ${savedBlob.sha256.slice(0, 16)}...`,
        source: 'evidence',
      });

      toast(`File uploaded and SHA-256 fingerprinted.`, 'success');
      setIsUploadModalOpen(false);
      setUploadFile(null);
      loadData();
    } catch (err: any) {
      toast(`Upload error: ${err.message}`, 'error');
    }
  };

  const handleDownloadProofPack = async () => {
    if (!activeCase) {
      toast('Select a case first.', 'warning');
      return;
    }

    setIsGeneratingPdf(true);
    try {
      // Lazy load jsPDF code bundle on demand
      const { generateProofPackPDF } = await import('@/lib/pdf/proofPackGenerator');
      const doc = generateProofPackPDF(activeCase);
      doc.save(`RESOLVE-ONE-ProofPack-${activeCase.id}.pdf`);
      toast('Proof Pack PDF exported cleanly.', 'success');
    } catch (err: any) {
      toast(`Error generating PDF: ${err.message}`, 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleCopyComplaintLetter = () => {
    if (!activeCase) return;
    const letter = formatComplaintLetter(activeCase);
    navigator.clipboard.writeText(letter);
    toast('Formal complaint notice copied to clipboard!', 'success');
  };

  const handleDownloadBlob = async (id: string, name: string) => {
    const record = await evidenceRepository.getBlob(id);
    if (!record || !record.blob) {
      toast('Binary file not found in local IndexedDB storage.', 'warning');
      return;
    }

    const url = URL.createObjectURL(record.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    toast(`Downloading ${name}`, 'info');
  };

  const handleDeleteEvidence = async (caseId: string, evId: string) => {
    if (confirm('Remove this evidence item?')) {
      await caseRepository.removeEvidenceMeta(caseId, evId);
      toast('Evidence item deleted.', 'info');
      loadData();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-serif text-neutral-900 dark:text-neutral-100">
            Documents & Proof
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            Store unedited receipts and images. Fingerprinted with SHA-256 for tamper-proof dispute bundles.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="md"
            onClick={() => setIsPackModalOpen(true)}
            disabled={cases.length === 0}
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>Build Proof Pack</span>
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={() => setIsUploadModalOpen(true)}
            disabled={cases.length === 0}
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Add File</span>
          </Button>
        </div>
      </div>

      {/* Proof Pack Builder Callout Card (Signature Feature #4) */}
      <Card variant="subtle" className="p-6 border border-brand-200/60 dark:border-brand-900/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-500" />
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Proof Pack Builder (Signature Feature #4)
              </h3>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              Auto-orders your statement of facts, timeline, and evidence with cryptographic SHA-256 digests. Ready for NCH 1915 or e-Jagriti filing.
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => setIsPackModalOpen(true)}
            disabled={cases.length === 0}
          >
            <span>Open Proof Pack Builder</span>
          </Button>
        </div>
      </Card>

      {/* Evidence Grid */}
      {allEvidence.length === 0 ? (
        <EmptyState
          title="No evidence files uploaded yet"
          description="Upload invoices, delivery slips, rejection emails, or photos to build a bulletproof dispute pack."
          actionLabel="Add First Evidence File"
          onAction={() => setIsUploadModalOpen(true)}
          illustration="documents"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allEvidence.map(({ caseId, caseTitle, item }) => (
            <div key={item.id} className="relative group">
              <EvidenceTile
                item={item}
                onDownload={() => handleDownloadBlob(item.id, item.name)}
                onDelete={() => handleDeleteEvidence(caseId, item.id)}
              />
              <div className="mt-1 text-[11px] text-neutral-700 dark:text-neutral-300 font-mono px-1 truncate font-medium">
                Case: {caseId} · {caseTitle}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload File Modal */}
      <BottomSheet
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Add Supporting Evidence"
        description="Attach PDF invoice, return receipt, unboxing photo, or chat screenshot."
      >
        <div className="space-y-4">
          <Select
            label="Link to Case"
            value={targetCaseId}
            onChange={(e) => setTargetCaseId(e.target.value)}
            options={cases.map((c) => ({
              value: c.id,
              label: `${c.id} · ${c.title} (${c.company})`,
            }))}
          />

          <div className="p-6 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl text-center space-y-2">
            <UploadCloud className="w-8 h-8 text-neutral-400 mx-auto" />
            <div className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
              {uploadFile ? uploadFile.name : 'Choose a file from your device'}
            </div>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,.mp4,.txt,.eml,.csv,.json"
              onChange={handleFileChange}
              className="text-xs text-neutral-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-neutral-300 file:bg-surface-light-subtle file:text-xs file:font-semibold"
            />
            <p className="text-[11px] text-neutral-400">
              Max file size: 15 MB. Allowed: PDF, PNG, JPG, WEBP, HEIC, MP4, TXT, EML, CSV, JSON.
            </p>
          </div>

          {redactionNotices.length > 0 && (
            <div className="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>{redactionNotices[0].label}</span>
              </div>
              <p>{redactionNotices[0].warning}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setIsUploadModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleUploadSubmit} disabled={!uploadFile}>
              Save to IndexedDB
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Proof Pack Builder & Guided Handoff Modal */}
      <BottomSheet
        isOpen={isPackModalOpen}
        onClose={() => setIsPackModalOpen(false)}
        title="Proof Pack Builder & Guided Handoff"
        description="Review your compiled complaint package before taking external action."
        className="max-w-2xl"
      >
        {activeCase && (
          <div className="space-y-5">
            <Select
              label="Select Case"
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              options={cases.map((c) => ({
                value: c.id,
                label: `${c.id} · ${c.title} (${c.company})`,
              }))}
            />

            {/* Pack Overview Checklist */}
            <div className="p-4 rounded-xl bg-surface-light-subtle dark:bg-surface-dark-subtle border border-neutral-200/80 dark:border-neutral-800 space-y-2 text-xs">
              <div className="font-semibold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider text-[11px]">
                Bundle Contents
              </div>
              <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Verified Statement of Facts & Claim Amount ({activeCase.amount ? `₹${activeCase.amount}` : 'N/A'})</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Chronological Event Log ({(activeCase.timeline || []).length} events)</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Evidence Items with SHA-256 Hashes ({(activeCase.evidence || []).length} files)</span>
              </div>
            </div>

            {/* Actions: Export PDF & Copy Letter */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                variant="primary"
                size="md"
                onClick={handleDownloadProofPack}
                isLoading={isGeneratingPdf}
                className="w-full"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>{isGeneratingPdf ? 'Compiling PDF...' : 'Download PDF Proof Pack'}</span>
              </Button>

              <Button
                variant="secondary"
                size="md"
                onClick={handleCopyComplaintLetter}
                className="w-full"
              >
                <Copy className="w-4 h-4 shrink-0" />
                <span>Copy Complaint Letter</span>
              </Button>
            </div>

            {/* Guided Handoff Notice: Never Auto-Sends */}
            <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 space-y-2 text-xs text-neutral-600 dark:text-neutral-400">
              <span className="font-semibold text-neutral-900 dark:text-neutral-100 block">
                Guided Channel Handoff (You Approve & Send)
              </span>
              <p>
                RESOLVE-ONE never transmits emails or files complaints automatically. Open an official portal below and paste your copied letter:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <a
                  href="https://consumerhelpline.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-medium"
                >
                  <span>National Consumer Helpline (NCH)</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <a
                  href="https://e-jagriti.gov.in/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-medium"
                >
                  <span>e-Jagriti Portal</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
};
