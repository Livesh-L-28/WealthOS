export interface ScannedReceiptLineItem {
  description: string;
  amount: number;
  quantity?: number;
}

export interface ScannedReceiptData {
  merchantName: string;
  amount: number;
  category: string;
  date: string;
  taxes?: number;
  gstin?: string;
  invoiceNumber?: string;
  lineItems?: ScannedReceiptLineItem[];
  confidence: number;
  source: 'CAMERA' | 'GALLERY' | 'PRESET' | 'UPI_QR';
  rawText?: string;
  imageUri?: string;
}

export function parseReceiptTextLocally(
  text: string,
  source: 'CAMERA' | 'GALLERY' | 'PRESET' | 'UPI_QR' = 'CAMERA'
): ScannedReceiptData {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  const BRANDS: Record<string, { name: string; category: string }> = {
    starbucks: { name: 'Starbucks Coffee', category: 'Dining & Restaurants' },
    mcdonald: { name: "McDonald's", category: 'Dining & Restaurants' },
    subway: { name: 'Subway', category: 'Dining & Restaurants' },
    domino: { name: "Domino's Pizza", category: 'Dining & Restaurants' },
    swiggy: { name: 'Swiggy', category: 'Dining & Restaurants' },
    zomato: { name: 'Zomato', category: 'Dining & Restaurants' },
    blinkit: { name: 'Blinkit', category: 'Food & Groceries' },
    zepto: { name: 'Zepto', category: 'Food & Groceries' },
    reliance: { name: 'Reliance Fresh', category: 'Food & Groceries' },
    dmart: { name: 'DMart', category: 'Food & Groceries' },
    shell: { name: 'Shell Fuel Station', category: 'Transport & Fuel' },
    hpcl: { name: 'Hindustan Petroleum', category: 'Transport & Fuel' },
    bpcl: { name: 'Bharat Petroleum', category: 'Transport & Fuel' },
    ioc: { name: 'Indian Oil', category: 'Transport & Fuel' },
    apollo: { name: 'Apollo Pharmacy', category: 'Healthcare & Wellness' },
    medplus: { name: 'MedPlus', category: 'Healthcare & Wellness' },
    decathlon: { name: 'Decathlon Sports', category: 'Shopping & Retail' },
    croma: { name: 'Croma Electronics', category: 'Technology & Cloud' },
    apple: { name: 'Apple Store', category: 'Technology & Cloud' },
    uber: { name: 'Uber India', category: 'Transport & Fuel' },
    ola: { name: 'Ola Cabs', category: 'Transport & Fuel' },
    airtel: { name: 'Airtel', category: 'Utilities & Bills' },
    jio: { name: 'Jio Telecom', category: 'Utilities & Bills' },
  };

  const lower = text.toLowerCase();
  let merchantName = '';
  let category = 'Food & Groceries';

  for (const [key, val] of Object.entries(BRANDS)) {
    if (lower.includes(key)) {
      merchantName = val.name;
      category = val.category;
      break;
    }
  }

  if (!merchantName && lines.length > 0) {
    const firstLine = lines[0].replace(/[*#=_\-:]/g, '').trim();
    merchantName = firstLine.length > 2 ? firstLine : 'Retail Store';
  }

  const gstinMatch = text.match(/\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}\b/);
  const gstin = gstinMatch ? gstinMatch[0] : undefined;

  const billMatch = text.match(/(?:invoice|bill|receipt|order)\s*(?:no\.?|#|num)?\s*[:=\s]?\s*([A-Za-z0-9\-_/]+)/i);
  const invoiceNumber = billMatch ? billMatch[1].trim() : undefined;

  const dateMatch = text.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);
  let parsedDate = new Date().toISOString().split('T')[0];
  if (dateMatch) {
    const [, d1, d2, y] = dateMatch;
    const year = y.length === 4 ? y : `20${y}`;
    parsedDate = `${year}-${d2.padStart(2, '0')}-${d1.padStart(2, '0')}`;
  }

  let amount = 0;
  for (const line of lines) {
    if (/subtotal/i.test(line)) continue;
    const match = line.match(/(?:total|grand\s*total|net\s*amount|bill\s*amount|amount\s*payable|paid)\s*[:=\s]?\s*(?:₹|rs\.?|inr)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
    if (match) {
      amount = parseFloat(match[1].replace(/,/g, ''));
      break;
    }
  }

  let taxes = 0;
  const taxMatch = text.match(/(?:cgst\s*\+\s*sgst|gst|vat(?:\s*\/\s*taxes)?|tax(?:es)?)\s*[:=\s]?\s*(?:₹|rs\.?|inr)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
  if (taxMatch) {
    taxes = parseFloat(taxMatch[1].replace(/,/g, ''));
  }

  const lineItems: ScannedReceiptLineItem[] = [];
  for (const line of lines) {
    const itemMatch = line.match(/^(.+?)\s+(?:x?\s*(\d+)\s+)?(?:₹|rs\.?|inr)?\s*([0-9,]+\.[0-9]{2})$/i);
    if (itemMatch) {
      const desc = itemMatch[1].trim();
      const qty = parseInt(itemMatch[2] || '1', 10);
      const val = parseFloat(itemMatch[3].replace(/,/g, ''));
      if (!/(?:total|subtotal|tax|cgst|sgst|igst|gst|discount|change|cash|card|round\s*off)/i.test(desc)) {
        lineItems.push({ description: desc, quantity: qty, amount: val });
      }
    }
  }

  if (amount === 0 && lineItems.length > 0) {
    amount = lineItems.reduce((acc, curr) => acc + curr.amount, 0);
  }
  const confidence = amount > 0 ? 0.95 : 0.35;

  return {
    merchantName: merchantName || 'Retail Merchant',
    amount,
    category,
    date: parsedDate,
    taxes: taxes > 0 ? taxes : undefined,
    gstin,
    invoiceNumber,
    lineItems,
    confidence,
    source,
    rawText: text,
  };
}


export interface PresetReceipt {
  id: string;
  label: string;
  merchant: string;
  category: string;
  amount: number;
  taxes: number;
  gstin: string;
  invoiceNumber: string;
  icon: string;
  rawText: string;
}

export const SAMPLE_RECEIPTS: PresetReceipt[] = [
  {
    id: 'sbx',
    label: 'Starbucks Coffee',
    merchant: 'Starbucks Coffee',
    category: 'Dining & Restaurants',
    amount: 598.50,
    taxes: 28.50,
    gstin: '27AABCT3456K1Z9',
    invoiceNumber: 'SBX-2026-98124',
    icon: '☕',
    rawText: 'STARBUCKS COFFEE INDIA\nTata Starbucks Private Limited\nGSTIN: 27AABCT3456K1Z9\nBill No: SBX-2026-98124\nDate: 12/11/2026\n\nCaffe Latte Grande       1   ₹350.00\nBlueberry Muffin         1   ₹220.00\nSubtotal: ₹570.00\nCGST + SGST: ₹28.50\nTOTAL: ₹598.50\nPaid via Credit Card',
  },
  {
    id: 'shell',
    label: 'Shell Petrol Station',
    merchant: 'Shell Fuel Station',
    category: 'Transport & Fuel',
    amount: 1550.00,
    taxes: 75.00,
    gstin: '29AAFCS1234F1Z5',
    invoiceNumber: 'SHL-BLR-4421',
    icon: '⛽',
    rawText: 'SHELL FUEL STATION\nShell India Markets Private Limited\nGSTIN: 29AAFCS1234F1Z5\nBill No: SHL-BLR-4421\nDate: 11/11/2026\n\nPower Petrol 15L             ₹1550.00\nSubtotal: ₹1475.00\nVAT / Taxes: ₹75.00\nTOTAL: ₹1550.00\nPaid via UPI',
  },
  {
    id: 'apollo',
    label: 'Apollo Pharmacy',
    merchant: 'Apollo Pharmacy',
    category: 'Healthcare & Wellness',
    amount: 850.50,
    taxes: 42.50,
    gstin: '33AABCA8841M1ZN',
    invoiceNumber: 'APL-MED-1029',
    icon: '💊',
    rawText: 'APOLLO PHARMACY\nApollo Hospitals Enterprise Limited\nGSTIN: 33AABCA8841M1ZN\nBill No: APL-MED-1029\nDate: 10/11/2026\n\nMultivitamin Capsules    1   ₹490.00\nElectral ORS Pack        5   ₹318.00\nSubtotal: ₹808.00\nGST: ₹42.50\nTOTAL: ₹850.50\nPaid via Google Pay',
  },
  {
    id: 'reliance',
    label: 'Reliance Fresh Supermarket',
    merchant: 'Reliance Fresh',
    category: 'Food & Groceries',
    amount: 1240.00,
    taxes: 62.00,
    gstin: '27AABCR9920F1ZT',
    invoiceNumber: 'REL-STR-8832',
    icon: '🛒',
    rawText: 'RELIANCE FRESH SUPERMARKET\nReliance Retail Limited\nGSTIN: 27AABCR9920F1ZT\nBill No: REL-STR-8832\nDate: 09/11/2026\n\nOrganic A2 Milk 2L       2   ₹160.00\nWhole Wheat Atta 5kg     1   ₹320.00\nFresh Veg Basket         1   ₹760.00\nSubtotal: ₹1178.00\nGST / Taxes: ₹62.00\nTOTAL: ₹1240.00\nPaid via Debit Card',
  },
  {
    id: 'swiggy',
    label: 'Swiggy Food Delivery',
    merchant: 'Swiggy',
    category: 'Dining & Restaurants',
    amount: 485.00,
    taxes: 24.25,
    gstin: '29AABCS8891P1ZV',
    invoiceNumber: 'SWG-ORD-66712',
    icon: '🍲',
    rawText: 'SWIGGY FOOD ORDER\nBundl Technologies Private Limited\nGSTIN: 29AABCS8891P1ZV\nOrder ID: SWG-ORD-66712\nDate: 08/11/2026\n\nButter Chicken Meal Bowl 1   ₹380.00\nGarlic Naan              2   ₹80.00\nDelivery Fee & Platform      ₹25.00\nGST (5%): ₹24.25\nTOTAL: ₹485.00\nPaid via PhonePe UPI',
  },
];

export async function scanReceiptWithHybridOCR(params: {
  rawText?: string;
  imageUri?: string;
  imageBase64?: string;
  qrPayload?: string;
  source?: 'CAMERA' | 'GALLERY' | 'PRESET' | 'UPI_QR';
  apiBaseUrl?: string;
  authToken?: string;
}): Promise<ScannedReceiptData> {
  const source = params.source || 'CAMERA';

  if (params.apiBaseUrl && (params.rawText || params.imageBase64 || params.qrPayload)) {
    try {
      const res = await fetch(`${params.apiBaseUrl}/api/v1/documents/scan-receipt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(params.authToken ? { Authorization: `Bearer ${params.authToken}` } : {}),
        },
        body: JSON.stringify({
          raw_text: params.rawText,
          image_base64: params.imageBase64,
          qr_payload: params.qrPayload,
          filename: 'receipt_mobile.jpg',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return {
          merchantName: data.merchant_name,
          amount: parseFloat(data.amount),
          category: data.category,
          date: data.date,
          taxes: data.taxes ? parseFloat(data.taxes) : undefined,
          gstin: data.gstin,
          invoiceNumber: data.invoice_number,
          lineItems: data.line_items?.map((li: any) => ({
            description: li.description,
            amount: parseFloat(li.amount),
            quantity: li.quantity ? parseInt(li.quantity, 10) : 1,
          })),
          confidence: data.confidence ? parseFloat(data.confidence) : 0.96,
          source,
          rawText: data.raw_text || params.rawText,
          imageUri: params.imageUri,
        };
      }
    } catch {
      // offline fallback
    }
  }

  return parseReceiptTextLocally(params.rawText || '', source);
}

export async function captureReceiptFromCamera(): Promise<{ uri: string; base64?: string } | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ImagePicker = require('expo-image-picker');
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Camera permission denied. Please enable camera access in settings.');
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions?.Images || 'Images',
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
      base64: true,
    });
    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }
    const asset = result.assets[0];
    return {
      uri: asset.uri,
      base64: asset.base64 || undefined,
    };
  } catch (err: any) {
    if (err.message && err.message.includes('permission')) {
      throw err;
    }
    return null;
  }
}

export async function pickReceiptFromLibrary(): Promise<{ uri: string; base64?: string } | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ImagePicker = require('expo-image-picker');
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Photo gallery permission denied. Please enable access in settings.');
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions?.Images || 'Images',
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
      base64: true,
    });
    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }
    const asset = result.assets[0];
    return {
      uri: asset.uri,
      base64: asset.base64 || undefined,
    };
  } catch (err: any) {
    if (err.message && err.message.includes('permission')) {
      throw err;
    }
    return null;
  }
}

