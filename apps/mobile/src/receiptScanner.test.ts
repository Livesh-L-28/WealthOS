import { describe, it, expect } from 'vitest';
import {
  parseReceiptTextLocally,
  scanReceiptWithHybridOCR,
  SAMPLE_RECEIPTS,
} from './receiptScannerService';

describe('Receipt Scanner & OCR Intelligence Service', () => {
  it('correctly parses merchant, amount, taxes, and category from Starbucks receipt text', () => {
    const text = `
    STARBUCKS COFFEE INDIA
    Tata Starbucks Private Limited
    GSTIN: 27AABCT3456K1Z9
    Bill No: SBX-2026-98124
    Date: 12/11/2026

    Caffe Latte Grande       1   ₹350.00
    Blueberry Muffin         1   ₹220.00
    Subtotal: ₹570.00
    CGST + SGST: ₹28.50
    TOTAL: ₹598.50
    Paid via Credit Card
    `;

    const result = parseReceiptTextLocally(text, 'PRESET');

    expect(result.merchantName).toBe('Starbucks Coffee');
    expect(result.category).toBe('Dining & Restaurants');
    expect(result.amount).toBe(598.5);
    expect(result.taxes).toBe(28.5);
    expect(result.gstin).toBe('27AABCT3456K1Z9');
    expect(result.invoiceNumber).toBe('SBX-2026-98124');
    expect(result.lineItems).toHaveLength(2);
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('correctly extracts fuel station receipts while bypassing subtotal', () => {
    const text = `
    SHELL FUEL STATION
    Shell India Markets Private Limited
    GSTIN: 29AAFCS1234F1Z5
    Bill No: SHL-BLR-4421
    Date: 11/11/2026

    Power Petrol 15L             ₹1550.00
    Subtotal: ₹1475.00
    VAT / Taxes: ₹75.00
    TOTAL: ₹1550.00
    Paid via UPI
    `;

    const result = parseReceiptTextLocally(text, 'CAMERA');

    expect(result.merchantName).toBe('Shell Fuel Station');
    expect(result.category).toBe('Transport & Fuel');
    expect(result.amount).toBe(1550);
    expect(result.taxes).toBe(75);
    expect(result.gstin).toBe('29AAFCS1234F1Z5');
  });

  it('correctly parses healthcare & pharmacy invoices', () => {
    const text = `
    APOLLO PHARMACY
    Apollo Hospitals Enterprise Limited
    GSTIN: 33AABCA8841M1ZN
    Bill No: APL-MED-1029
    Date: 10/11/2026

    Multivitamin Capsules    1   ₹490.00
    Electral ORS Pack        5   ₹318.00
    Subtotal: ₹808.00
    GST: ₹42.50
    TOTAL: ₹850.50
    Paid via Google Pay
    `;

    const result = parseReceiptTextLocally(text, 'GALLERY');

    expect(result.merchantName).toBe('Apollo Pharmacy');
    expect(result.category).toBe('Healthcare & Wellness');
    expect(result.amount).toBe(850.5);
    expect(result.taxes).toBe(42.5);
  });

  it('validates that all sample receipt presets are structurally sound and complete', () => {
    expect(SAMPLE_RECEIPTS.length).toBeGreaterThanOrEqual(5);

    for (const preset of SAMPLE_RECEIPTS) {
      expect(preset.amount).toBeGreaterThan(0);
      expect(preset.merchant.length).toBeGreaterThan(0);
      expect(preset.category.length).toBeGreaterThan(0);
      expect(preset.gstin.length).toBe(15);
      expect(preset.rawText.length).toBeGreaterThan(20);

      const parsed = parseReceiptTextLocally(preset.rawText, 'PRESET');
      expect(parsed.amount).toBe(preset.amount);
      expect(parsed.merchantName).toBe(preset.merchant);
      expect(parsed.category).toBe(preset.category);
    }
  });

  it('falls back seamlessly to local parser when cloud backend is unavailable', async () => {
    const result = await scanReceiptWithHybridOCR({
      rawText: 'RELIANCE FRESH\nTOTAL: ₹1240.00\nGST: ₹62.00',
      apiBaseUrl: 'http://invalid-unreachable-host:9999',
      source: 'CAMERA',
    });

    expect(result.merchantName).toBe('Reliance Fresh');
    expect(result.amount).toBe(1240);
    expect(result.taxes).toBe(62);
    expect(result.category).toBe('Food & Groceries');
  });
});
