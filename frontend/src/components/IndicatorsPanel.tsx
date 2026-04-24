import { useState, useEffect } from "react";
import IndicatorSubChart from "./IndicatorSubChart";
import type { SubChartSeries } from "./IndicatorSubChart";
import NewsFeed from "./NewsFeed";
import MLPrediction from "./MLPrediction";
import { apiFetch } from "../lib/api";
import "../terminal.css";

interface Point { time: string | number; value: number; }

interface IndicatorResponse {
    indicators: {
        sma?:  Point[];
        ema?:  Point[];
        vwap?: Point[];
        rsi?:  Point[];
        atr?:  Point[];
        obv?:  Point[];
        bb?:   { upper: Point[]; middle: Point[]; lower: Point[] };
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

export interface SubPanel {
    id: string;
    label: string;
    series: SubChartSeries[];
    refLines?: { value: number; color: string }[];
}

const TABS = ["OVERVIEW", "SIGNALS", "NEWS", "PREDICTIONS"] as const;
type Tab = typeof TABS[number];

interface Props {
    symbol: string;
    timeframe: string;
    lastClose: number | null;
}

export default function IndicatorsPanel({ symbol, timeframe, lastClose }: Props) {
    const [tab, setTab] = useState<Tab>("OVERVIEW");
    const [cells, setCells] = useState<IndicatorCell[]>([]);
    const [signalPanels, setSignalPanels] = useState<SubPanel[]>([]);

    useEffect(() => {
        if (!lastClose) return;
        const all = "sma,ema,bb,vwap,rsi,macd,stoch,atr,obv";
        apiFetch<IndicatorResponse>(`/indicators/${symbol}?timeframe=${timeframe}&indicators=${all}`)
            .then(({ indicators }) => {
                setCells(buildCells(indicators, lastClose));
                const panels: SubPanel[] = [];
                if (indicators.rsi)
                    panels.push({ id: "rsi", label: "RSI (14)", series: [{ data: indicators.rsi, color: "#f59e0b" }], refLines: [{ value: 70, color: "#ef444466" }, { value: 30, color: "#22c55e66" }] });
                if (indicators.macd)
                    panels.push({ id: "macd", label: "MACD (12, 26, 9)", series: [{ data: indicators.macd.macd, color: "#3b82f6" }, { data: indicators.macd.signal, color: "#f59e0b" }, { data: indicators.macd.histogram, color: "#22c55e", type: "histogram" as const }] });
                if (indicators.stoch)
                    panels.push({ id: "stoch", label: "Stochastic (14, 3)", series: [{ data: indicators.stoch.k, color: "#3b82f6" }, { data: indicators.stoch.d, color: "#f59e0b" }], refLines: [{ value: 80, color: "#ef444466" }, { value: 20, color: "#22c55e66" }] });
                if (indicators.atr)
                    panels.push({ id: "atr", label: "ATR (14)", series: [{ data: indicators.atr, color: "#a855f7" }] });
                if (indicators.obv)
                    panels.push({ id: "obv", label: "OBV", series: [{ data: indicators.obv, color: "#06b6d4" }] });
                setSignalPanels(panels);
            })
            .catch(() => {});
    }, [symbol, timeframe, lastClose]);

    return (
        <div className="t-panel t-indicators-panel">
            <div className="t-panel-header">
                <span className="t-panel-title">TECHNICAL INDICATORS · SIGNALS</span>
                <div style={{ display: "flex", gap: 2 }}>
                    <button className="t-icon-btn" title="Configure">⚙</button>
                    <button className="t-icon-btn" title="Expand">⛶</button>
                </div>
            </div>

            <div className="t-ind-tabs">
                {TABS.map((t) => (
                    <button
                        key={t}
                        className={"t-ind-tab" + (tab === t ? " active" : "")}
                        onClick={() => setTab(t)}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {/* OVERVIEW — real indicator signals */}
            {tab === "OVERVIEW" && (
                <div className="t-ind-content">
                    {cells.length === 0 ? (
                        <div style={{ padding: "12px 8px", fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
                            {lastClose ? "Loading…" : "Load a symbol to see signals."}
                        </div>
                    ) : cells.map((cell) => (
                        <div key={cell.name} className="t-ind-cell">
                            <div>
                                <div className="t-ind-name">{cell.name}</div>
                                <div className="t-ind-value" style={{ color: sigColor(cell.signal) }}>
                                    {cell.value}
                                </div>
                            </div>
                            <div>
                                <div className={`t-ind-signal t-sig-${cell.signal.toLowerCase()}`}>● {cell.signal}</div>
                                <div className="t-mini-bar">
                                    <div className="t-mini-bar-fill" style={{ width: `${cell.bar}%`, background: sigColor(cell.signal) }} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* SIGNALS — oscillator sub-charts, always populated */}
            {tab === "SIGNALS" && (
                <div className="t-signals-scroll">
                    {signalPanels.length === 0 ? (
                        <div style={{ padding: 24, color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.05em" }}>
                            {lastClose ? "Loading…" : "Load a symbol to see signals."}
                        </div>
                    ) : (
                        signalPanels.map((p) => (
                            <IndicatorSubChart
                                key={p.id}
                                label={p.label}
                                series={p.series}
                                refLines={p.refLines}
                            />
                        ))
                    )}
                </div>
            )}

            {/* NEWS */}
            {tab === "NEWS" && (
                <div style={{ flex: 1, overflowY: "auto" }}>
                    <NewsFeed symbol={symbol} />
                </div>
            )}

            {/* PREDICTIONS */}
            {tab === "PREDICTIONS" && (
                <div style={{ flex: 1, overflowY: "auto" }}>
                    <MLPrediction symbol={symbol} />
                </div>
            )}
        </div>
    );
}
