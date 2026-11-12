/**
 * WealthOS Enterprise Financial Formatting Standard
 *
 * Implements strict Indian and International currency, number, and percentage formatting
 * with support for Lakhs (₹L), Crores (₹Cr), thousands (₹K), exact decimal representations,
 * signed deltas, and accessible CSV export.
 */

export interface CurrencyFormatOptions {
  currency?: string;
  notation?: 'standard' | 'compact';
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  showSign?: boolean;
  useParenthesesForNegative?: boolean;
}

/**
 * Formats a numeric value with Indian digit grouping (e.g., 75,37,901.25)
 */
export function formatIndianNumber(
  value: number | string | null | undefined,
  minimumFractionDigits = 2,
  maximumFractionDigits = 2
): string {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return '0.00';
  }

  const num = Number(value);
  const isNegative = num < 0;
  const absNum = Math.abs(num);

  const fixed = absNum.toFixed(maximumFractionDigits);
  const [integerPart, decimalPart] = fixed.split('.');

  // Indian grouping: last 3 digits, then groups of 2 digits
  let lastThree = integerPart.slice(-3);
  const otherDigits = integerPart.slice(0, -3);

  let formattedInteger = lastThree;
  if (otherDigits !== '') {
    const formattedOther = otherDigits.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    formattedInteger = `${formattedOther},${lastThree}`;
  }

  let result = formattedInteger;
  if (minimumFractionDigits > 0 || (decimalPart && maximumFractionDigits > 0)) {
    const decimals = (decimalPart || '').padEnd(minimumFractionDigits, '0').slice(0, maximumFractionDigits);
    result = `${formattedInteger}.${decimals}`;
  }

  return isNegative ? `-${result}` : result;
}

/**
 * Formats currency values following the WealthOS Financial Design Standard.
 * Supports compact Indian notations (₹Cr, ₹L, ₹K) and standard full decimal notation.
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  options: CurrencyFormatOptions = {}
): string {
  const {
    currency = 'INR',
    notation = 'standard',
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    showSign = false,
    useParenthesesForNegative = false,
  } = options;

  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    const symbol = currency === 'INR' ? '₹' : '$';
    return `${symbol}0.00`;
  }

  const num = Number(amount);
  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const symbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : `${currency} `;

  let formattedValue = '';

  if (notation === 'compact' && currency === 'INR') {
    if (absNum >= 10000000) {
      // Crores (1 Cr = 1,00,00,000)
      const crVal = absNum / 10000000;
      formattedValue = `${symbol}${crVal.toFixed(2)} Cr`;
    } else if (absNum >= 100000) {
      // Lakhs (1 L = 1,00,000)
      const lVal = absNum / 100000;
      formattedValue = `${symbol}${lVal.toFixed(2)} L`;
    } else if (absNum >= 1000) {
      // Thousands (1 K = 1,000)
      const kVal = absNum / 1000;
      formattedValue = `${symbol}${kVal.toFixed(1)} K`;
    } else {
      formattedValue = `${symbol}${formatIndianNumber(absNum, minimumFractionDigits, maximumFractionDigits)}`;
    }
  } else if (notation === 'compact') {
    // Non-INR compact notation
    if (absNum >= 1000000000) {
      formattedValue = `${symbol}${(absNum / 1000000000).toFixed(2)}B`;
    } else if (absNum >= 1000000) {
      formattedValue = `${symbol}${(absNum / 1000000).toFixed(2)}M`;
    } else if (absNum >= 1000) {
      formattedValue = `${symbol}${(absNum / 1000).toFixed(1)}K`;
    } else {
      formattedValue = `${symbol}${absNum.toFixed(maximumFractionDigits)}`;
    }
  } else {
    // Standard notation with Indian grouping
    if (currency === 'INR') {
      formattedValue = `${symbol}${formatIndianNumber(absNum, minimumFractionDigits, maximumFractionDigits)}`;
    } else {
      formattedValue = `${symbol}${absNum.toLocaleString('en-US', {
        minimumFractionDigits,
        maximumFractionDigits,
      })}`;
    }
  }

  // Handle Sign formatting
  if (isNegative) {
    if (useParenthesesForNegative) {
      return `(${formattedValue})`;
    }
    return `-${formattedValue}`;
  }

  if (showSign && num > 0) {
    return `+${formattedValue}`;
  }

  return formattedValue;
}

/**
 * Formats percentages with explicit sign and customizable decimal precision
 */
export function formatPercentage(
  pct: number | string | null | undefined,
  options: { showSign?: boolean; decimals?: number } = {}
): string {
  const { showSign = true, decimals = 2 } = options;

  if (pct === null || pct === undefined || isNaN(Number(pct))) {
    return '0.00%';
  }

  const num = Number(pct);
  const sign = showSign && num > 0 ? '+' : '';
  return `${sign}${num.toFixed(decimals)}%`;
}

/**
 * Clean Y-Axis Tick Formatter for Financial Charts
 */
export function formatAxisTick(value: number, currency = 'INR'): string {
  if (value === 0) return '0';
  const symbol = currency === 'INR' ? '₹' : '$';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (currency === 'INR') {
    if (abs >= 10000000) {
      return `${sign}${symbol}${(abs / 10000000).toFixed(abs % 10000000 === 0 ? 0 : 1)}Cr`;
    }
    if (abs >= 100000) {
      return `${sign}${symbol}${(abs / 100000).toFixed(abs % 100000 === 0 ? 0 : 1)}L`;
    }
    if (abs >= 1000) {
      return `${sign}${symbol}${(abs / 1000).toFixed(0)}K`;
    }
    return `${sign}${symbol}${abs}`;
  }

  if (abs >= 1000000) {
    return `${sign}${symbol}${(abs / 1000000).toFixed(1)}M`;
  }
  if (abs >= 1000) {
    return `${sign}${symbol}${(abs / 1000).toFixed(0)}K`;
  }
  return `${sign}${symbol}${abs}`;
}

/**
 * Client-side CSV Exporter for tabular financial accessibility
 */
export function exportToCSV(
  filename: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): void {
  if (typeof window === 'undefined') return;

  const escapeCSV = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map((row) => row.map(escapeCSV).join(',')),
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates an accessible, screen-reader friendly narrative for a financial chart
 */
export function generateAccessibleChartSummary(
  chartTitle: string,
  dataPoints: { label: string; value: number }[],
  currency = 'INR'
): string {
  if (!dataPoints || dataPoints.length === 0) {
    return `${chartTitle}: No data available.`;
  }

  const first = dataPoints[0];
  const last = dataPoints[dataPoints.length - 1];
  const delta = last.value - first.value;
  const pct = first.value !== 0 ? (delta / Math.abs(first.value)) * 100 : 0;
  const direction = delta >= 0 ? 'increased' : 'decreased';

  return `${chartTitle}. Starting value was ${formatCurrency(first.value, { currency })} on ${first.label}. ` +
    `Ending value is ${formatCurrency(last.value, { currency })} on ${last.label}. ` +
    `Overall ${direction} by ${formatCurrency(Math.abs(delta), { currency })} (${formatPercentage(pct)}).`;
}

/**
 * Convenience helper for standard Indian Rupee (₹) formatting.
 */
export function formatINR(
  amount: number | string | null | undefined,
  compact = false
): string {
  return formatCurrency(amount, {
    currency: 'INR',
    notation: compact ? 'compact' : 'standard',
  });
}


