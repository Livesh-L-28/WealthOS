/**
 * Currency and Number Formatters for WealthOS Mobile
 */

let privacyModeActive = false;

export function setGlobalPrivacyMode(enabled: boolean): void {
  privacyModeActive = enabled;
}

export function isGlobalPrivacyMode(): boolean {
  return privacyModeActive;
}

export function formatINR(val: number, options?: { forceShow?: boolean }): string {
  if (privacyModeActive && !options?.forceShow) {
    return '₹••••••';
  }
  const isNegative = val < 0;
  const absVal = Math.abs(val);
  const parts = absVal.toFixed(2).split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];

  let lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  return `${isNegative ? '-' : ''}₹${formatted}.${decimalPart}`;
}

export function formatPercentage(val: number, precision: number = 1): string {
  const sign = val > 0 ? '+' : '';
  return `${sign}${val.toFixed(precision)}%`;
}


