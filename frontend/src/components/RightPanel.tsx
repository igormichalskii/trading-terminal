import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

const SUBCHART_INDICATORS = [
    { id: "rsi", label: "RSI (14)" },
    { id: "macd", label: "MACD" },
    { id: "stoch", label: "Stochastic" },
    { id: "atr", label: "ATR (14)" },
    { id: "obv", label: "OBV" },
];

const NAME_TO_SUBCHART_ID: Record<string, string> = {
    "RSI (14)": "rsi",
    "MACD": "macd",
    "STOCH %K": "stoch",
    "ATR (14)": "atr",
    "OBV": "obv",
};

interface Props {
    symbol: string,
    timeframe: string,
    lastClose: number | null,
    activePanel: string | null;
    activeSubCharts: Set<string>;
    onToggleSubChart: (id: string) => void;
    onDataReady?: (indicators: IndicatorResponse["indicators"]) => void;
}

interface Point { time: string | number; value: number; }

interface IndicatorResponse {
    indicators: {
        sma?: Point[];
        ema?: Point[];
        vwap?: Point[];
        rsi?: Point[];
        atr?: Point[];
        obv?: Point[];
        bb?: { upper: Point[]; middle: Point[]; lower: Point[] };
        macd?: { macd: Point[]; signal: Point[]; histogram: Point[] };
        stoch?: { k: Point[]; d: Point[] };
    };
}

type Signal = "BUY" | "HOLD" | "SELL";

interface IndicatorCell {
    name: string;
    value: string;
    signal: Signal;
    bar: number;
}

function last(arr: Point[] | undefined) { return arr ? arr[arr.length - 1] : undefined; }

function sigColor(s: Signal) {
    return s === "BUY" ? "var(--up)" : s === "SELL" ? "var(--down)" : "var(--text-dim)";
}

function clamp(v: number, lo = 0, hi = 100) { return Math.min(hi, Math.max(lo, v)); }

function buildCells(ind: IndicatorResponse["indicators"], close: number): IndicatorCell[] {
    const cells: IndicatorCell[] = [];

    if (ind.rsi) {
        const v = last(ind.rsi)?.value ?? 50;
        const s: Signal = v > 70 ? "SELL" : v < 30 ? "BUY" : "HOLD";
        cells.push({ name: "RSI (14)", value: v.toFixed(1), signal: s, bar: v });
    }

    if (ind.macd) {
        const v = last(ind.macd.macd)?.value ?? 0;
        const h = last(ind.macd.histogram)?.value ?? 0;
        const s: Signal = v > 0 && h > 0 ? "BUY" : v < 0 && h < 0 ? "SELL" : "HOLD";
        cells.push({ name: "MACD", value: (v >= 0 ? "+" : "") + v.toFixed(2), signal: s, bar: s === "BUY" ? 72 : s === "SELL" ? 28 : 50 });
    }

    if (ind.stoch) {
        const v = last(ind.stoch.k)?.value ?? 50;
        const s: Signal = v > 80 ? "SELL" : v < 20 ? "BUY" : "HOLD";
        cells.push({ name: "STOCH %K", value: v.toFixed(1), signal: s, bar: v });
    }

    if (ind.sma) {
        const v = last(ind.sma)?.value ?? close;
        const dev = ((close - v) / v) * 100;
        const s: Signal = dev > 0.5 ? "BUY" : dev < -0.5 ? "SELL" : "HOLD";
        cells.push({ name: "SMA (20)", value: v.toFixed(2), signal: s, bar: clamp(50 + dev * 10) });
    }

    if (ind.ema) {
        const v = last(ind.ema)?.value ?? close;
        const dev = ((close - v) / v) * 100;
        const s: Signal = dev > 0.5 ? "BUY" : dev < -0.5 ? "SELL" : "HOLD";
        cells.push({ name: "EMA (20)", value: v.toFixed(2), signal: s, bar: clamp(50 + dev * 10) });
    }

    if (ind.bb) {
        const upper = last(ind.bb.upper)?.value ?? close;
        const lower = last(ind.bb.lower)?.value ?? close;
        const pos = upper !== lower ? ((close - lower) / (upper - lower)) * 100 : 50;
        const s: Signal = pos > 80 ? "SELL" : pos < 20 ? "BUY" : "HOLD";
        cells.push({ name: "BOLLINGER", value: pos > 75 ? "UPPER" : pos < 25 ? "LOWER" : "MIDDLE", signal: s, bar: clamp(pos) });
    }

    if (ind.atr) {
        const v = last(ind.atr)?.value ?? 0;
        cells.push({ name: "ATR (14)", value: v.toFixed(2), signal: "HOLD", bar: clamp((v / close) * 1000) });
    }

    if (ind.obv) {
        const arr = ind.obv;
        const v = last(arr)?.value ?? 0;
        const prev = arr.length > 5 ? arr[arr.length - 6]?.value ?? v : v;
        const s: Signal = v > prev ? "BUY" : v < prev ? "SELL" : "HOLD";
        const abs = Math.abs(v);
        const fmt = abs >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : abs >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : v.toFixed(0);
        cells.push({ name: "OBV", value: (v >= 0 ? "+" : "") + fmt, signal: s, bar: s === "BUY" ? 68 : s === "SELL" ? 32 : 50 });
    }

    if (ind.vwap) {
        const v = last(ind.vwap)?.value ?? close;
        const dev = ((close - v) / v) * 100;
        const s: Signal = dev > 0.5 ? "BUY" : dev < -0.5 ? "SELL" : "HOLD";
        cells.push({ name: "VWAP", value: v.toFixed(2), signal: s, bar: clamp(50 + dev * 10) });
    }

    return cells;
}


