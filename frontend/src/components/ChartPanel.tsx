import { useState, useEffect } from "react";
import PriceChart from "./PriceChart";
import type { OverlayData, HoverCandle } from "./PriceChart";
import "../terminal.css";

const TIMEFRAMES = ["1D", "1W", "1M", "3M", "6M", "1Y", "5Y", "ALL"] as const;
type TF = typeof TIMEFRAMES[number];

// Overlay indicator keys that can be toggled from the toolbar
const OVERLAY_TOGGLES = [
    { id: "sma",  label: "SMA" },
    { id: "ema",  label: "EMA" },
    { id: "bb",   label: "BOLL" },
    { id: "vwap", label: "VWAP" },
] as const;

interface Candle {
    time: string | number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

interface Props {
    symbol: string;
    timeframe: string;
    overlays: OverlayData;
    activeIndicators: Set<string>;
    onToggleIndicator: (id: string) => void;
    onStatsChange: (c: Candle | null) => void;
    onCandlesChange: (c: Candle[]) => void;
    onTimeframeChange: (tf: string) => void;
    stats: Candle | null;
    candles: Candle[];
}

function fmtVol(v: number): string {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
    return String(v);
}

function fmtTime(time: string | number): string {
    if (typeof time === "number") return new Date(time * 1000).toLocaleString();
    return time;
}

export default function ChartPanel({
    symbol,
    timeframe,
    overlays,
    activeIndicators,
    onToggleIndicator,
    onStatsChange,
    onCandlesChange,
    onTimeframeChange,
    stats,
    candles,
}: Props) {
    const [hover, setHover] = useState<HoverCandle | null>(null);
    const [chartType, setChartType] = useState<"CANDLE" | "LINE">(() => 
        (localStorage.getItem("chartType") as "CANDLE" | "LINE") ?? "CANDLE"
    );

    useEffect(() => { localStorage.setItem("chartType", chartType); }, [chartType]);

    function handleTimeframe(tf: TF) {
        onTimeframeChange(tf);
    }

    // Price display: prefer crosshair hover data, fall back to last candle stats
    const display = hover ?? stats;

    // Price change vs previous candle
    const priceChange = candles.length >= 2
        ? candles[candles.length - 1].close - candles[candles.length - 2].close
        : null;
    const priceChangePct = priceChange !== null && candles[candles.length - 2]?.close
        ? (priceChange / candles[candles.length - 2].close) * 100
        : null;

    const isUp = priceChange !== null ? priceChange >= 0 : true;
    const priceColor = isUp ? "var(--up)" : "var(--down)";
    const priceBg    = isUp ? "var(--up-bg)" : "var(--down-bg)";

    // OHLC overlay line
    const ohlcDisplay = hover ?? stats;

    return (
        <div className="t-panel t-chart-panel">
            {/* Chart header */}
            <div style={{
                padding: "10px 14px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                gap: 16,
                flexShrink: 0,
            }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700, letterSpacing: "0.03em" }}>
                        {symbol}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
                        {/* TODO: replace with real company name from a metadata endpoint */}
                        {symbol}
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", padding: "2px 6px", border: "1px solid var(--border-bright)" }}>
                        NASDAQ
                    </span>
                </div>

                <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginLeft: "auto" }}>
                    <div className="t-live-pulse" />
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 600, color: priceColor }}>
                        {display ? display.close.toFixed(2) : "—"}
                    </span>
                    {priceChange !== null && (
                        <>
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 500, color: priceColor }}>
                                {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)}
                            </span>
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: priceColor, background: priceBg, padding: "3px 8px" }}>
                                {priceChangePct !== null ? `${priceChangePct >= 0 ? "+" : ""}${priceChangePct.toFixed(2)}%` : "—"}
                            </span>
                        </>
                    )}
                </div>
            </div>

            {/* Chart toolbar */}
            <div style={{
                padding: "6px 14px",
                display: "flex",
                alignItems: "center",
                gap: 6,
                borderBottom: "1px solid var(--border)",
                flexShrink: 0,
            }}>
                {/* Timeframe buttons */}
                <div className="t-tf-group">
                    {TIMEFRAMES.map((tf) => (
                        <button
                            key={tf}
                            className={"t-tf-btn" + (tf === timeframe ? " active" : "")}
                            onClick={() => handleTimeframe(tf)}
                        >
                            {tf}
                        </button>
                    ))}
                </div>

                <div style={{ width: 1, height: 18, background: "var(--border-bright)", margin: "0 4px" }} />

                {/* Chart type */}
                {(["CANDLE", "LINE"] as const).map((ct) => (
                    <button
                        key={ct}
                        className={"t-tool-btn" + (chartType === ct ? " active" : "")}
                        onClick={() => setChartType(ct)}
                    >
                        {ct}
                    </button>
                ))}

                <div style={{ width: 1, height: 18, background: "var(--border-bright)", margin: "0 4px" }} />

                {/* Indicator overlay toggles */}
                {OVERLAY_TOGGLES.map(({ id, label }) => (
                    <button
                        key={id}
                        className={"t-tool-btn" + (activeIndicators.has(id) ? " active" : "")}
                        onClick={() => onToggleIndicator(id)}
                    >
                        {label}
                    </button>
                ))}
                <button className="t-tool-btn" title="Add more indicators">+ ADD</button>
            </div>

            {/* Chart viewport */}
            <div className="t-chart-viewport">
                {ohlcDisplay && (
                    <div className="t-chart-overlay-stats">
                        O<span>{ohlcDisplay.open.toFixed(2)}</span>
                        {"  "}H<span>{ohlcDisplay.high.toFixed(2)}</span>
                        {"  "}L<span>{ohlcDisplay.low.toFixed(2)}</span>
                        {"  "}C<span>{ohlcDisplay.close.toFixed(2)}</span>
                        {"  "}VOL<span>{fmtVol(ohlcDisplay.volume)}</span>
                        {"  "}T<span>{fmtTime(ohlcDisplay.time)}</span>
                    </div>
                )}
                <PriceChart
                    symbol={symbol}
                    timeframe={timeframe}
                    chartType={chartType}
                    overlays={overlays}
                    onStatsChange={onStatsChange}
                    onCandlesChange={onCandlesChange}
                    onHoverChange={setHover}
                />
            </div>
        </div>
    );
}
