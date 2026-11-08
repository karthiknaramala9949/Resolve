export interface RedactionNotice {
  type: 'aadhaar' | 'card' | 'pan' | 'phone';
  label: string;
  warning: string;
}

export function detectSensitiveInfo(text: string): RedactionNotice[] {
  const notices: RedactionNotice[] = [];
  const content = String(text || '');

  // 1. Aadhaar Number (12 digits with optional spaces/hyphens)
  const aadhaarRegex = /\b[2-9]{1}\d{3}[ -]?\d{4}[ -]?\d{4}\b/;
  if (aadhaarRegex.test(content)) {
    notices.push({
      type: 'aadhaar',
      label: 'Possible Aadhaar Number Detected',
      warning: 'Aadhaar numbers should be masked (e.g. XXXX-XXXX-1234) before sharing externally per UIDAI guidelines.',
    });
  }

  // 2. 16-digit Debit / Credit Card Number
  const cardRegex = /\b(?:\d{4}[ -]?){3}\d{4}\b/;
  if (cardRegex.test(content)) {
    notices.push({
      type: 'card',
      label: 'Possible Payment Card Number Detected',
      warning: 'Never expose full 16-digit debit/credit card numbers or CVVs in evidence packs.',
    });
  }

  // 3. Indian PAN Card (5 letters, 4 numbers, 1 letter)
  const panRegex = /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/;
  if (panRegex.test(content)) {
    notices.push({
      type: 'pan',
      label: 'Possible PAN Card Number Detected',
      warning: 'Ensure your PAN number is necessary for this complaint before including it.',
    });
  }

  return notices;
}

