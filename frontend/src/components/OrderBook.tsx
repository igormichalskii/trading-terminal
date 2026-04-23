import { useMemo } from "react";
import "../terminal.css";

// TODO: replace with real order book data from a WebSocket or REST endpoint.
// Real order books require a paid data feed (e.g. Alpaca, Polygon, IBKR).
function genOrderBook(midPrice: number) {
    const asks: { price: number; size: number; total: number }[] = [];
    const bids: { price: number; size: number; total: number }[] = [];
    let askTotal = 0;
    let bidTotal = 0;

    for (let i = 0; i < 12; i++) {
        const askPrice = midPrice + 0.03 + i * 0.03 + (Math.random() * 0.02);
        const askSize  = Math.floor(Math.random() * 5000 + 500);
        askTotal += askSize;
        asks.push({ price: askPrice, size: askSize, total: askTotal });

        const bidPrice = midPrice - 0.03 - i * 0.03 - (Math.random() * 0.02);
        const bidSize  = Math.floor(Math.random() * 5000 + 500);
        bidTotal += bidSize;
        bids.push({ price: bidPrice, size: bidSize, total: bidTotal });
    }

    return { asks: asks.reverse(), bids, spread: (asks[0]?.price ?? 0) - (bids[0]?.price ?? 0) };
}

interface Props {
    lastPrice: number | null;
}

export default function OrderBook({ lastPrice }: Props) {
    // Seed the book from the live last price so spread stays plausible.
    const mid = lastPrice ?? 184.72;
    // useMemo so the book doesn't re-randomize on every render — it updates when lastPrice changes.
    const ob = useMemo(() => genOrderBook(mid), [mid]);

    const maxAsk = ob.asks[ob.asks.length - 1]?.total ?? 1;
    const maxBid = ob.bids[ob.bids.length - 1]?.total ?? 1;
    const spreadPct = mid > 0 ? ((ob.spread / mid) * 100).toFixed(3) : "—";

    return (
        <div className="t-panel" style={{ display: "flex", flexDirection: "column" }}>
            <div className="t-panel-header">
                <span className="t-panel-title">ORDER BOOK · DEPTH</span>
                <div style={{ display: "flex", gap: 2 }}>
                    <button className="t-icon-btn" title="Tick size" style={{ width: "auto", padding: "0 6px", fontSize: 9, letterSpacing: "0.05em" }}>0.01</button>
                </div>
            </div>

            {/* Column headers */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                padding: "6px 10px",
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                color: "var(--text-muted)",
                borderBottom: "1px solid var(--border)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                flexShrink: 0,
            }}>
                <div>Price</div>
                <div style={{ textAlign: "center" }}>Size</div>
                <div style={{ textAlign: "right" }}>Total</div>
            </div>

            {/* Asks (descending, red) */}
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                {ob.asks.map((row, i) => (
                    <div key={i} className="t-ob-row ask">
                        <div className="t-ob-depth" style={{ width: `${((row.total / maxAsk) * 100).toFixed(0)}%` }} />
                        <div style={{ color: "var(--down)", fontWeight: 500 }}>{row.price.toFixed(2)}</div>
                        <div style={{ color: "var(--text-dim)", textAlign: "center" }}>{row.size.toLocaleString()}</div>
                        <div style={{ color: "var(--text-muted)", textAlign: "right" }}>{row.total.toLocaleString()}</div>
                    </div>
                ))}
            </div>

            {/* Spread */}
            <div style={{
                padding: "6px 10px",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                background: "var(--bg)",
                borderTop: "1px solid var(--border)",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                color: "var(--text-muted)",
                flexShrink: 0,
                letterSpacing: "0.05em",
            }}>
                <span>SPREAD</span>
                <span style={{ color: "var(--accent)", fontWeight: 600 }}>{ob.spread.toFixed(3)}</span>
                <span>{spreadPct}%</span>
            </div>

            {/* Bids (ascending, green) */}
            <div style={{ flex: 1, overflowY: "auto" }}>
                {ob.bids.map((row, i) => (
                    <div key={i} className="t-ob-row bid">
                        <div className="t-ob-depth" style={{ width: `${((row.total / maxBid) * 100).toFixed(0)}%` }} />
                        <div style={{ color: "var(--up)", fontWeight: 500 }}>{row.price.toFixed(2)}</div>
                        <div style={{ color: "var(--text-dim)", textAlign: "center" }}>{row.size.toLocaleString()}</div>
                        <div style={{ color: "var(--text-muted)", textAlign: "right" }}>{row.total.toLocaleString()}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
