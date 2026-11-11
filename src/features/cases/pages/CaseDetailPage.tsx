'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Button,
  Card,
  StatusChip,
  Timeline,
  EvidenceTile,
  MoneyDisplay,
  Input,
  Textarea,
  Select,
  useToast,
  BottomSheet,
} from '@/design-system';
import {
  ArrowLeft,
  Building2,
  Calendar,
  FileText,
  CheckCircle,
  HelpCircle,
  Download,
  Plus,
  ArrowRight,
  ShieldAlert,
  AlertTriangle,
  Send,
  RotateCcw,
  Archive,
  Trash2,
  Copy,
  ExternalLink,
  Clock,
  UploadCloud,
  FileCheck,
} from 'lucide-react';
import { caseRepository, evidenceRepository, reminderRepository } from '@/lib/db/repositories';
import { Case, TimelineEvent, EvidenceMeta } from '@/lib/db/types';
import { computeNextStep } from '@/lib/rules/nextStepEngine';
import { formatComplaintLetter } from '@/lib/pdf/complaintLetter';
import { validateUploadedFile } from '@/lib/rules/fileValidator';
import { detectSensitiveInfo } from '@/lib/rules/redactionChecker';
import { uploadEncryptedDocument, downloadAndDecryptDocument } from '@/lib/crypto/documentManager';

