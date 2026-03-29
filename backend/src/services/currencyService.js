/**
 * Currency conversion service using static rates.
 * Base currency is INR (rate = 1). All other rates are "how many INR per 1 unit".
 */

const RATES = {
  INR: 1,
  USD: 84,
  EUR: 91,
  GBP: 106,
  AED: 22.9,
};

/**
 * Convert an amount from one currency to INR (company base currency)
 */
function convertToBase(amount, fromCurrency) {
  const rate = RATES[fromCurrency] || 1;
  return Math.round(amount * rate);
}

/**
 * Convert an amount from one currency to another
 */
function convert(amount, fromCurrency, toCurrency) {
  const amountInINR = amount * (RATES[fromCurrency] || 1);
  return Math.round(amountInINR / (RATES[toCurrency] || 1));
}

/**
 * Get all supported currencies
 */
function getSupportedCurrencies() {
  return [
    { code: 'INR', symbol: '₹', flag: '🇮🇳', rate: 1 },
    { code: 'USD', symbol: '$', flag: '🇺🇸', rate: 84 },
    { code: 'EUR', symbol: '€', flag: '🇪🇺', rate: 91 },
    { code: 'GBP', symbol: '£', flag: '🇬🇧', rate: 106 },
    { code: 'AED', symbol: 'د.إ', flag: '🇦🇪', rate: 22.9 },
  ];
}

module.exports = { convertToBase, convert, getSupportedCurrencies, RATES };
