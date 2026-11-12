'use client';

import React, { useState, useEffect } from 'react';
import {
  Button,
  Card,
  EvidenceTile,
  EmptyState,
  BottomSheet,
  Select,
  Input,
  Textarea,
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
  Eye,
  Edit2,
} from 'lucide-react';
import { caseService, documentService } from '@/services';
import { Case, EvidenceMeta } from '@/lib/db/types';
import { formatComplaintLetter } from '@/lib/pdf/complaintLetter';
import { detectSensitiveInfo } from '@/lib/rules/redactionChecker';
import { validateUploadedFile } from '@/lib/rules/fileValidator';
import { UnlockVaultModal } from '@/features/crypto/components/UnlockVaultModal';
import { getActiveMasterKey } from '@/lib/crypto/e2ee';

export const DocumentsPage: React.FC = () => {
  const { toast } = useToast();
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [isPackModalOpen, setIsPackModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // File upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [targetCaseId, setTargetCaseId] = useState<string>('');
  const [redactionNotices, setRedactionNotices] = useState<any[]>([]);

  // Preview Modal state
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<EvidenceMeta | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Edit Evidence Modal state
  const [isEditEvidenceOpen, setIsEditEvidenceOpen] = useState(false);
  const [editEvidenceCaseId, setEditEvidenceCaseId] = useState<string>('');
  const [editEvidenceItem, setEditEvidenceItem] = useState<EvidenceMeta | null>(null);
  const [editEvidenceName, setEditEvidenceName] = useState('');
  const [editEvidenceHint, setEditEvidenceHint] = useState('');

  const loadData = async () => {
    const allCases = await caseService.listCases();
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
      const uploadRes = await documentService.uploadDocument({
        file: uploadFile,
        caseId: targetCaseId,
        redactionHint: redactionNotices.length > 0 ? redactionNotices[0].warning : undefined,
      });

      const meta: EvidenceMeta = {
        id: uploadRes.evidenceId,
        name: uploadFile.name,
        mime: uploadFile.type || 'application/octet-stream',
        size: uploadFile.size,
        source: 'customer_upload',
        addedAt: new Date().toISOString(),
        sha256: uploadRes.sha256,
        storageId: uploadRes.storageId,
        redactionHint: redactionNotices.length > 0 ? redactionNotices[0].warning : undefined,
      };

      await caseService.addEvidence(targetCaseId, meta);
      await caseService.addTimelineEvent(targetCaseId, {
        title: `Evidence uploaded: ${uploadFile.name}`,
        detail: `Saved with security verification fingerprint: ${uploadRes.sha256.slice(0, 16)}...`,
        source: 'evidence',
      });

      toast(`File saved securely.`, 'success');
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
      const { generateProofPackPDF } = await import('@/lib/pdf/proofPackGenerator');
      const doc = generateProofPackPDF(activeCase);
      doc.save(`RESOLVE-ONE-ProofPack-${activeCase.id}.pdf`);
      toast('Proof pack PDF exported.', 'success');
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
    toast('Formal complaint letter copied to clipboard.', 'success');
  };

  const handleDownloadBlob = async (id: string, name: string, item?: EvidenceMeta) => {
    try {
      toast(`Preparing download for ${name}...`, 'info');
      const blob = await documentService.downloadDocument(id, name, item);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
      toast(`Downloaded ${name}`, 'success');
    } catch (err: any) {
      if (err.message?.includes('E2EE_VAULT_LOCKED') || err.message?.includes('Master Key')) {
        setIsUnlockModalOpen(true);
      } else {
        toast(`Download error: ${err.message}`, 'error');
      }
    }
  };

  const handleViewEvidence = async (item: EvidenceMeta) => {
    try {
      toast(`Preparing preview for ${item.name}...`, 'info');
      const blob = await documentService.downloadDocument(item.id, item.name, item);
      const url = URL.createObjectURL(blob);
      setPreviewItem(item);
      setPreviewUrl(url);
      setIsPreviewModalOpen(true);
    } catch (err: any) {
      toast(`Could not preview ${item.name}: ${err.message}`, 'error');
    }
  };

  const handleClosePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPreviewItem(null);
    setIsPreviewModalOpen(false);
  };

  const handleOpenEditEvidence = (caseId: string, item: EvidenceMeta) => {
    setEditEvidenceCaseId(caseId);
    setEditEvidenceItem(item);
    setEditEvidenceName(item.name);
    setEditEvidenceHint(item.redactionHint || '');
    setIsEditEvidenceOpen(true);
  };

  const handleSaveEvidenceEdit = async () => {
    if (!editEvidenceItem || !editEvidenceCaseId || !editEvidenceName.trim()) {
      toast('File name is required.', 'warning');
      return;
    }

    try {
      const parentCase = cases.find((c) => c.id === editEvidenceCaseId);
      if (!parentCase) throw new Error('Case not found');

      const updatedEvidence = (parentCase.evidence || []).map((e) =>
        e.id === editEvidenceItem.id
          ? {
              ...e,
              name: editEvidenceName.trim(),
              redactionHint: editEvidenceHint.trim() || undefined,
            }
          : e
      );

      await caseService.updateCase(editEvidenceCaseId, { evidence: updatedEvidence });
      await caseService.addTimelineEvent(editEvidenceCaseId, {
        title: `Evidence updated: ${editEvidenceName.trim()}`,
        detail: `Renamed evidence record ${editEvidenceItem.id}.`,
        source: 'evidence',
      });

      toast('Evidence details updated successfully.', 'success');
      setIsEditEvidenceOpen(false);
      setEditEvidenceItem(null);
      loadData();
    } catch (err: any) {
      toast(`Error updating evidence: ${err.message}`, 'error');
    }
  };

  const handleDeleteEvidence = async (caseId: string, evId: string) => {
    if (confirm('Remove this evidence item?')) {
      await documentService.deleteDocument(caseId, evId);
      toast('Evidence item deleted.', 'info');
      loadData();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-medium text-charcoal tracking-tight">
            Documents & proof
          </h2>
          <p className="text-xs sm:text-sm text-steel-grey-600 mt-1 font-normal">
            Store receipts and images. Protected with tamper-proof security fingerprints to keep your documents verified
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="md"
            onClick={() => setIsPackModalOpen(true)}
            disabled={cases.length === 0}
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>Build proof pack</span>
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={() => setIsUploadModalOpen(true)}
            disabled={cases.length === 0}
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Add file</span>
          </Button>
        </div>
      </div>

      {/* Proof Pack Builder Callout Card */}
      <Card variant="subtle" className="p-5 sm:p-6 bg-white border border-steel-grey-200 rounded-2xl shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl text-left">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-coral shrink-0" />
              <h3 className="text-base font-medium text-charcoal">
                Proof pack compiler
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-steel-grey-600 font-normal">
              Prepares your timeline, dispute details, and evidence into a clean summary document ready to share with customer service or official consumer portals.
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => setIsPackModalOpen(true)}
            disabled={cases.length === 0}
            className="shrink-0"
          >
            <span>Open proof pack builder</span>
          </Button>
        </div>
      </Card>

      {/* Evidence Grid */}
      {allEvidence.length === 0 ? (
        <EmptyState
          illustration="documents"
          title="No evidence files uploaded yet"
          description="Upload invoices, delivery slips, rejection emails, or photos to build a bulletproof dispute pack."
          actionLabel="Add evidence file"
          onAction={() => setIsUploadModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {allEvidence.map(({ caseId, caseTitle, item }) => (
            <div key={item.id} className="relative group">
              <EvidenceTile
                item={item}
                onView={() => handleViewEvidence(item)}
                onDownload={() => handleDownloadBlob(item.id, item.name, item)}
                onEdit={() => handleOpenEditEvidence(caseId, item)}
                onDelete={() => handleDeleteEvidence(caseId, item.id)}
              />
              <div className="mt-1 text-[11px] text-steel-grey-500 font-mono px-1 truncate font-normal">
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
        title="Add supporting evidence"
        description="Attach PDF invoice, return receipt, unboxing photo, or chat screenshot"
      >
        <div className="space-y-4">
          <Select
            label="Link to case"
            value={targetCaseId}
            onChange={(e) => setTargetCaseId(e.target.value)}
            options={cases.map((c) => ({
              value: c.id,
              label: `${c.id} · ${c.title} (${c.company})`,
            }))}
          />

          <div className="p-6 border border-dashed border-steel-grey-300 rounded-xl text-center space-y-2 bg-steel-grey-50">
            <UploadCloud className="w-7 h-7 text-steel-grey-400 mx-auto" />
            <div className="text-xs sm:text-sm font-medium text-charcoal">
              {uploadFile ? uploadFile.name : 'Choose a file from your device'}
            </div>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,.mp4,.txt,.eml,.csv,.json"
              onChange={handleFileChange}
              className="text-xs text-steel-grey-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border file:border-steel-grey-200 file:bg-white file:text-xs"
            />
            <p className="text-[11px] text-steel-grey-500">
              Max file size: 15 MB. Allowed: PDF, PNG, JPG, WEBP, MP4, TXT, CSV.
            </p>
          </div>

          {redactionNotices.length > 0 && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-0.5">
              <div className="flex items-center gap-1.5 font-medium">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
                <span>{redactionNotices[0].label}</span>
              </div>
              <p className="text-amber-800">{redactionNotices[0].warning}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setIsUploadModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleUploadSubmit} disabled={!uploadFile}>
              Save file
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Proof Pack Builder & Guided Handoff Modal */}
      <BottomSheet
        isOpen={isPackModalOpen}
        onClose={() => setIsPackModalOpen(false)}
        title="Proof pack builder"
        description="Review your compiled complaint package before taking external action"
        className="max-w-2xl"
      >
        {activeCase && (
          <div className="space-y-4">
            <Select
              label="Select case"
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              options={cases.map((c) => ({
                value: c.id,
                label: `${c.id} · ${c.title} (${c.company})`,
              }))}
            />

            {/* Pack Overview Checklist */}
            <div className="p-4 rounded-xl bg-steel-grey-50 border border-steel-grey-200 space-y-2 text-xs">
              <div className="font-medium text-charcoal text-xs">
                Bundle contents
              </div>
              <div className="flex items-center gap-2 text-steel-grey-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Verified statement of facts & claim amount ({activeCase.amount ? `₹${activeCase.amount}` : 'N/A'})</span>
              </div>
              <div className="flex items-center gap-2 text-steel-grey-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Chronological event log ({(activeCase.timeline || []).length} events)</span>
              </div>
              <div className="flex items-center gap-2 text-steel-grey-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Evidence items with SHA-256 hashes ({(activeCase.evidence || []).length} files)</span>
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
                <span>{isGeneratingPdf ? 'Compiling PDF...' : 'Download PDF proof pack'}</span>
              </Button>

              <Button
                variant="secondary"
                size="md"
                onClick={handleCopyComplaintLetter}
                className="w-full"
              >
                <Copy className="w-4 h-4 shrink-0" />
                <span>Copy complaint letter</span>
              </Button>
            </div>

            {/* Guided Handoff Notice: Never Auto-Sends */}
            <div className="pt-3 border-t border-steel-grey-200 space-y-2 text-xs text-steel-grey-600">
              <span className="font-medium text-charcoal block">
                Guided channel handoff (You approve & send)
              </span>
              <p>
                RESOLVE-ONE never transmits emails or files complaints automatically. Open an official portal below and paste your copied letter:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <a
                  href="https://consumerhelpline.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-steel-grey-200 bg-white hover:bg-steel-grey-50 text-charcoal font-medium"
                >
                  <span>National Consumer Helpline (NCH)</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <a
                  href="https://e-jagriti.gov.in/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-steel-grey-200 bg-white hover:bg-steel-grey-50 text-charcoal font-medium"
                >
                  <span>e-Jagriti Portal</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* Evidence Preview Modal */}
      <BottomSheet
        isOpen={isPreviewModalOpen}
        onClose={handleClosePreview}
        title={previewItem ? `Evidence: ${previewItem.name}` : 'Document preview'}
        description={previewItem ? `Reference ID: ${previewItem.id} · Size: ${(previewItem.size / 1024).toFixed(1)} KB` : undefined}
      >
        <div className="space-y-4">
          {previewItem && previewUrl && (
            <div className="p-3 bg-steel-grey-50 rounded-xl border border-steel-grey-200 flex flex-col items-center justify-center min-h-[220px]">
              {previewItem.mime.startsWith('image/') ? (
                <img
                  src={previewUrl}
                  alt={previewItem.name}
                  className="max-h-[55vh] max-w-full rounded-lg object-contain shadow-xs"
                />
              ) : previewItem.mime === 'application/pdf' ? (
                <iframe
                  src={previewUrl}
                  title={previewItem.name}
                  className="w-full h-[55vh] rounded-lg border border-steel-grey-300 bg-white"
                />
              ) : (
                <div className="text-center py-8 space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-white border border-steel-grey-200 flex items-center justify-center mx-auto text-steel-grey-600">
                    <FileText className="w-6 h-6 text-coral" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-charcoal">{previewItem.name}</p>
                    <p className="text-xs text-steel-grey-500 font-mono mt-1">
                      MIME: {previewItem.mime} · ID: {previewItem.id}
                    </p>
                    {previewItem.sha256 && (
                      <p className="text-[11px] text-steel-grey-400 font-mono mt-1">
                        SHA-256: {previewItem.sha256.slice(0, 24)}...
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            <Button
              variant="outline"
              size="md"
              onClick={async () => {
                if (!previewItem) return;
                await handleDownloadBlob(previewItem.id, previewItem.name, previewItem);
              }}
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>Download copy</span>
            </Button>

            <Button variant="primary" size="md" onClick={handleClosePreview}>
              Close preview
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Edit Evidence Details Modal */}
      <BottomSheet
        isOpen={isEditEvidenceOpen}
        onClose={() => setIsEditEvidenceOpen(false)}
        title="Edit evidence record"
        description="Update file name or sensitivity notes"
      >
        <div className="space-y-4">
          <Input
            label="File display name"
            value={editEvidenceName}
            onChange={(e) => setEditEvidenceName(e.target.value)}
            placeholder="e.g. return-pickup-receipt.png"
            required
          />

          <Textarea
            label="Redaction note / verification detail"
            rows={2}
            value={editEvidenceHint}
            onChange={(e) => setEditEvidenceHint(e.target.value)}
            placeholder="e.g. Delivery agent signature verified on physical slip"
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setIsEditEvidenceOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveEvidenceEdit}>
              Save changes
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Zero-Knowledge E2EE Master Key Unlock Modal */}
      <UnlockVaultModal
        isOpen={isUnlockModalOpen}
        onClose={() => setIsUnlockModalOpen(false)}
        onUnlocked={() => {
          toast('Master Key vault unlocked. Documents ready for decryption.', 'success');
        }}
      />
    </div>
  );
};
