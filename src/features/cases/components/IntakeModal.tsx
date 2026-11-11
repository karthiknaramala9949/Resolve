'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Select, Textarea, useToast, BottomSheet } from '@/design-system';
import { parseComplaintText } from '@/lib/rules/intakeParser';
import { caseService } from '@/services';
import { SlidersHorizontal, Mic, MicOff, Edit2, ArrowRight, Building2, Tag, IndianRupee, Hash } from 'lucide-react';

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
  const router = useRouter();
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
      toast('Speech recognition error. Please type your complaint.', 'warning');
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setStory((prev) => (prev ? `${prev} ${transcript}` : transcript));
      toast('Voice transcript added.', 'info');
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const toggleVoice = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      if (!voiceConsentGiven) {
        setShowVoiceNotice(true);
      } else {
        startListening();
      }
    }
  };

  const handleSample = (text: string) => {
    setStory(text);
    const parsed = parseComplaintText(text);
    if (parsed.company) setCompany(parsed.company);
    if (parsed.issueType) setIssueType(parsed.issueType);
    if (parsed.amount !== null) setAmount(String(parsed.amount));
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
      const created = await caseService.createCase({
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

      toast(`Dispute case ${created.id} created.`, 'success');
      onClose();
      router.push(`/app/cases/${created.id}`);
    } catch (err: any) {
      toast(`Error creating case: ${err.message}`, 'error');
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Tell us what happened"
      description="In plain words, what went wrong? We will organize the facts into an actionable case"
      className="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Quick sample chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-steel-grey-500 font-normal shrink-0">Sample:</span>
          <button
            type="button"
            onClick={() =>
              handleSample(
                'I ordered a phone case from Example Store for ₹499 on Oct 28. Order #EX-2048. I returned it via pickup on Oct 30 but refund has not arrived in my account.'
              )
            }
            className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-steel-grey-100 hover:bg-steel-grey-200 text-steel-grey-700 shrink-0 transition-colors leading-none"
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
            className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-steel-grey-100 hover:bg-steel-grey-200 text-steel-grey-700 shrink-0 transition-colors leading-none"
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
            className="pr-12 text-sm"
          />

          {/* Voice trigger */}
          {speechSupported && (
            <button
              type="button"
              onClick={toggleVoice}
              className={`absolute right-3 top-3 p-1.5 rounded-lg transition-colors ${
                isRecording
                  ? 'bg-coral text-white'
                  : 'text-steel-grey-400 hover:text-charcoal hover:bg-steel-grey-100'
              }`}
              title={isRecording ? 'Listening... click to stop' : 'Record voice note'}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Voice Transcription Opt-In Notice */}
        {showVoiceNotice && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
            <div className="flex items-start gap-2">
              <Mic className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Microphone access</p>
                <p className="mt-0.5 leading-relaxed text-xs text-amber-800">
                  Your browser converts your spoken words into text. You can type instead if you prefer.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowVoiceNotice(false)}
                className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg border border-steel-grey-200 bg-white text-steel-grey-700 hover:bg-steel-grey-50 text-xs leading-none"
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
                className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-coral text-white font-medium hover:bg-coral-600 transition-colors text-xs leading-none"
              >
                Start microphone
              </button>
            </div>
          </div>
        )}

        {isRecording && (
          <p className="text-xs text-coral font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-coral inline-block" />
            <span>Listening... Speak clearly. Tap microphone icon to finish.</span>
          </p>
        )}

        {/* Detected facts card */}
        <div className="p-4 rounded-xl border border-steel-grey-200 bg-steel-grey-50/50 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-medium text-coral">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Information found in your description</span>
            </div>
            <span className="text-[11px] text-steel-grey-500">Tap chip to edit</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Company Chip */}
            <button
              type="button"
              onClick={() => setActiveChipEdit(activeChipEdit === 'company' ? null : 'company')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors leading-none ${
                company
                  ? 'bg-white border-steel-grey-200 text-charcoal shadow-2xs'
                  : 'bg-steel-grey-50 border-dashed border-steel-grey-300 text-steel-grey-400'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-steel-grey-400 shrink-0" />
              <span>Store: {company || 'Add company'}</span>
              <Edit2 className="w-3 h-3 text-steel-grey-400 shrink-0" />
            </button>

            {/* Issue Type Chip */}
            <button
              type="button"
              onClick={() => setActiveChipEdit(activeChipEdit === 'issue' ? null : 'issue')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-white border-steel-grey-200 text-charcoal text-xs font-medium shadow-2xs leading-none"
            >
              <Tag className="w-3.5 h-3.5 text-coral shrink-0" />
              <span>Issue: {issueType}</span>
              <Edit2 className="w-3 h-3 text-steel-grey-400 shrink-0" />
            </button>

            {/* Amount Chip */}
            <button
              type="button"
              onClick={() => setActiveChipEdit(activeChipEdit === 'amount' ? null : 'amount')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors leading-none ${
                amount
                  ? 'bg-white border-steel-grey-200 text-charcoal shadow-2xs'
                  : 'bg-steel-grey-50 border-dashed border-steel-grey-300 text-steel-grey-400'
              }`}
            >
              <IndianRupee className="w-3.5 h-3.5 text-coral shrink-0" />
              <span>Amount: {amount ? `₹${amount}` : 'Add amount'}</span>
              <Edit2 className="w-3 h-3 text-steel-grey-400 shrink-0" />
            </button>

            {/* Order Ref Chip */}
            <button
              type="button"
              onClick={() => setActiveChipEdit(activeChipEdit === 'order' ? null : 'order')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors leading-none ${
                orderRef
                  ? 'bg-white border-steel-grey-200 text-charcoal shadow-2xs'
                  : 'bg-steel-grey-50 border-dashed border-steel-grey-300 text-steel-grey-400'
              }`}
            >
              <Hash className="w-3.5 h-3.5 text-steel-grey-400 shrink-0" />
              <span>Ref: {orderRef || 'Add reference'}</span>
              <Edit2 className="w-3 h-3 text-steel-grey-400 shrink-0" />
            </button>
          </div>

          {/* Active Inline Chip Editor */}
          {activeChipEdit && (
            <div className="pt-2 border-t border-steel-grey-200 animate-in fade-in">
              {activeChipEdit === 'company' && (
                <div className="flex gap-2">
                  <Input
                    label="Company or seller name"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Flipkart, Amazon, Swiggy"
                  />
                  <Button size="sm" variant="secondary" className="mt-7" onClick={() => setActiveChipEdit(null)}>
                    Done
                  </Button>
                </div>
              )}
              {activeChipEdit === 'issue' && (
                <div className="flex gap-2">
                  <Select
                    label="Dispute category"
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
                    label="Claim amount (₹)"
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
                    label="Order / booking reference #"
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
        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <span className="text-xs text-steel-grey-500">
            You review every filing before anything is sent.
          </span>
          <Button
            variant="primary"
            size="md"
            onClick={handleCreateCase}
            className="w-full sm:w-auto shrink-0 shadow-2xs px-5"
          >
            <span>Create dispute case</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
};
