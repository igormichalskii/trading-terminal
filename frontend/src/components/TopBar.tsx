import { useState, useRef, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { apiFetch } from "../lib/api";
import "../terminal.css";

const TICKER_SYMBOLS = ["SPY", "QQQ", "IWM", "GLD", "TLT"];

interface TickerItem {
    sym: string;
    val: string;
    chg: string;
    up: boolean;
}

interface Candle {
    time: string | number;
    open: number; high: number; low: number; close: number; volume: number;
}

interface OhlcvResponse { candles: Candle[]; }

interface Props {
    symbol: string;
    onSymbolChange: (s: string) => void;
    page: "chart" | "earnings" | "portfolio";
    onPageChange: (p: "chart" | "earnings" | "portfolio") => void;
    user: User | null;
    authLoading: boolean;
    onSignIn: () => void;
    onSignOut: () => void;
}

const isMac = navigator.platform.toUpperCase().includes("MAC");

export default function TopBar({ symbol, onSymbolChange, page, onPageChange, user, authLoading, onSignIn, onSignOut }: Props) {
    const [input, setInput] = useState(symbol);
    const inputRef = useRef<HTMLInputElement>(null);
    const [tickers, setTickers] = useState<TickerItem[]>([]);

    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            const trigger = isMac ? e.metaKey : e.ctrlKey;
            if (trigger && e.key === "k") {
                e.preventDefault();
                inputRef.current?.focus();
                inputRef.current?.select();
            }
        }
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    useEffect(() => {
        Promise.all(
            TICKER_SYMBOLS.map((sym) =>
                apiFetch<OhlcvResponse>(`/ohlcv/${sym}?timeframe=1M`)
                    .then(({ candles }) => {
                        const last = candles[candles.length - 1];
                        const prev = candles[candles.length - 2];
                        const price = last?.close ?? 0;
                        const chgPct = last && prev
                            ? ((last.close - prev.close) / prev.close) * 100
                            : 0;
                        const up = chgPct >= 0;
                        const val = price > 1000
                            ? price.toLocaleString(undefined, { maximumFractionDigits: 2 })
                            : price.toFixed(2);
                        return { sym, val, chg: `${up ? "+" : ""}${chgPct.toFixed(2)}%`, up };
                    })
                    .catch(() => null)
            )
        ).then((results) => {
            setTickers(results.filter((r): r is TickerItem => r !== null));
        });
    }, []);

    function submit() {
        const val = input.trim().toUpperCase();
        if (val) onSymbolChange(val);
    }

    return (
        <div className="t-topbar">
            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 13, color: "var(--accent)", letterSpacing: "0.05em", flexShrink: 0 }}>
                <div className="t-logo-mark" />
                <span>TERMINAL</span>
            </div>

            {/* Page nav */}
            <div style={{ display: "flex", gap: 1, flexShrink: 0 }}>
                {(["chart", "earnings", "portfolio"] as const).map((p) => (
                    <button
                        key={p}
                        onClick={() => onPageChange(p)}
                        style={{
                            background: page === p ? "var(--accent-dim)" : "transparent",
                            border: `1px solid ${page === p ? "var(--accent)" : "var(--border-bright)"}`,
                            color: page === p ? "var(--accent)" : "var(--text-muted)",
                            fontFamily: "var(--font-mono)",
                            fontSize: 10,
                            letterSpacing: "0.06em",
                            padding: "3px 10px",
                            cursor: "pointer",
                            textTransform: "uppercase",
                            transition: "all 0.15s",
                        }}
                    >
                        {p}
                    </button>
                ))}
            </div>

            {/* Command search */}
            <div className="t-cmd-search">
                <input
                    ref={inputRef}
                    className="t-cmd-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") { submit(); inputRef.current?.blur(); }
                        if (e.key === "Escape") inputRef.current?.blur();
                    }}
                    placeholder={`${symbol} EQUITY <GO>   |   search tickers, news, screens...`}
                />
                <span className="t-cmd-kbd">{isMac ? "⌘K" : "Ctrl+K"}</span>
            </div>

            {/* Market ticker strip */}
            <div style={{ display: "flex", gap: 16, flex: 1, justifyContent: "flex-end", fontFamily: "var(--font-mono)", fontSize: 11, overflow: "hidden" }}>
                {tickers.map(({ sym, val, chg, up }) => (
                    <div key={sym} style={{ display: "flex", gap: 6, alignItems: "center", whiteSpace: "nowrap" }}>
                        <span style={{ color: "var(--text-dim)" }}>{sym}</span>
                        <span style={{ color: "var(--text)", fontWeight: 500 }}>{val}</span>
                        <span style={{ color: up ? "var(--up)" : "var(--down)", fontWeight: 500 }}>{chg}</span>
                    </div>
                ))}
            </div>

            {/* User badge */}
            {authLoading ? null : user ? (
                <button
                    onClick={onSignOut}
                    title={user.email}
                    style={{
                        width: 28, height: 28,
                        background: "var(--accent-dim)",
                        border: "1px solid var(--accent)",
                        color: "var(--accent)",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 700,
                        fontSize: 11,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        flexShrink: 0,
                    }}
                >
                    {(user.email?.[0] ?? "U").toUpperCase()}
                </button>
            ) : (
                <button
                    onClick={onSignIn}
                    style={{
                        background: "transparent",
                        border: "1px solid var(--border-bright)",
                        color: "var(--text-dim)",
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        padding: "4px 10px",
                        cursor: "pointer",
                        letterSpacing: "0.05em",
                        flexShrink: 0,
                        transition: "all 0.15s",
                    }}
                >
                    SIGN IN
                </button>
            )}
        </div>
    );
}
