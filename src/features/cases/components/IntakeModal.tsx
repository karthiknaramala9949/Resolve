import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Select, Textarea, useToast, BottomSheet } from '@/design-system';
import { parseComplaintText } from '@/lib/rules/intakeParser';
import { caseRepository } from '@/lib/db/repositories';
import { Sparkles, Mic, MicOff, Edit2, ArrowRight, Building2, Tag, IndianRupee, Hash } from 'lucide-react';

interface IntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefill?: {
    store?: string;
    product?: string;
    orderRef?: string;
    amount?: number;
    story?: string;
  };
}

export const IntakeModal: React.FC<IntakeModalProps> = ({
  isOpen,
  onClose,
  prefill,
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [story, setStory] = useState(prefill?.story || '');
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [voiceConsentGiven, setVoiceConsentGiven] = useState(false);
  const [showVoiceNotice, setShowVoiceNotice] = useState(false);
  const recognitionRef = React.useRef<any>(null);

  // Parsed facts state
  const [company, setCompany] = useState(prefill?.store || '');
  const [issueType, setIssueType] = useState('Refund not received');
  const [amount, setAmount] = useState<string>(prefill?.amount ? String(prefill.amount) : '');
  const [orderRef, setOrderRef] = useState(prefill?.orderRef || '');
  const [product, setProduct] = useState(prefill?.product || '');
  const [desiredOutcome, setDesiredOutcome] = useState('Refund');

  const [activeChipEdit, setActiveChipEdit] = useState<string | null>(null);

  // Update story if prefill changes
  useEffect(() => {
    if (prefill?.story && !story) {
      setStory(prefill.story);
    }
  }, [prefill]);

  // Check speech recognition support
  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      setSpeechSupported(true);
    }
  }, []);

  // Live Rule-based parser trigger on typing
  useEffect(() => {
    if (!story.trim()) return;

    const parsed = parseComplaintText(story);

    if (parsed.company && !company) {
      setCompany(parsed.company);
    }
    if (parsed.issueType && parsed.issueType !== 'Something else') {
      setIssueType(parsed.issueType);
    }
    if (parsed.amount !== null && !amount) {
      setAmount(String(parsed.amount));
    }
    if (parsed.orderRef && !orderRef) {
      setOrderRef(parsed.orderRef);
    }
    if (parsed.product && !product) {
      setProduct(parsed.product);
    }
    if (parsed.desiredOutcome) {
      setDesiredOutcome(parsed.desiredOutcome);
    }
  }, [story]);

  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => {
      setIsRecording(false);
      toast('Voice capture interrupted. You can type directly.', 'warning');
    };
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setStory((prev) => (prev ? `${prev} ${transcript}` : transcript));
      toast('Voice transcribed via browser speech service.', 'info');
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setIsRecording(false);
    }
  };

  // Voice note capture via Web Speech API with explicit user opt-in
  const toggleVoice = () => {
    if (!speechSupported) {
      toast('Speech recognition is not supported in this browser.', 'warning');
      return;
    }

    if (isRecording) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsRecording(false);
      return;
    }

    if (!voiceConsentGiven) {
      setShowVoiceNotice(true);
      return;
    }

    startListening();
  };

  const handleSample = (sampleText: string) => {
    setStory(sampleText);
    const parsed = parseComplaintText(sampleText);
    if (parsed.company) setCompany(parsed.company);
    if (parsed.issueType) setIssueType(parsed.issueType);
    if (parsed.amount) setAmount(String(parsed.amount));
    if (parsed.orderRef) setOrderRef(parsed.orderRef);
  };

  const handleCreateCase = async () => {
    if (!story.trim()) {
      toast('Please describe the problem in a few words.', 'warning');
      return;
    }

    const newId = `RS-${Math.floor(10000 + Math.random() * 90000)}`;
    const parsedAmount = amount ? parseFloat(amount) : null;

    try {
      const created = await caseRepository.create({
        id: newId,
        title: product ? `${issueType} for ${product}` : `${issueType} from ${company || 'Store'}`,
        issueType,
        company: company || 'Company unrecorded',
        orderRef,
        product,
        amount: isNaN(parsedAmount as number) ? null : parsedAmount,
        desiredOutcome,
        description: story,
        status: 'action_required',
        nextAction: 'Review your case summary and add supporting evidence files.',
        nextStepReason: 'Your case facts are recorded. Attach proof like order receipt or photos.',
        timeline: [],
        evidence: [],
      });

      toast(`Dispute case ${created.id} created successfully!`, 'success');
      onClose();
      navigate(`/app/cases/${created.id}`);
    } catch (err: any) {
      toast(`Error creating case: ${err.message}`, 'error');
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Tell us what happened"
      description="In plain words, what went wrong? We will organize the facts into an actionable case."
      className="max-w-2xl"
    >
      <div className="space-y-5">
        {/* Quick sample chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-neutral-500 font-medium shrink-0">Try a sample:</span>
          <button
            type="button"
            onClick={() =>
              handleSample(
                'I ordered a phone case from Example Store for ₹499 on Oct 28. Order #EX-2048. I returned it via pickup on Oct 30 but refund has not arrived in my account.'
              )
            }
            className="px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-300 shrink-0 transition-colors"
          >
            Refund not received
          </button>
          <button
            type="button"
            onClick={() =>
              handleSample(
                'Bought wireless earbuds from Flipkart for ₹2,499. Order OD330192841. Arrived with left earbud defective and seller rejected my return request.'
              )
            }
            className="px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-300 shrink-0 transition-colors"
          >
            Defective item rejected
          </button>
        </div>

        {/* Story Textarea with voice button */}
        <div className="relative">
          <Textarea
            rows={4}
            value={story}
            onChange={(e) => setStory(e.target.value)}
            placeholder="e.g. I bought a shirt from Myntra for ₹1,299 on Order #MY-8821. It arrived torn, and customer support refused replacement..."
            className="pr-12 text-base"
          />

          {/* Voice trigger */}
          {speechSupported && (
            <button
              type="button"
              onClick={toggleVoice}
              className={`absolute right-3 top-3 p-2 rounded-lg transition-colors ${
                isRecording
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
              title={isRecording ? 'Listening... click to stop' : 'Record voice note (in-browser Speech API)'}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Explicit Voice Transcription Opt-In Notice */}
        {showVoiceNotice && (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-3 animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <Mic className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-sm">Microphone Transcription Notice</p>
                <p className="mt-1 leading-relaxed text-xs">
                  Your browser may send audio to its speech provider (for example Google in Chrome) to transcribe it. Use typing if you prefer.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowVoiceNotice(false)}
                className="px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                Cancel, I will type
              </button>
              <button
                type="button"
                onClick={() => {
                  setVoiceConsentGiven(true);
                  setShowVoiceNotice(false);
                  startListening();
                }}
                className="px-3 py-1.5 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-700 transition-colors"
              >
                I understand, start microphone
              </button>
            </div>
          </div>
        )}

        {isRecording && (
          <p className="text-xs text-red-600 dark:text-red-400 font-medium animate-pulse flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-600 inline-block animate-ping" />
            <span>Listening... Speak clearly into your microphone. Tap microphone icon to stop.</span>
          </p>
        )}

        {/* Live Rule-based chips card */}
        <div className="p-4 rounded-xl border border-brand-200/80 dark:border-brand-900/60 bg-brand-50/30 dark:bg-brand-950/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-700 dark:text-brand-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Suggested from your words (local rule-based parsing, not AI)</span>
            </div>
            <span className="text-[11px] text-neutral-400">Click any chip to edit</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Company Chip */}
            <button
              type="button"
              onClick={() => setActiveChipEdit(activeChipEdit === 'company' ? null : 'company')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                company
                  ? 'bg-white dark:bg-surface-dark border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-2xs'
                  : 'bg-neutral-100 dark:bg-neutral-800 border-dashed border-neutral-300 text-neutral-400'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-neutral-400" />
              <span>Company: {company || 'Add company'}</span>
              <Edit2 className="w-3 h-3 text-neutral-400 ml-1" />
            </button>

            {/* Issue Type Chip */}
            <button
              type="button"
              onClick={() => setActiveChipEdit(activeChipEdit === 'issue' ? null : 'issue')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-white dark:bg-surface-dark border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 text-xs font-medium shadow-2xs"
            >
              <Tag className="w-3.5 h-3.5 text-brand-500" />
              <span>Issue: {issueType}</span>
              <Edit2 className="w-3 h-3 text-neutral-400 ml-1" />
            </button>

            {/* Amount Chip */}
            <button
              type="button"
              onClick={() => setActiveChipEdit(activeChipEdit === 'amount' ? null : 'amount')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                amount
                  ? 'bg-white dark:bg-surface-dark border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-2xs'
                  : 'bg-neutral-100 dark:bg-neutral-800 border-dashed border-neutral-300 text-neutral-400'
              }`}
            >
              <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
              <span>Amount: {amount ? `₹${amount}` : 'Add amount'}</span>
              <Edit2 className="w-3 h-3 text-neutral-400 ml-1" />
            </button>

            {/* Order Ref Chip */}
            <button
              type="button"
              onClick={() => setActiveChipEdit(activeChipEdit === 'order' ? null : 'order')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                orderRef
                  ? 'bg-white dark:bg-surface-dark border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-2xs'
                  : 'bg-neutral-100 dark:bg-neutral-800 border-dashed border-neutral-300 text-neutral-400'
              }`}
            >
              <Hash className="w-3.5 h-3.5 text-neutral-400" />
              <span>Order #: {orderRef || 'Add reference'}</span>
              <Edit2 className="w-3 h-3 text-neutral-400 ml-1" />
            </button>
          </div>

          {/* Active Inline Chip Editor */}
          {activeChipEdit && (
            <div className="pt-2 border-t border-brand-100 dark:border-brand-900/40 animate-in fade-in">
              {activeChipEdit === 'company' && (
                <div className="flex gap-2">
                  <Input
                    label="Company or Seller Name"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Flipkart, Amazon, Swiggy..."
                  />
                  <Button size="sm" variant="secondary" className="mt-7" onClick={() => setActiveChipEdit(null)}>
                    Done
                  </Button>
                </div>
              )}
              {activeChipEdit === 'issue' && (
                <div className="flex gap-2">
                  <Select
                    label="Dispute Issue Category"
                    value={issueType}
                    onChange={(e) => {
                      setIssueType(e.target.value);
                      setActiveChipEdit(null);
                    }}
                    options={[
                      { value: 'Refund not received', label: 'Refund not received' },
                      { value: 'Wrong or missing item', label: 'Wrong or missing item' },
                      { value: 'Damaged or defective', label: 'Damaged or defective' },
                      { value: 'Return or replacement issue', label: 'Return or replacement issue' },
                      { value: 'Delivery problem', label: 'Delivery problem' },
                      { value: 'Service quality or billing', label: 'Service quality or billing' },
                      { value: 'Cancellation or subscription', label: 'Cancellation or subscription' },
                      { value: 'Something else', label: 'Something else' },
                    ]}
                  />
                </div>
              )}
              {activeChipEdit === 'amount' && (
                <div className="flex gap-2">
                  <Input
                    label="Claim Amount (₹)"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 1499"
                  />
                  <Button size="sm" variant="secondary" className="mt-7" onClick={() => setActiveChipEdit(null)}>
                    Done
                  </Button>
                </div>
              )}
              {activeChipEdit === 'order' && (
                <div className="flex gap-2">
                  <Input
                    label="Order / Booking Reference #"
                    value={orderRef}
                    onChange={(e) => setOrderRef(e.target.value)}
                    placeholder="e.g. OD330192841"
                  />
                  <Button size="sm" variant="secondary" className="mt-7" onClick={() => setActiveChipEdit(null)}>
                    Done
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Confirmation */}
        <div className="pt-2 flex items-center justify-between gap-3">
          <span className="text-xs text-neutral-500">
            You will review every action before anything is sent.
          </span>
          <Button
            variant="primary"
            size="lg"
            onClick={handleCreateCase}
            className="shadow-elevated px-6"
          >
            <span>Confirm & Create Case</span>
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
};
