export interface ParsedComplaintFacts {
  company: string;
  issueType: string;
  amount: number | null;
  orderRef: string;
  product: string;
  dateCandidates: string[];
  desiredOutcome: string;
  signals: string[];
}

const COMMON_COMPANIES: Array<{ name: string; patterns: RegExp }> = [
  { name: 'Amazon India', patterns: /\b(?:amazon|amzn)\b/i },
  { name: 'Flipkart', patterns: /\bflipkart\b/i },
  { name: 'Myntra', patterns: /\bmyntra\b/i },
  { name: 'Swiggy', patterns: /\bswiggy(?:\s*instamart)?\b/i },
  { name: 'Zomato', patterns: /\bzomato(?:\s*blinkit)?\b/i },
  { name: 'Blinkit', patterns: /\bblinkit\b/i },
  { name: 'Zepto', patterns: /\bzepto\b/i },
  { name: 'Meesho', patterns: /\bmeesho\b/i },
  { name: 'Tata CLiQ', patterns: /\btata\s*(?:cliq|1mg)\b/i },
  { name: 'Nykaa', patterns: /\bnykaa\b/i },
  { name: 'Ajio', patterns: /\bajio\b/i },
  { name: 'MakeMyTrip', patterns: /\bmakemytrip|mmt\b/i },
  { name: 'Cleartrip', patterns: /\bcleartrip\b/i },
  { name: 'EaseMyTrip', patterns: /\beasemytrip\b/i },
  { name: 'BookMyShow', patterns: /\bbookmyshow|bms\b/i },
  { name: 'Uber', patterns: /\buber\b/i },
  { name: 'Ola', patterns: /\bola(?:\s*cabs)?\b/i },
  { name: 'Airtel', patterns: /\bairtel\b/i },
  { name: 'Jio', patterns: /\bjio\b/i },
  { name: 'Croma', patterns: /\bcroma\b/i },
  { name: 'Reliance Digital', patterns: /\breliance\s*digital\b/i },
];

export function parseComplaintText(rawText: string): ParsedComplaintFacts {
  const text = String(rawText || '').trim();
  const signals: string[] = [];

  // 1. Company Detection
  let detectedCompany = '';
  for (const item of COMMON_COMPANIES) {
    if (item.patterns.test(text)) {
      detectedCompany = item.name;
      signals.push(`Identified company: ${item.name}`);
      break;
    }
  }

  // 2. Issue Type Classification
  let issueType = 'Something else';
  if (/refund|money\s*back|deducted|reversal|chargeback/i.test(text)) {
    issueType = 'Refund not received';
    signals.push('Keyword match: refund / reversal');
  } else if (/damaged|broken|cracked|shattered|scratch|defective|faulty|dead\s*on\s*arrival|not\s*working/i.test(text)) {
    issueType = 'Damaged or defective';
    signals.push('Keyword match: damaged or defective item');
  } else if (/wrong\s*item|missing|different\s*product|incomplete|empty\s*box|counterfeit/i.test(text)) {
    issueType = 'Wrong or missing item';
    signals.push('Keyword match: wrong or missing item');
  } else if (/return\s*reject|replacement\s*denied|cannot\s*return|pickup\s*cancelled/i.test(text)) {
    issueType = 'Return or replacement issue';
    signals.push('Keyword match: return/replacement rejection');
  } else if (/delay|undelivered|not\s*delivered|delivery\s*failed|tracking\s*stuck|fake\s*delivery/i.test(text)) {
    issueType = 'Delivery problem';
    signals.push('Keyword match: delivery or tracking issue');
  } else if (/subscription|recurring|auto\s*debit|membership|cancelled/i.test(text)) {
    issueType = 'Cancellation or subscription';
    signals.push('Keyword match: cancellation/subscription');
  }

  // 3. Amount Extraction (supports ₹, INR, Rs., Rs)
  let extractedAmount: number | null = null;
  const moneyMatch = text.match(/(?:₹|INR\s*|Rs\.?\s*)([\d,]+(?:\.\d{1,2})?)/i);
  if (moneyMatch && moneyMatch[1]) {
    const cleanNum = parseFloat(moneyMatch[1].replace(/,/g, ''));
    if (!isNaN(cleanNum) && cleanNum > 0) {
      extractedAmount = cleanNum;
      signals.push(`Amount detected: ₹${cleanNum}`);
    }
  }

  // 4. Order / Reference Number Extraction
  let orderRef = '';
  const orderMatch = text.match(
    /(?:order\s*(?:id|no\.?|number|#)?|booking\s*(?:id|ref(?:erence)?|no\.?)|tracking\s*(?:id|no\.?)|AWB|OD|ticket\s*#?)\s*[:#-]?\s*([A-Za-z0-9-]{5,32})/i
  );
  if (orderMatch && orderMatch[1]) {
    orderRef = orderMatch[1].trim();
    signals.push(`Order reference: ${orderRef}`);
  }

  // 5. Product Extraction (simple rule matching)
  let product = '';
  const productMatch = text.match(/(?:ordered|bought|purchased|for\s*(?:a|my)?)\s+([a-zA-Z0-9\s-]{3,35})(?:\s+from|\s+for|\s+on|\s+worth|\.|,)/i);
  if (productMatch && productMatch[1]) {
    const candidate = productMatch[1].trim();
    if (!COMMON_COMPANIES.some((c) => c.name.toLowerCase() === candidate.toLowerCase())) {
      product = candidate;
    }
  }

  // 6. Dates Extraction (DD/MM/YYYY or YYYY-MM-DD or DD-MM-YYYY)
  const dateCandidates = [
    ...text.matchAll(/\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})\b/g),
  ].map((m) => m[0]);

  // 7. Desired Outcome
  let desiredOutcome = 'Refund';
  if (/replacement|exchange|replace/i.test(text)) {
    desiredOutcome = 'Replacement';
  } else if (/repair|fix/i.test(text)) {
    desiredOutcome = 'Repair';
  } else if (/deliver|send\s*the\s*item/i.test(text)) {
    desiredOutcome = 'Delivery';
  }

  return {
    company: detectedCompany,
    issueType,
    amount: extractedAmount,
    orderRef,
    product,
    dateCandidates,
    desiredOutcome,
    signals,
  };
}

