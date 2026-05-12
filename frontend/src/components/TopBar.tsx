import { useState, useRef, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { apiFetch, verifySymbol } from "../lib/api";
import { tickerError } from "../lib/validation";
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
    const [inputErr, setInputErr] = useState<string | null>(null);
    const [checking, setChecking] = useState(false);
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

    async function submit() {
        const val = input.trim().toUpperCase();
        const fmtErr = tickerError(val);
        if (fmtErr) { setInputErr(fmtErr); return; }
        setInputErr(null);
        setChecking(true);
        const { valid, error } = await verifySymbol(val);
        setChecking(false);
        if (!valid) { setInputErr(error); return; }
        onSymbolChange(val);
        inputRef.current?.blur();
    }

    return (
        <div className="t-topbar">
            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 13, color: "var(--accent)", letterSpacing: "0.05em", flexShrink: 0 }}>
                <div className="t-logo-mark" />
                <span>TERMINAL</span>
            </div>

            {/* Page nav */}
            <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                {(["chart", "earnings", "portfolio"] as const).map((p) => (
                    <button
                        key={p}
                        onClick={() => onPageChange(p)}
                        className={"t-tool-btn t-tool-btn--text" + (page === p ? " active" : "")}
                    >
                        {p.toUpperCase()}
                    </button>
                ))}
            </div>

            {/* Command search */}
            <div className="t-cmd-search">
                <input
                    ref={inputRef}
                    className="t-cmd-input"
                    value={input}
                    onChange={(e) => { setInput(e.target.value.toUpperCase()); setInputErr(null); }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") { submit(); inputRef.current?.blur(); }
                        if (e.key === "Escape") { setInputErr(null); inputRef.current?.blur(); }
                    }}
                    placeholder={inputErr ?? (checking ? "VERIFYING…" : `${symbol} EQUITY <GO>   |   search tickers, news, screens...`)}
                    style={{ borderColor: inputErr ? "var(--down)" : checking ? "var(--accent)" : undefined }}
                    disabled={checking}
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
                    className="t-tool-btn active"
                    style={{ fontWeight: 700, fontSize: 11, flexShrink: 0 }}
                >
                    {(user.email?.[0] ?? "U").toUpperCase()}
                </button>
            ) : (
                <button
                    onClick={onSignIn}
                    className="t-tool-btn t-tool-btn--text"
                    style={{ flexShrink: 0 }}
                >
                    SIGN IN
                </button>
            )}
        </div>
    );
}
