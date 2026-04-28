import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { apiFetch, verifySymbol } from "../lib/api";
import { tickerError } from "../lib/validation";
import type { User } from "@supabase/supabase-js";
import "../terminal.css";

const TABS = ["FAV", "GAIN", "LOSE", "VOL"] as const;
type Tab = typeof TABS[number];

interface WatchlistItem {
    id: string;
    symbol: string;
    price: number;
    chg: number;
}

interface Candle {
    time: string | number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

interface OhlcvResponse {
    candles: Candle[];
}

interface Props {
    user: User | null;
    activeSymbol: string;
    onSelect: (sym: string) => void;
    onSymbolsChange?: (symbols: string[]) => void;
}

function fmtPrice(p: number) {
    return p > 1000
        ? p.toLocaleString(undefined, { maximumFractionDigits: 2 })
        : p.toFixed(2);
}

export default function WatchlistSidebar({ user, activeSymbol, onSelect, onSymbolsChange }: Props) {
    const [tab, setTab] = useState<Tab>("FAV");
    const [items, setItems] = useState<WatchlistItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [addOpen, setAddOpen] = useState(false);
    const [addInput, setAddInput] = useState("");
    const [addErr, setAddErr] = useState<string | null>(null);
    const [adding, setAdding] = useState(false);
    const addInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!user) {
            setItems([]);
            setLoading(false);
            return;
        }

