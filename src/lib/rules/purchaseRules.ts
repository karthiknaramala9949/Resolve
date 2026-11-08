export interface ReturnWindowCalculation {
  status: 'active' | 'last_day' | 'closed' | 'unknown';
  daysLeft: number;
  label: string;
}

export function calculateReturnWindow(
  deliveryDateStr: string | undefined | null,
  returnWindowDays: number = 7
): ReturnWindowCalculation {
  if (!deliveryDateStr) {
    return {
      status: 'unknown',
      daysLeft: 0,
      label: 'Delivery date unrecorded',
    };
  }

  try {
    const deliveryDate = new Date(deliveryDateStr + 'T00:00:00');
    if (isNaN(deliveryDate.getTime())) {
      return { status: 'unknown', daysLeft: 0, label: 'Invalid date format' };
    }

    const now = new Date();
    // Compare dates at start of day
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const delivery = new Date(deliveryDate.getFullYear(), deliveryDate.getMonth(), deliveryDate.getDate());

    const daysPassed = Math.floor((today.getTime() - delivery.getTime()) / (1000 * 60 * 60 * 24));
    const daysLeft = returnWindowDays - daysPassed;

    if (daysLeft > 1) {
      return {
        status: 'active',
        daysLeft,
        label: `${daysLeft} days remaining to return`,
      };
    } else if (daysLeft === 1) {
      return {
        status: 'active',
        daysLeft: 1,
        label: '1 day remaining (Action urgent)',
      };
    } else if (daysLeft === 0) {
      return {
        status: 'last_day',
        daysLeft: 0,
        label: 'Last day to return today',
      };
    } else {
      return {
        status: 'closed',
        daysLeft,
        label: `Return window ended ${Math.abs(daysLeft)} day(s) ago`,
      };
    }
  } catch {
    return { status: 'unknown', daysLeft: 0, label: 'Error calculating window' };
  }
}

export interface WarrantyCalculation {
  status: 'active' | 'expired' | 'unknown';
  monthsLeft: number;
  label: string;
}

export function calculateWarranty(
  purchaseDateStr: string | undefined | null,
  warrantyMonths: number = 12
): WarrantyCalculation {
  if (!purchaseDateStr) {
    return { status: 'unknown', monthsLeft: 0, label: 'Purchase date unrecorded' };
  }

  try {
    const purchaseDate = new Date(purchaseDateStr + 'T00:00:00');
    if (isNaN(purchaseDate.getTime())) {
      return { status: 'unknown', monthsLeft: 0, label: 'Invalid date' };
    }

    const expiryDate = new Date(purchaseDate);
    expiryDate.setMonth(expiryDate.getMonth() + warrantyMonths);

    const now = new Date();
    const msLeft = expiryDate.getTime() - now.getTime();
    const monthsLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24 * 30.4375));

    if (monthsLeft > 0) {
      return {
        status: 'active',
        monthsLeft,
        label: `${monthsLeft} month(s) warranty remaining`,
      };
    } else {
      return {
        status: 'expired',
        monthsLeft: 0,
        label: 'Warranty expired',
      };
    }
  } catch {
    return { status: 'unknown', monthsLeft: 0, label: 'Error calculating warranty' };
  }
}

export function parsePastedPurchaseText(raw: string) {
  const text = String(raw || '');
  const pick = (regex: RegExp) => {
    const m = text.match(regex);
    return m ? m[1].trim() : '';
  };

  const storeMatch = text.match(/(?:store|platform|bought\s*from|merchant|seller)\s*[:=-]?\s*([^\n\r]+)/i);
  const store = storeMatch ? storeMatch[1].trim() : 'Other Store';

  const orderRef = pick(/(?:order\s*(?:id|no\.?|number|#)?|booking\s*(?:id|ref(?:erence)?))\s*[:#-]?\s*([A-Za-z0-9-]{5,35})/i);
  const product = pick(/(?:product|item|description|title)\s*[:=-]\s*([^\n\r]+)/i);
  const amountStr = pick(/(?:total|amount|price|paid)\s*[:=-]?\s*(?:₹|INR\s*|Rs\.?\s*)?([\d,]+(?:\.\d{1,2})?)/i);
  const purchaseDate = pick(/(?:order\s*date|purchase\s*date|ordered\s*on)\s*[:=-]\s*(\d{4}-\d{2}-\d{2})/i);
  const deliveryDate = pick(/(?:delivered\s*on|delivery\s*date)\s*[:=-]\s*(\d{4}-\d{2}-\d{2})/i);

  const amount = amountStr ? parseFloat(amountStr.replace(/,/g, '')) : null;

  return {
    store,
    product: product || 'Purchased Item',
    orderRef,
    amount,
    purchaseDate,
    deliveryDate,
    returnWindowDays: 7,
    warrantyMonths: 12,
  };
}
