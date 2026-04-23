import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { apiFetch } from "../lib/api";
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
                    <button className="t-icon-btn" title="Add symbol">+</button>
                    <button className="t-icon-btn" title="Filter">▾</button>
                </div>
            </div>

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
                                    borderRadius: 2,
                                    minWidth: 52,
                                    background: up ? "var(--up-bg)" : "var(--down-bg)",
                                    color: up ? "var(--up)" : "var(--down)",
                                }}>
                                    {sign}{item.chg.toFixed(2)}%
                                </span>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