        supabase
            .from("watchlist")
            .select("id, symbol")
            .order("created_at", { ascending: true })
            .then(({ data }) => {
                if (!data || data.length === 0) {
                    setItems([]);
                    setLoading(false);
                    return;
                }

                onSymbolsChange?.(data.map((i) => i.symbol));

                Promise.all(
                    data.map((item) =>
                        apiFetch<OhlcvResponse>(`/ohlcv/${item.symbol}?timeframe=1M`)
                            .then(({ candles }) => {
                                const last = candles[candles.length - 1];
                                const prev = candles[candles.length - 2];
                                const price = last?.close ?? 0;
                                const chg = last && prev
                                    ? ((last.close - prev.close) / prev.close) * 100
                                    : 0;
                                return { id: item.id, symbol: item.symbol, price, chg };
                            })
                            .catch(() => ({ id: item.id, symbol: item.symbol, price: 0, chg: 0 }))
                    )
                ).then((resolved) => {
                    setItems(resolved);
                    setLoading(false);
                });
            });
    }, [user?.id]);

    const openAdd = () => {
        setAddOpen(true);
        setAddInput("");
        setAddErr(null);
        setTimeout(() => addInputRef.current?.focus(), 0);
    };

    const addSymbol = async () => {
        const symbol = addInput.trim().toUpperCase();
        const fmtErr = tickerError(symbol);
        if (fmtErr) { setAddErr(fmtErr); return; }
        if (items.some((i) => i.symbol === symbol)) { setAddErr("Already in watchlist."); return; }
        setAddErr(null);
        setAdding(true);
        const { valid, error } = await verifySymbol(symbol);
        if (!valid) { setAdding(false); setAddErr(error); return; }
        const { data, error: dbErr } = await supabase
            .from("watchlist")
            .insert({ user_id: user!.id, symbol })
            .select("id, symbol")
            .single();
        setAdding(false);
        if (dbErr || !data) return;
        const candles = await apiFetch<{ candles: Candle[] }>(`/ohlcv/${symbol}?timeframe=1M`)
            .then(({ candles }) => candles)
            .catch(() => [] as Candle[]);
        const last = candles[candles.length - 1];
        const prev = candles[candles.length - 2];
        const price = last?.close ?? 0;
        const chg = last && prev ? ((last.close - prev.close) / prev.close) * 100 : 0;
        setItems((prev) => {
            const next = [...prev, { id: data.id, symbol: data.symbol, price, chg }];
            onSymbolsChange?.(next.map((i) => i.symbol));
            return next;
        });
        setAddInput("");
        setAddOpen(false);
    };

    const removeSymbol = async (id: string) => {
        await supabase.from("watchlist").delete().eq("id", id);
        setItems((prev) => {
            const next = prev.filter((i) => i.id !== id);
            onSymbolsChange?.(next.map((i) => i.symbol));
            return next;
        });
    };

    const sorted = tab === "GAIN"
        ? [...items].sort((a, b) => b.chg - a.chg)
        : tab === "LOSE"
        ? [...items].sort((a, b) => a.chg - b.chg)
        : tab === "VOL"
        ? [...items].sort((a, b) => b.price * Math.abs(b.chg) - a.price * Math.abs(a.chg))
        : items;

    return (
        <div className="t-panel t-watchlist">
            <div className="t-panel-header">
                <span className="t-panel-title">WATCHLIST · MKT MOVERS</span>
                <div style={{ display: "flex", gap: 2 }}>
                    <button className="t-icon-btn" title="Add symbol" onClick={user ? openAdd : undefined} style={{ opacity: user ? 1 : 0.4 }}>+</button>
                </div>
            </div>

            {/* Inline add-symbol row */}
            {addOpen && (
                <div style={{ padding: "6px 8px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
                    <div style={{ display: "flex", gap: 4 }}>
                        <input
                            ref={addInputRef}
                            value={addInput}
                            onChange={(e) => { setAddInput(e.target.value.toUpperCase()); setAddErr(null); }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") addSymbol();
                                if (e.key === "Escape") { setAddOpen(false); setAddErr(null); }
                            }}
                            placeholder={adding ? "Verifying…" : "SYMBOL"}
                            disabled={adding}
                            style={{ flex: 1, minWidth: 0, background: "var(--bg)", border: `1px solid ${addErr ? "var(--down)" : adding ? "var(--accent)" : "var(--border-bright)"}`, color: "var(--text)", padding: "4px 8px", fontFamily: "var(--font-mono)", fontSize: 11, outline: "none", letterSpacing: "0.05em" }}
                        />
                        <button
                            onClick={addSymbol}
                            disabled={adding}
                            style={{ background: "transparent", border: "1px solid var(--border-bright)", color: "var(--text-dim)", padding: "4px 8px", fontFamily: "var(--font-mono)", fontSize: 11, cursor: adding ? "default" : "pointer", opacity: adding ? 0.5 : 1 }}
                        >
                            {adding ? "…" : "ADD"}
                        </button>
                    </div>
                    {addErr && <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--down)", marginTop: 4, letterSpacing: "0.03em" }}>{addErr}</p>}
                </div>
            )}

            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
                {TABS.map((t) => (
                    <button
                        key={t}
                        className={"t-wl-tab" + (tab === t ? " active" : "")}
                        onClick={() => setTab(t)}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {/* Ticker list */}
            <div style={{ flex: 1, overflowY: "auto" }}>
                {loading ? (
                    <div style={{ padding: "12px 8px", fontSize: 11, color: "var(--text-dim)" }}>Loading…</div>
                ) : !user ? (
                    <div style={{ padding: "12px 8px", fontSize: 11, color: "var(--text-dim)" }}>Sign in to see your watchlist.</div>
                ) : sorted.length === 0 ? (
                    <div style={{ padding: "12px 8px", fontSize: 11, color: "var(--text-dim)" }}>No symbols yet.</div>
                ) : (
                    sorted.map((item) => {
                        const up = item.chg >= 0;
                        const sign = up ? "+" : "";
                        const selected = item.symbol === activeSymbol;
                        return (
                            <div
                                key={item.id}
                                className={"t-wl-item" + (selected ? " selected" : "")}
                                onClick={() => onSelect(item.symbol)}
                                style={{ position: "relative" }}
                            >
                                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: "var(--text)", letterSpacing: "0.03em" }}>
                                    {item.symbol}
                                </span>
                                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-dim)", textAlign: "right" }}>
                                    {fmtPrice(item.price)}
                                </span>
                                <span style={{
                                    fontFamily: "var(--font-mono)",
                                    fontSize: 10,
                                    fontWeight: 500,
                                    textAlign: "right",
                                    padding: "2px 5px",
                                    marginRight: 18,
                                    borderRadius: 2,
                                    minWidth: 52,
                                    background: up ? "var(--up-bg)" : "var(--down-bg)",
                                    color: up ? "var(--up)" : "var(--down)",
                                }}>
                                    {sign}{item.chg.toFixed(2)}%
                                </span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); removeSymbol(item.id); }}
                                    title="Remove"
                                    style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", fontSize: 14, lineHeight: 1, cursor: "pointer", opacity: 0, transition: "opacity 0.15s", padding: "0 2px" }}
                                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--down)"; }}
                                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}
                                    className="wl-remove-btn"
                                >
                                    ×
                                </button>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