export const CaseDetailPage: React.FC = () => {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const { toast } = useToast();

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWhyNextStep, setShowWhyNextStep] = useState(false);

  // Modals
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDetail, setEventDetail] = useState('');
  const [eventSource, setEventSource] = useState('customer');

  const [isOutcomeModalOpen, setIsOutcomeModalOpen] = useState(false);
  const [outcomeStage, setOutcomeStage] = useState<'company' | 'evidence' | 'customer'>('customer');
  const [outcomeNote, setOutcomeNote] = useState('');
  const [outcomeAmount, setOutcomeAmount] = useState('');

  // Add Evidence Modal
  const [isUploadEvidenceOpen, setIsUploadEvidenceOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [redactionNotice, setRedactionNotice] = useState<string | null>(null);

  // Add Reminder Modal
  const [isAddReminderOpen, setIsAddReminderOpen] = useState(false);
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderDate, setReminderDate] = useState('');

  // Official Channel Modal
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);

  const loadCase = async () => {
    if (!id) return;
    const found = await caseRepository.getById(id);
    if (found) {
      setCaseData(found);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCase();
  }, [id]);

  if (loading) {
    return (
      <div className="py-20 text-center text-steel-grey-500 font-normal">
        Loading case details from device storage...
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="py-20 text-center space-y-4">
        <h2 className="text-xl font-medium font-serif text-charcoal">Case not found</h2>
        <p className="text-xs sm:text-sm text-steel-grey-600">
          Case {id} does not exist in this browser&apos;s local database.
        </p>
        <Button onClick={() => router.push('/app/cases')}>Return to cases</Button>
      </div>
    );
  }

  const nextStep = computeNextStep(caseData);

  // 1. Add Timeline Event
  const handleAddEvent = async () => {
    if (!eventTitle.trim()) {
      toast('Please enter an event title', 'warning');
      return;
    }

    try {
      await caseRepository.addTimelineEvent(caseData.id, {
        title: eventTitle,
        detail: eventDetail,
        source: eventSource,
      });

      toast('Timeline event recorded.', 'success');
      setIsAddEventOpen(false);
      setEventTitle('');
      setEventDetail('');
      loadCase();
    } catch (err: any) {
      toast(`Error adding event: ${err.message}`, 'error');
    }
  };

  // 2. Mark Sent to Company
  const handleMarkSent = async () => {
    try {
      await caseRepository.update(caseData.id, {
        status: 'waiting_company',
      });
      await caseRepository.addTimelineEvent(caseData.id, {
        title: 'Formal complaint submitted to store',
        detail: 'Dispute notice sent via official company grievance portal or email.',
        source: 'customer',
      });
      toast('Case status updated to Waiting for Company.', 'success');
      loadCase();
    } catch (err: any) {
      toast(`Error updating status: ${err.message}`, 'error');
    }
  };

  // 3. Reopen Case
  const handleReopen = async () => {
    try {
      await caseRepository.update(caseData.id, {
        status: 'action_required',
      });
      await caseRepository.addTimelineEvent(caseData.id, {
        title: 'Dispute reopened by customer',
        detail: 'Resolution was not completed or fresh defect reported.',
        source: 'customer',
      });
      toast('Case reopened for further action.', 'info');
      loadCase();
    } catch (err: any) {
      toast(`Error reopening case: ${err.message}`, 'error');
    }
  };

  // 4. Archive Case
  const handleArchive = async () => {
    try {
      await caseRepository.update(caseData.id, {
        status: 'closed',
      });
      await caseRepository.addTimelineEvent(caseData.id, {
        title: 'Dispute archived',
        detail: 'Case records moved to archive.',
        source: 'customer',
      });
      toast('Case moved to archive.', 'info');
      loadCase();
    } catch (err: any) {
      toast(`Error archiving case: ${err.message}`, 'error');
    }
  };

  // 5. Delete Case
  const handleDeleteCase = async () => {
    if (!window.confirm(`Are you sure you want to delete dispute ${caseData.id}? This will remove all local timeline logs from this device.`)) {
      return;
    }

    try {
      await caseRepository.delete(caseData.id);
      toast(`Case ${caseData.id} deleted.`, 'info');
      router.push('/app/cases');
    } catch (err: any) {
      toast(`Error deleting case: ${err.message}`, 'error');
    }
  };

  // 6. Copy Formal Complaint Letter
  const handleCopyComplaint = async () => {
    try {
      const letter = formatComplaintLetter(caseData);
      await navigator.clipboard.writeText(letter);
      toast('Formal grievance notice copied to clipboard.', 'success');
    } catch {
      toast('Could not copy to clipboard. Please copy manually.', 'warning');
    }
  };

  // 7. Remove Evidence
  const handleRemoveEvidence = async (evId: string) => {
    if (!window.confirm('Remove this evidence file from the case?')) return;
    try {
      const remaining = (caseData.evidence || []).filter((e) => e.id !== evId);
      await caseRepository.update(caseData.id, { evidence: remaining });
      await caseRepository.addTimelineEvent(caseData.id, {
        title: 'Evidence file removed',
        detail: `Evidence item ${evId} detached from dispute record.`,
        source: 'evidence',
      });
      toast('Evidence removed from case.', 'info');
      loadCase();
    } catch (err: any) {
      toast(`Error removing evidence: ${err.message}`, 'error');
    }
  };

  // 8. Add Evidence File directly
  const handleDirectEvidenceUpload = async () => {
    if (!uploadFile) return;
    const validation = validateUploadedFile(uploadFile);
    if (!validation.valid) {
      toast(validation.error || 'Invalid file', 'error');
      return;
    }

    try {
      const uploadRes = await uploadEncryptedDocument({
        file: uploadFile,
        caseId: caseData.id,
        redactionHint: redactionNotice || undefined,
      });

      const meta: EvidenceMeta = {
        id: uploadRes.evidenceId,
        name: uploadFile.name,
        mime: uploadFile.type,
        size: uploadFile.size,
        source: 'customer_upload',
        addedAt: new Date().toISOString(),
        sha256: uploadRes.sha256,
        redactionHint: redactionNotice || undefined,
      };

      const updatedEvidence = [...(caseData.evidence || []), meta];
      await caseRepository.update(caseData.id, { evidence: updatedEvidence });
      await caseRepository.addTimelineEvent(caseData.id, {
        title: `Attached evidence: ${uploadFile.name}`,
        detail: `Client-side encrypted with SHA-256 fingerprint: ${uploadRes.sha256.slice(0, 16)}...`,
        source: 'evidence',
      });

      toast('Evidence file encrypted and attached to case.', 'success');
      setIsUploadEvidenceOpen(false);
      setUploadFile(null);
      setRedactionNotice(null);
      loadCase();
    } catch (err: any) {
      toast(`Upload error: ${err.message}`, 'error');
    }
  };

  // 9. Add Follow-Up Reminder directly
  const handleSaveReminder = async () => {
    if (!reminderTitle.trim() || !reminderDate) {
      toast('Please enter reminder action and due date.', 'warning');
      return;
    }

    try {
      await reminderRepository.save({
        id: `REM-${Date.now().toString().slice(-4)}`,
        caseId: caseData.id,
        title: reminderTitle,
        date: reminderDate,
        done: false,
        createdAt: new Date().toISOString(),
      });

      toast('Follow-up reminder scheduled.', 'success');
      setIsAddReminderOpen(false);
      setReminderTitle('');
      setReminderDate('');
    } catch (err: any) {
      toast(`Error saving reminder: ${err.message}`, 'error');
    }
  };

  // 10. Update Three-Stage Outcome
  const handleConfirmOutcome = async () => {
    try {
      const currentOutcomes = caseData.threeStateOutcome || {};
      const numAmount = outcomeAmount ? parseFloat(outcomeAmount) : (caseData.amount || 0);

      if (outcomeStage === 'company') {
        await caseRepository.update(caseData.id, {
          status: 'waiting_company',
          threeStateOutcome: {
            ...currentOutcomes,
            companyStated: {
              date: new Date().toISOString().slice(0, 10),
              amount: numAmount,
              note: outcomeNote || 'Company claims refund was initiated.',
            },
          },
        });
        await caseRepository.addTimelineEvent(caseData.id, {
          title: 'Company stated refund initiated',
          detail: outcomeNote || `Company claims refund of ₹${numAmount} was processed.`,
          source: 'company',
        });
        toast('Company claim logged.', 'info');
      } else if (outcomeStage === 'evidence') {
        await caseRepository.update(caseData.id, {
          threeStateOutcome: {
            ...currentOutcomes,
            evidenceFound: {
              date: new Date().toISOString().slice(0, 10),
              reference: outcomeNote,
              note: `Payment proof / UTR recorded: ${outcomeNote}`,
            },
          },
        });
        await caseRepository.addTimelineEvent(caseData.id, {
          title: 'Payment transaction reference logged',
          detail: `Reference: ${outcomeNote}`,
          source: 'evidence',
        });
        toast('Transaction proof recorded.', 'info');
      } else if (outcomeStage === 'customer') {
        await caseRepository.update(caseData.id, {
          status: 'resolved',
          customerConfirmedOutcome: 'Funds confirmed received in customer bank account',
          threeStateOutcome: {
            ...currentOutcomes,
            customerConfirmed: {
              date: new Date().toISOString().slice(0, 10),
              amountReceived: numAmount,
              note: outcomeNote || 'Verified in bank/UPI statement.',
            },
          },
        });
        await caseRepository.addTimelineEvent(caseData.id, {
          title: 'Outcome verified and confirmed by you',
          detail: `Customer checked bank account and confirmed ₹${numAmount} received. Case resolved.`,
          source: 'customer',
        });
        toast('Case outcome verified and resolved.', 'success');
      }

      setIsOutcomeModalOpen(false);
      setOutcomeNote('');
      setOutcomeAmount('');
      loadCase();
    } catch (err: any) {
      toast(`Error updating outcome: ${err.message}`, 'error');
    }
  };

  // Discrepancy math
  const claimedAmt = caseData.amount || 0;
  const companyAmt = caseData.threeStateOutcome?.companyStated?.amount ?? null;
  const receivedAmt = caseData.threeStateOutcome?.customerConfirmed?.amountReceived ?? null;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Navigation & Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => router.push('/app/cases')}
          className="inline-flex items-center gap-2 text-xs font-medium text-steel-grey-600 hover:text-charcoal transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to cases</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopyComplaint}>
            <Copy className="w-3.5 h-3.5" />
            <span>Copy complaint letter</span>
          </Button>

          <Button variant="outline" size="sm" onClick={() => setIsChannelModalOpen(true)}>
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Official routes</span>
          </Button>

          <Button variant="outline" size="sm" onClick={() => router.push('/app/documents')}>
            <Download className="w-3.5 h-3.5" />
            <span>Export proof pack</span>
          </Button>
        </div>
      </div>

      {/* Case Header Card */}
      <Card variant="elevated" className="p-6 sm:p-7 space-y-4 bg-white border border-steel-grey-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-steel-grey-600 bg-steel-grey-100 px-2 py-0.5 rounded leading-none">
              {caseData.id}
            </span>
            <span className="text-xs text-steel-grey-400">•</span>
            <span className="text-xs text-steel-grey-500">
              Created {new Date(caseData.createdAt).toLocaleDateString('en-IN')}
            </span>
          </div>

          <StatusChip status={caseData.status} size="sm" />
        </div>

        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-medium text-charcoal">
            {caseData.title}
          </h2>

          <div className="mt-2.5 flex flex-wrap items-center gap-5 text-xs sm:text-sm text-steel-grey-600">
            <div className="flex items-center gap-1.5 font-normal">
              <Building2 className="w-3.5 h-3.5 text-steel-grey-400" />
              <span>{caseData.company}</span>
            </div>

            {caseData.orderRef && (
              <div className="flex items-center gap-1.5 font-mono text-xs">
                <span className="text-steel-grey-400">Ref:</span>
                <span>{caseData.orderRef}</span>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <span className="text-steel-grey-500 font-normal">Claim amount:</span>
              <MoneyDisplay amount={caseData.amount} size="sm" />
            </div>
          </div>

          {caseData.description && (
            <p className="mt-3.5 text-xs sm:text-sm text-steel-grey-600 leading-relaxed bg-steel-grey-50 p-3.5 rounded-xl border border-steel-grey-200 font-normal">
              {caseData.description}
            </p>
          )}
        </div>

        {/* Quick Lifecycle Action Buttons */}
        <div className="pt-3 border-t border-steel-grey-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {caseData.status === 'action_required' && (
              <Button variant="secondary" size="sm" onClick={handleMarkSent}>
                <Send className="w-3.5 h-3.5" />
                <span>Mark sent to company</span>
              </Button>
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setOutcomeStage('company');
                setIsOutcomeModalOpen(true);
              }}
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Record company reply</span>
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsAddReminderOpen(true)}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Add follow-up reminder</span>
            </Button>

            {(caseData.status === 'resolved' || caseData.status === 'closed') ? (
              <Button variant="outline" size="sm" onClick={handleReopen}>
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reopen case</span>
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handleArchive}>
                <Archive className="w-3.5 h-3.5" />
                <span>Archive case</span>
              </Button>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDeleteCase}
            className="text-coral-700 hover:text-coral-800 hover:bg-coral-50 border-coral-200"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete case</span>
          </Button>
        </div>
      </Card>

      {/* Dominant Next Step Card */}
      <Card
        variant="default"
        className="border border-steel-grey-200 bg-white p-5 sm:p-6 space-y-3 rounded-2xl shadow-xs"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-coral shrink-0" />
            <span className="text-xs font-medium text-coral">
              Next step to take
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowWhyNextStep(!showWhyNextStep)}
            className="inline-flex items-center gap-1 text-xs text-steel-grey-500 hover:text-charcoal transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Why am I seeing this?</span>
          </button>
        </div>

        <p className="text-base sm:text-lg font-medium text-charcoal">
          {nextStep.action}
        </p>

        {showWhyNextStep && (
          <div className="p-3.5 rounded-xl bg-steel-grey-50 border border-steel-grey-200 text-xs text-steel-grey-600 leading-relaxed font-normal">
            <span className="font-medium text-charcoal block mb-0.5">
              Rule engine basis:
            </span>
            {nextStep.reason}
          </div>
        )}

        <div className="pt-2 flex flex-wrap gap-2.5">
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              setOutcomeStage('customer');
              setIsOutcomeModalOpen(true);
            }}
          >
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>Verify bank receipt</span>
          </Button>

          <Button variant="outline" size="md" onClick={() => router.push('/app/help')}>
            <span>Check rights guide</span>
          </Button>
        </div>
      </Card>

      {/* Refund Reality Check */}
      <Card variant="subtle" className="p-5 sm:p-6 space-y-4 bg-white border border-steel-grey-200 rounded-2xl shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-medium text-steel-grey-600">
              Refund reality check
            </h3>
            <p className="text-xs text-steel-grey-500 mt-0.5 font-normal">
              Never confuse a store promise with money received. Always compare with your bank or UPI statement.
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            className="w-full sm:w-auto shrink-0"
            onClick={() => {
              setOutcomeStage('company');
              setIsOutcomeModalOpen(true);
            }}
          >
            Record company claim
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="p-3.5 rounded-xl bg-steel-grey-50 border border-steel-grey-200">
            <span className="text-xs text-steel-grey-500 font-normal">Original claim</span>
            <div className="text-lg font-medium font-mono text-charcoal mt-1 tabular-nums">
              ₹{claimedAmt.toFixed(2)}
            </div>
            <span className="text-[11px] text-steel-grey-500 font-normal">Recorded at intake</span>
          </div>

          <div className="p-3.5 rounded-xl bg-steel-grey-50 border border-steel-grey-200">
            <span className="text-xs text-steel-grey-500 font-normal">Company promised refund</span>
            <div className="text-lg font-medium font-mono text-blue-800 mt-1 tabular-nums">
              {companyAmt !== null ? `₹${companyAmt.toFixed(2)}` : 'Not recorded'}
            </div>
            <span className="text-[11px] text-steel-grey-500 font-normal truncate block">
              {caseData.threeStateOutcome?.companyStated?.note || 'Store has not sent written refund amount'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-steel-grey-50 border border-steel-grey-200">
            <span className="text-xs text-steel-grey-500 font-normal">Confirmed in bank</span>
            <div className="text-lg font-medium font-mono text-emerald-800 mt-1 tabular-nums">
              {receivedAmt !== null ? `₹${receivedAmt.toFixed(2)}` : 'Pending verification'}
            </div>
            <span className="text-[11px] text-steel-grey-500 font-normal truncate block">
              {caseData.threeStateOutcome?.customerConfirmed ? 'Confirmed credited in bank' : 'Check bank before closing'}
            </span>
          </div>
        </div>
      </Card>

      {/* Case Timeline */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-serif font-medium text-charcoal">
            Case timeline
          </h3>
          <Button variant="secondary" size="sm" onClick={() => setIsAddEventOpen(true)}>
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span>Add event</span>
          </Button>
        </div>

        <Timeline
          events={caseData.timeline || []}
          threeStateOutcome={caseData.threeStateOutcome}
        />
      </div>

      {/* Evidence Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-serif font-medium text-charcoal">
            Supporting evidence ({(caseData.evidence || []).length})
          </h3>
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={() => setIsUploadEvidenceOpen(true)}>
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>Attach evidence</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push('/app/documents')}>
              <span>View all documents</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(caseData.evidence || []).map((item) => (
            <EvidenceTile
              key={item.id}
              item={item}
              onDownload={async () => {
                try {
                  toast(`Preparing download for ${item.name}...`, 'info');
                  const blob = await downloadAndDecryptDocument(item.id, item.name);
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = item.name;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast(`Downloaded ${item.name}`, 'success');
                } catch (err: any) {
                  toast(`Download error: ${err.message}`, 'error');
                }
              }}
              onDelete={() => handleRemoveEvidence(item.id)}
            />
          ))}
        </div>
      </div>

      {/* Add Event Modal */}
      <BottomSheet
        isOpen={isAddEventOpen}
        onClose={() => setIsAddEventOpen(false)}
        title="Add timeline event"
        description="Record a call, message, store email, or action taken"
      >
        <div className="space-y-4">
          <Input
            label="Event title"
            value={eventTitle}
            onChange={(e) => setEventTitle(e.target.value)}
            placeholder="e.g. Spoke with customer care representative"
          />

          <Select
            label="Event source"
            value={eventSource}
            onChange={(e) => setEventSource(e.target.value)}
            options={[
              { value: 'customer', label: 'You (Action taken)' },
              { value: 'company', label: 'Company statement or email' },
              { value: 'evidence', label: 'Evidence / document update' },
            ]}
          />

          <Textarea
            label="Details & notes"
            rows={3}
            value={eventDetail}
            onChange={(e) => setEventDetail(e.target.value)}
            placeholder="What was said, ticket numbers given, or promised turnaround time..."
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setIsAddEventOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddEvent}>
              Save event
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Direct Evidence Upload Modal */}
      <BottomSheet
        isOpen={isUploadEvidenceOpen}
        onClose={() => setIsUploadEvidenceOpen(false)}
        title="Attach evidence to case"
        description="Upload photos of defective product, invoice, or unboxing clip"
      >
        <div className="space-y-4">
          <div className="p-6 border border-dashed border-steel-grey-300 rounded-xl text-center space-y-2 bg-steel-grey-50">
            <UploadCloud className="w-7 h-7 text-steel-grey-400 mx-auto" />
            <div className="text-xs sm:text-sm font-medium text-charcoal">
              {uploadFile ? uploadFile.name : 'Choose a file from your device'}
            </div>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,.mp4,.txt,.eml,.csv,.json"
              onChange={(e) => {
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
                  const notices = detectSensitiveInfo(file.name);
                  if (notices.length > 0) {
                    setRedactionNotice(notices[0].warning);
                  }
                }
              }}
              className="text-xs text-steel-grey-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border file:border-steel-grey-200 file:bg-white file:text-xs"
            />
            <p className="text-[11px] text-steel-grey-500 font-normal">
              Max file size: 15 MB. Allowed: PDF, PNG, JPG, WEBP, MP4, TXT, CSV.
            </p>
          </div>

          {redactionNotice && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
              <span className="font-medium block mb-0.5">Sensitive data check:</span>
              {redactionNotice}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setIsUploadEvidenceOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleDirectEvidenceUpload} disabled={!uploadFile}>
              Attach file
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Add Follow-Up Reminder Modal */}
      <BottomSheet
        isOpen={isAddReminderOpen}
        onClose={() => setIsAddReminderOpen(false)}
        title="Schedule follow-up reminder"
        description="Set a date to compare bank records or follow up on merchant commitments"
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() + 7);
                setReminderDate(d.toISOString().slice(0, 10));
                setReminderTitle(`Follow up with ${caseData.company} care on resolution`);
              }}
              className="px-2.5 py-1 rounded-lg border border-steel-grey-200 bg-steel-grey-50 text-steel-grey-700 hover:border-steel-grey-300"
            >
              +7 Days (Customer care turnaround)
            </button>
            <button
              type="button"
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() + 3);
                setReminderDate(d.toISOString().slice(0, 10));
                setReminderTitle(`Verify bank account for ₹${caseData.amount || 0} credit`);
              }}
              className="px-2.5 py-1 rounded-lg border border-steel-grey-200 bg-steel-grey-50 text-steel-grey-700 hover:border-steel-grey-300"
            >
              +3 Days (Banking settlement)
            </button>
          </div>

          <Input
            label="Reminder action"
            value={reminderTitle}
            onChange={(e) => setReminderTitle(e.target.value)}
            placeholder="e.g. Check bank statement for refund credit"
          />

          <Input
            label="Due date"
            type="date"
            value={reminderDate}
            onChange={(e) => setReminderDate(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setIsAddReminderOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveReminder}>
              Schedule reminder
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Open Official Channel Modal */}
      <BottomSheet
        isOpen={isChannelModalOpen}
        onClose={() => setIsChannelModalOpen(false)}
        title="Official grievance channels"
        description="Select a verified avenue to file or escalate your dispute"
      >
        <div className="space-y-3">
          <a
            href="https://consumerhelpline.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 rounded-xl border border-steel-grey-200 hover:border-steel-grey-300 bg-steel-grey-50/50 transition-colors"
          >
            <div>
              <h4 className="font-medium text-sm text-charcoal">
                National Consumer Helpline (NCH)
              </h4>
              <p className="text-xs text-steel-grey-500 mt-0.5">
                Toll-free 1915 / WhatsApp 8800001915. First-line pre-litigation convergence.
              </p>
            </div>
            <ExternalLink className="w-4 h-4 text-coral shrink-0 ml-2" />
          </a>

          <a
            href="https://e-jagriti.gov.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 rounded-xl border border-steel-grey-200 hover:border-steel-grey-300 bg-steel-grey-50/50 transition-colors"
          >
            <div>
              <h4 className="font-medium text-sm text-charcoal">
                e-Jagriti Portal (Consumer Commission)
              </h4>
              <p className="text-xs text-steel-grey-500 mt-0.5">
                Official digital filing before District, State, and National Consumer Commissions.
              </p>
            </div>
            <ExternalLink className="w-4 h-4 text-coral shrink-0 ml-2" />
          </a>

          <a
            href="https://cms.rbi.org.in"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 rounded-xl border border-steel-grey-200 hover:border-steel-grey-300 bg-steel-grey-50/50 transition-colors"
          >
            <div>
              <h4 className="font-medium text-sm text-charcoal">
                RBI Integrated Ombudsman
              </h4>
              <p className="text-xs text-steel-grey-500 mt-0.5">
                Toll-free 14448. For failed UPI refunds or bank reversal discrepancies.
              </p>
            </div>
            <ExternalLink className="w-4 h-4 text-coral shrink-0 ml-2" />
          </a>

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setIsChannelModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Update Outcome / Reality Check Modal */}
      <BottomSheet
        isOpen={isOutcomeModalOpen}
        onClose={() => setIsOutcomeModalOpen(false)}
        title="Update resolution status"
        description="Record company promises or confirm money received in your bank"
      >
        <div className="space-y-4">
          <Select
            label="Resolution stage"
            value={outcomeStage}
            onChange={(e) => setOutcomeStage(e.target.value as any)}
            options={[
              { value: 'customer', label: 'Stage 3: Confirm funds received in bank (Resolved)' },
              { value: 'company', label: 'Stage 1: Store stated refund initiated' },
              { value: 'evidence', label: 'Stage 2: Payment proof / UTR number logged' },
            ]}
          />

          <Input
            label="Amount (₹)"
            type="number"
            value={outcomeAmount}
            onChange={(e) => setOutcomeAmount(e.target.value)}
            placeholder={String(caseData.amount || 0)}
          />

          <Textarea
            label={outcomeStage === 'evidence' ? 'UTR / RRN reference number' : 'Notes / transaction details'}
            rows={2}
            value={outcomeNote}
            onChange={(e) => setOutcomeNote(e.target.value)}
            placeholder={
              outcomeStage === 'customer'
                ? 'e.g. Verified ₹499 credit via bank UPI statement on Nov 8'
                : outcomeStage === 'evidence'
                ? 'e.g. UTR: 432109876543'
                : 'e.g. Support email received stating refund issued'
            }
          />

          {outcomeStage === 'customer' && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
              <span className="font-medium block mb-0.5">Verification note:</span>
              Marking this confirms you have physically verified the money in your account. The case will be marked as Confirmed Resolved.
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setIsOutcomeModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConfirmOutcome}>
              Save outcome status
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
};
