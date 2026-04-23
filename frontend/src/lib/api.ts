const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, options);
    if (!res.ok) {
        let detail = `API error: ${res.status}`;
        try {
            const body = await res.json();
            if (body?.detail) detail = body.detail;
        } catch {}
        throw new Error(detail);
    }
    return res.json();
}

export async function verifySymbol(symbol: string): Promise<{ valid: boolean; error: string | null }> {
    try {
        await apiFetch(`/ohlcv/${symbol}?timeframe=1M&limit=2`);
        return { valid: true, error: null };
    } catch (e: any) {
        const msg: string = e.message ?? "";
        if (msg.toLowerCase().includes("not found") || msg.toLowerCase().includes("no data")) {
            return { valid: false, error: `"${symbol}" not found.` };
        }
        return { valid: false, error: "Could not verify symbol — check connection." };
    }
}