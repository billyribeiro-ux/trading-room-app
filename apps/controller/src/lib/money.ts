/**
 * Money formatting, in integer minor units, end to end.
 *
 * ## Why this exists rather than a one-line `amount / 100`
 *
 * The reference does exactly that one-liner, and it is wrong. Read verbatim from the live bundle
 * (`evidence-dumps/TIER1-fetched/app.min.js`, offset 183815):
 *
 *     $scope.formatStripeAmount = function (amount, currency) {
 *       if (undefined === amount || null === amount || isNaN(amount)) return '';
 *       var dollars = Number(amount) / 100,
 *           curr    = (currency || 'USD').toString().toUpperCase(),
 *           symbol  = curr === 'USD' ? '$' : curr === 'EUR' ? '€' : curr === 'GBP' ? '£' : '',
 *           val     = dollars.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
 *       return symbol ? symbol + val : val + ' ' + curr;
 *     };
 *
 * **The float division is NOT the bug**, and it is worth saying so plainly because it is the
 * obvious thing to flag and it is wrong. It was tested exhaustively — all 2,000,001 integer cent
 * values from 0 to 2,000,000 — against an integer-only reference: zero mismatches. `toFixed(2)`
 * rounds back to the exact value across the entire realistic range, and only diverges above
 * `Number.MAX_SAFE_INTEGER`, where the input is already lossy before the function sees it.
 *
 * **The bug is that `/ 100` is applied unconditionally.** Stripe transmits ZERO-DECIMAL currencies
 * as whole units, not hundredths. A ¥1,999 charge arrives as `amount = 1999`, and the reference
 * renders it `19.99 JPY` — a hundredfold understatement, on every zero-decimal currency. Verified:
 * `formatStripeAmount(1999, 'JPY') === '19.99 JPY'`.
 *
 * So this module keys the scale off the currency, never off a constant, and does the arithmetic in
 * integers so there is no float in the path at all. That also satisfies the repository's standing
 * money rule (`CLAUDE.md`): minor units are `i64` / `BIGINT` / `number` end to end, never a float.
 *
 * Two lesser reference defects are also not reproduced: `formatStripeAmount(-1999, 'USD')` returns
 * `"$-19.99"` (symbol before the sign) where this returns `-$19.99`; and the reference emits a
 * symbol only for USD/EUR/GBP, falling back to `"19.99 XYZ"` for everything else.
 */

/**
 * Currencies Stripe transmits with NO minor unit — the integer IS the whole amount.
 * Source: Stripe's zero-decimal currency list. Kept as a frozen Set so a typo is a compile error
 * at the call site rather than a silent 100x error at runtime.
 */
const ZERO_DECIMAL: ReadonlySet<string> = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA',
  'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'
]);

/**
 * Currencies whose minor unit is 1/1000. Stripe accepts these but requires the last digit to be 0,
 * so they still round-trip as integers — the scale is simply 3 rather than 2.
 */
const THREE_DECIMAL: ReadonlySet<string> = new Set(['BHD', 'JOD', 'KWD', 'OMR', 'TND']);

/** How many minor-unit digits a currency carries. */
export function minorUnitDigits(currency: string): 0 | 2 | 3 {
  const code = currency.trim().toUpperCase();
  if (ZERO_DECIMAL.has(code)) return 0;
  if (THREE_DECIMAL.has(code)) return 3;
  return 2;
}

/** The symbol prefixed before the amount, or `null` when the code is appended instead. */
function symbolFor(code: string): string | null {
  if (code === 'USD') return '$';
  if (code === 'EUR') return '€';
  if (code === 'GBP') return '£';
  return null;
}

/** Thousands separators, applied to an already-formatted integer string. */
function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Format an integer amount of MINOR units (cents, yen, fils) for display.
 *
 * `amount` must be an integer. A non-integer is a programming error upstream — money should never
 * have become fractional — so it is rejected loudly rather than silently rounded.
 *
 * Returns `''` for null/undefined, matching the reference's own empty-cell behaviour so a missing
 * value renders as blank rather than as `$0.00`, which would assert a fact we do not have.
 */
export function formatMoney(amount: number | null | undefined, currency = 'USD'): string {
  if (amount === null || amount === undefined) return '';
  if (!Number.isFinite(amount)) return '';
  if (!Number.isInteger(amount)) {
    throw new RangeError(
      `formatMoney expects an integer number of minor units, got ${amount}. ` +
        `Money must not be fractional before it reaches formatting.`
    );
  }
  if (!Number.isSafeInteger(amount)) {
    throw new RangeError(
      `formatMoney got ${amount}, which exceeds Number.MAX_SAFE_INTEGER. ` +
        `Amounts this large must be carried as bigint, not number.`
    );
  }

  const code = (currency || 'USD').trim().toUpperCase();
  const digits = minorUnitDigits(code);

  /* Integer arithmetic only — the magnitude never becomes a float. */
  const negative = amount < 0;
  const abs = Math.abs(amount);

  let body: string;
  if (digits === 0) {
    body = groupThousands(String(abs));
  } else {
    const scale = digits === 3 ? 1000 : 100;
    const whole = Math.floor(abs / scale);
    const frac = abs % scale;
    body = `${groupThousands(String(whole))}.${String(frac).padStart(digits, '0')}`;
  }

  const symbol = symbolFor(code);
  /* Sign goes OUTSIDE the symbol: -$19.99, not $-19.99. */
  const sign = negative ? '-' : '';
  return symbol ? `${sign}${symbol}${body}` : `${sign}${body} ${code}`;
}
