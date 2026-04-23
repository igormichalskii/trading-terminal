// Valid ticker examples: AAPL, MSFT, BRK.B, BTC-USD, EUR/USD, SPY
const TICKER_RE = /^[A-Z][A-Z0-9]{0,4}([.\-\/][A-Z0-9]{1,4})?$/;

export function isValidTicker(sym: string): boolean {
    return TICKER_RE.test(sym.trim().toUpperCase());
}

export function tickerError(sym: string): string | null {
    const s = sym.trim().toUpperCase();
    if (!s) return "Symbol is required.";
    if (!/^[A-Z]/.test(s)) return "Symbol must start with a letter.";
    if (!TICKER_RE.test(s)) return "Invalid symbol format.";
    return null;
}

export function priceError(value: string): string | null {
    if (!value.trim()) return "Price is required.";
    const n = parseFloat(value);
    if (isNaN(n)) return "Must be a number.";
    if (n <= 0) return "Must be greater than zero.";
    if (n > 1_000_000) return "Price seems too large.";
    return null;
}

export function passwordError(value: string): string | null {
    if (!value) return "Password is required.";
    if (value.length < 6) return "Password must be at least 6 characters.";
    return null;
}