export default function RightPanel({
    symbol,
    timeframe,
    lastClose,
    activePanel,
    activeSubCharts,
    onToggleSubChart,
    onDataReady,
}: Props) {
    const [cells, setCells] = useState<IndicatorCell[]>([]);

    useEffect(() => {
        if (!lastClose) return;
        const all = "sma,ema,bb,vwap,rsi,macd,stoch,atr,obv";
        apiFetch<IndicatorResponse>(`/indicators/${symbol}?timeframe=${timeframe}&indicators=${all}`)
            .then(({ indicators }) => {
                setCells(buildCells(indicators, lastClose));
                onDataReady?.(indicators);
            })
            .catch(() => { });
    }, [symbol, timeframe, lastClose]);

    if (!activePanel) return null;

    return (
        <div className="t-panel t-right-panel">
            <div style={{
                padding: "12px 14px", borderBottom: "1px solid var(--border)",
                fontFamily: "var(--font-mono)", fontSize: 11
            }}>
                {activePanel.toUpperCase()}
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
                {activePanel === "indicators" && (
                    <div>
                        {cells.length === 0 ? (
                            <div style={{ padding: 16, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-dim)" }}>
                                {lastClose ? "Loading…" : "Load a symbol to see signals."}
                            </div>
                        ) : cells.map((cell) => {
                            const subchartId = NAME_TO_SUBCHART_ID[cell.name] ?? null;
                            return (
                                <div key={cell.name} className="t-ind-cell">
                                    <div>
                                        <div className="t-ind-name">{cell.name}</div>
                                        <div className="t-ind-value" style={{ color: sigColor(cell.signal) }}>{cell.value}</div>
                                    </div>
                                    <div>
                                        <div className={`t-ind-signal t-sig-${cell.signal.toLowerCase()}`}>● {cell.signal}</div>
                                        <div className="t-mini-bar">
                                            <div className="t-mini-bar-fill" style={{ width: `${cell.bar}%`, background: sigColor(cell.signal) }} />
                                        </div>
                                        {subchartId && (
                                            <button onClick={() => onToggleSubChart(subchartId)}
                                                style={{
                                                    marginTop: 4, background: "none", border: "1px solid var(--border-bright)", color: activeSubCharts.has(subchartId) ? "var(--accent)" :
                                                        "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: 9, padding: "2px 6px", cursor: "pointer"
                                                }}>
                                                {activeSubCharts.has(subchartId) ? "CHART ●" : "CHART"}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}