import { describe, expect, it } from 'vitest';
import { formatMoney, minorUnitDigits } from './money';

/**
 * The reference's own money formatter, transcribed VERBATIM from the live bundle
 * (`evidence-dumps/TIER1-fetched/app.min.js` @183815) and de-minified without changing a single
 * operation. It is here as a NEGATIVE CONTROL: several tests assert that our output differs from
 * it, and cite the reason. If someone later "simplifies" `money.ts` toward this shape, those tests
 * go red and name the bug they are reintroducing.
 */
function referenceFormatStripeAmount(amount: unknown, currency?: string): string {
  if (undefined === amount || null === amount || isNaN(amount as number)) return '';
  const dollars = Number(amount) / 100;
  const curr = (currency || 'USD').toString().toUpperCase();
  const symbol = 'USD' === curr ? '$' : 'EUR' === curr ? '€' : 'GBP' === curr ? '£' : '';
  const val = dollars.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return symbol ? symbol + val : val + ' ' + curr;
}

describe('minorUnitDigits', () => {
  it('is 2 for ordinary currencies', () => {
    for (const c of ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'CHF']) expect(minorUnitDigits(c)).toBe(2);
  });

  it('is 0 for every Stripe zero-decimal currency', () => {
    for (const c of [
      'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA',
      'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'
    ]) {
      expect(minorUnitDigits(c), c).toBe(0);
    }
  });

  it('is 3 for the thousandths currencies', () => {
    for (const c of ['BHD', 'JOD', 'KWD', 'OMR', 'TND']) expect(minorUnitDigits(c), c).toBe(3);
  });

  it('is case- and whitespace-insensitive', () => {
    expect(minorUnitDigits('jpy')).toBe(0);
    expect(minorUnitDigits('  Jpy  ')).toBe(0);
  });
});

describe('formatMoney — ordinary two-decimal currencies', () => {
  it('formats cents exactly', () => {
    expect(formatMoney(0, 'USD')).toBe('$0.00');
    expect(formatMoney(5, 'USD')).toBe('$0.05');
    expect(formatMoney(99, 'USD')).toBe('$0.99');
    expect(formatMoney(100, 'USD')).toBe('$1.00');
    expect(formatMoney(1999, 'USD')).toBe('$19.99');
    expect(formatMoney(123456789, 'USD')).toBe('$1,234,567.89');
  });

  it('uses the right symbol, and appends the code when there is none', () => {
    expect(formatMoney(1999, 'EUR')).toBe('€19.99');
    expect(formatMoney(1999, 'GBP')).toBe('£19.99');
    expect(formatMoney(1999, 'CAD')).toBe('19.99 CAD');
  });

  it('defaults to USD, as the reference does', () => {
    expect(formatMoney(1999)).toBe('$19.99');
    expect(formatMoney(1999, '')).toBe('$19.99');
  });
});

describe('THE REFERENCE BUG — zero-decimal currencies are 100x low', () => {
  /*
    evidence-dumps/TIER1-fetched/app.min.js @183815 divides by 100 UNCONDITIONALLY. Stripe sends
    zero-decimal currencies as whole units, so a ¥1,999 charge arrives as amount=1999.
  */
  it('the reference renders ¥1,999 as "19.99 JPY" — verified, not assumed', () => {
    expect(referenceFormatStripeAmount(1999, 'JPY')).toBe('19.99 JPY');
  });

  it('ours renders it as the whole amount', () => {
    expect(formatMoney(1999, 'JPY')).toBe('1,999 JPY');
  });

  it('ours differs from the reference on EVERY zero-decimal currency', () => {
    for (const c of [
      'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA',
      'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'
    ]) {
      expect(formatMoney(1999, c), c).not.toBe(referenceFormatStripeAmount(1999, c));
    }
  });

  it('and agrees with the reference on two-decimal currencies, where it is correct', () => {
    for (const cents of [0, 1, 99, 100, 1999, 100000, 123456789]) {
      expect(formatMoney(cents, 'USD'), String(cents)).toBe(referenceFormatStripeAmount(cents, 'USD'));
    }
  });
});

describe('formatMoney — three-decimal currencies', () => {
  it('scales by 1000, not 100', () => {
    expect(formatMoney(1999, 'KWD')).toBe('1.999 KWD');
    expect(formatMoney(1000, 'BHD')).toBe('1.000 BHD');
    expect(formatMoney(1, 'OMR')).toBe('0.001 OMR');
    expect(formatMoney(1234567, 'JOD')).toBe('1,234.567 JOD');
  });
});

describe('formatMoney — sign placement', () => {
  it('puts the sign OUTSIDE the symbol', () => {
    expect(formatMoney(-1999, 'USD')).toBe('-$19.99');
  });

  it('which is where the reference gets it wrong', () => {
    expect(referenceFormatStripeAmount(-1999, 'USD')).toBe('$-19.99');
    expect(formatMoney(-1999, 'USD')).not.toBe(referenceFormatStripeAmount(-1999, 'USD'));
  });

  it('and before the value when the code is appended', () => {
    expect(formatMoney(-1999, 'CAD')).toBe('-19.99 CAD');
    expect(formatMoney(-1999, 'JPY')).toBe('-1,999 JPY');
  });
});

describe('formatMoney — absent values render blank, never $0.00', () => {
  /* A missing amount is not a zero amount. Rendering $0.00 would assert a fact we do not have. */
  it('returns empty string for null and undefined', () => {
    expect(formatMoney(null)).toBe('');
    expect(formatMoney(undefined)).toBe('');
  });

  it('returns empty string for NaN and Infinity rather than throwing', () => {
    expect(formatMoney(Number.NaN)).toBe('');
    expect(formatMoney(Number.POSITIVE_INFINITY)).toBe('');
  });
});

describe('formatMoney — fails LOUD on inputs that should never exist', () => {
  it('rejects a fractional amount instead of silently rounding it', () => {
    /* Money became fractional somewhere upstream. Rounding here would hide that. */
    expect(() => formatMoney(19.99, 'USD')).toThrow(RangeError);
    expect(() => formatMoney(0.5, 'USD')).toThrow(/integer number of minor units/);
  });

  it('rejects amounts past MAX_SAFE_INTEGER instead of printing a wrong number', () => {
    expect(() => formatMoney(Number.MAX_SAFE_INTEGER + 2, 'USD')).toThrow(/bigint/);
  });
});

describe('exhaustive integer fidelity', () => {
  /*
    The concern originally raised against the reference was that `Number(amount)/100` loses
    precision. It does NOT, across the realistic range — this test records that, so the claim is
    not re-raised from intuition. It also proves OUR integer path is exact over the same range.
  */
  it('is exact for every cent from $0.00 to $20,000.00, and matches the float path there', () => {
    let mismatchOurs = 0;
    let mismatchRef = 0;
    for (let c = 0; c <= 2_000_000; c++) {
      const whole = Math.floor(c / 100);
      const frac = String(c % 100).padStart(2, '0');
      const want = `$${String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${frac}`;
      if (formatMoney(c, 'USD') !== want) mismatchOurs++;
      if (referenceFormatStripeAmount(c, 'USD') !== want) mismatchRef++;
    }
    expect(mismatchOurs).toBe(0);
    /* Recorded deliberately: the float division is fine here. The bug is currency scale, not precision. */
    expect(mismatchRef).toBe(0);
  });
});
