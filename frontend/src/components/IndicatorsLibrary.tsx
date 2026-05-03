import { useState } from "react";
import type { User } from "@supabase/supabase-js";

export const INDICATORS = [
    { id: "sma", label: "SMA", type: "overlay", fullName: "Simple Moving Average", description: "The arithmetic mean of price over N bars. Smooths out noise to show the underlying trend; lags more as length increases." },
    { id: "ema", label: "EMA", type: "overlay", fullName: "Exponential Moving Average", description: "A moving average that weights recent prices more heavily, so it reacts faster to price changes than the SMA." },
    { id: "bb", label: "BB", type: "overlay", fullName: "Bollinger Bands", description: "A basis SMA with upper and lower bands set at ±2 standard deviations. Bands widen during volatility and contract during calm periods; useful for spotting squeezes and overextensions." },
    { id: "vwap", label: "VWAP", type: "overlay", fullName: "Volume-Weighted Average Price", description: "The average price weighted by volume traded at each level, anchored to the start of the session. Widely used as an intraday fair-value benchmark by institutional traders." },
    { id: "wma", label: "WMA", type: "overlay", fullName: "Weighted Moving Average", description: "A moving average that assigns linearly decreasing weights to older prices. Faster than SMA, smoother than EMA." },
    { id: "dema", label: "DEMA", type: "overlay", fullName: "Double Exponential Moving Average", description: "An EMA-of-EMA construction that subtracts out lag, giving a smoother line that tracks price more closely than a standard EMA." },
    { id: "tema", label: "TEMA", type: "overlay", fullName: "Triple Exponential Moving Average", description: "Extends the DEMA concept with a third EMA layer to further reduce lag while preserving smoothing." },
    { id: "kc", label: "KC", type: "overlay", fullName: "Keltner Channel", description: "A basis EMA with upper and lower bands offset by a multiple of the Average True Range. Similar to Bollinger Bands but uses ATR (volatility based on range) instead of standard deviation." },
    { id: "dc", label: "DC", type: "overlay", fullName: "Donchian Channels", description: "Plots the highest high and lowest low over the last N bars as upper and lower bounds. Classic breakout indicator — a close beyond the channel signals a new directional move." },
    { id: "rsi", label: "RSI", type: "oscillator", fullName: "Relative Strength Index", description: "A bounded oscillator (0–100) measuring the magnitude of recent gains vs. losses. Readings above 70 suggest overbought conditions, below 30 suggest oversold." },
    { id: "macd", label: "MACD", type: "oscillator", fullName: "Moving Average Convergence Divergence", description: "The difference between two EMAs (typically 12 and 26), plotted with a signal line and histogram. Used to identify momentum shifts and trend changes via crossovers and divergences." },
    { id: "stoch", label: "STOCH", type: "oscillator", fullName: "Stochastic Oscillator", description: "Compares the current close to the high-low range over N bars, scaled 0–100. Identifies overbought/oversold conditions and momentum reversals." },
    { id: "atr", label: "ATR", type: "oscillator", fullName: "Average True Range", description: 'The average of the "true range" over N bars, capturing volatility regardless of direction. Used for position sizing, stop placement, and as an input to other indicators.' },
    { id: "obv", label: "OBV", type: "oscillator", fullName: "On-Balance Volume", description: 'A cumulative running total that adds volume on up days and subtracts it on down days. Used to confirm trends or spot divergences between price and volume flow.' },
    { id: "ichimoku", label: "ICHIMOKU", type: "overlay", fullName: "Ichimoku", description: 'A multi-component system (Tenkan, Kijun, Senkou A/B forming the "cloud," and Chikou). Provides trend direction, support/resistance, and momentum signals all in one overlay.' },
    { id: "hma", label: "HMA", type: "overlay", fullName: "Hull Moving Average", description: "Hull's triple-WMA construction that nearly eliminates lag while maintaining smoothness. Particularly responsive in fast-moving markets. Calculated as WMA(2×WMA(n/2) − WMA(n), √n)." },
    { id: "vwma", label: "VWMA", type: "overlay", fullName: "Volume Weighted Moving Average", description: "A moving average weighted by trading volume — bars with higher volume pull the line more. Divergence between VWMA and SMA signals that smart money is moving against the crowd." },
    { id: "kama", label: "KAMA", type: "overlay", fullName: "Kaufman Adaptive Moving Average", description: "An EMA whose smoothing constant adapts to the Efficiency Ratio: fast when price trends cleanly, slow when it chops sideways. Significantly reduces whipsaws in ranging markets." },
    { id: "alma", label: "ALMA", type: "overlay", fullName: "Arnaud Legoux Moving Average", description: "Uses a Gaussian kernel offset toward recent prices to cut lag and reduce noise simultaneously. The offset and sigma parameters control the balance between responsiveness and smoothness." },
    { id: "zlema", label: "ZLEMA", type: "overlay", fullName: "Zero Lag Exponential Moving Average", description: "An EMA with a lag-correction term subtracted before the smoothing step. Tracks price more closely than a standard EMA without adding significant noise." },
    { id: "lsma", label: "LSMA", type: "overlay", fullName: "Least Squares Moving Average", description: "The endpoint of a linear regression line fitted to the last N bars — the 'expected' price given the recent trend. Also known as the Linear Regression Curve." },
    { id: "trima", label: "TRIMA", type: "overlay", fullName: "Triangular Moving Average", description: "A double-smoothed SMA (SMA of an SMA) that gives more weight to the middle of the price window. Slower and smoother than a standard SMA; reduces whipsaws in sideways markets." },
    { id: "t3", label: "T3", type: "overlay", fullName: "Tillson T3", description: "A series of six EMA passes with a volume factor, producing an ultra-smooth line with minimal lag. The volume factor (default 0.7) controls how closely it follows price." },
    { id: "mcginley", label: "MCGINLEY", type: "overlay", fullName: "McGinley Dynamic", description: "A dynamic line that adjusts its speed based on the ratio of current price to the previous value. Follows price faster in trending markets and slower in choppy ones, reducing whipsaws." },
    { id: "vidya", label: "VIDYA", type: "overlay", fullName: "Variable Index Dynamic Average", description: "An EMA whose alpha is scaled by the Chande Momentum Oscillator — speeds up when momentum is strong and slows down when it's weak. Adapts naturally to both trending and ranging conditions." },
]

interface Props {
    user: User | null;
    pinnedIndicators: Set<string>;
    isOpen: boolean;
    onPin: (id: string) => void;
    onUnpin: (id: string) => void;
    onClose: () => void;
}

export default function IndicatorsLibrary({
    user,
    pinnedIndicators,
    isOpen,
    onPin,
    onUnpin,
    onClose,
}: Props) {
    const [closeHover, setCloseHover] = useState(false);
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    return (
        <div
            style={{ position: "fixed", inset: 0, zIndex: 50, display: isOpen ? "flex" : "none", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)" }}
            onClick={onClose}
        >
            <div
                style={{ background: "var(--panel)", border: "1px solid var(--border-bright)", padding: "28px 24px", width: "100%", maxWidth: 360, margin: "0 16px", maxHeight: "80vh", overflowY: "hidden" }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 14, height: 14, background: "var(--accent)", clipPath: "polygon(0 0, 100% 0, 100% 50%, 50% 50%, 50% 100%, 0 100%)", flexShrink: 0 }} />
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "var(--text)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                            indicators
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        onMouseEnter={() => setCloseHover(true)}
                        onMouseLeave={() => setCloseHover(false)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: closeHover ? "var(--down)" : "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: 14, lineHeight: 1, padding: "2px 4px", marginLeft: "auto", transition: "color 0.15s" }}
                    >
                        ✕
                    </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", maxHeight: "calc(80vh - 80px)" }}>
                    {INDICATORS.map((indicator) => (
                        <div
                            key={indicator.id}
                            style={{ display: "flex", alignItems: "center", gap: 8, position: "relative", minHeight: 28}}
                        >
                            {user === null ? (
                                <span
                                    style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent)", letterSpacing: "0.04em", flexShrink: 0, width: 20, textAlign: "center" }}
                                >
                                    -
                                </span>
                            ) : (
                                <button
                                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: pinnedIndicators.has(indicator.id) ? "rgb(244, 202, 51)" : "#7d7c7c" }}
                                    onClick={() => {
                                        if (pinnedIndicators.has(indicator.id)) onUnpin(indicator.id);
                                        else onPin(indicator.id);
                                    }}
                                >
                                    {pinnedIndicators.has(indicator.id) ? "★" : "☆"}
                                </button>
                            )}
                            <span
                                style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text)", flex: 1, letterSpacing: "0.03em" }}
                            >
                                {indicator.fullName}
                            </span>
                            <button
                                onMouseEnter={() => setHoveredId(indicator.id)}
                                onMouseLeave={() => setHoveredId(null)}
                                style={{ background: "none", border: "none", cursor: "pointer", color: hoveredId === indicator.id ? "var(--accent)" : "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 12, flexShrink: 0, width: 20, padding: 0, transition: "color 0.15s" }}
                            >
                                ?
                            </button>
                            {hoveredId === indicator.id && (
                                <div
                                    style={{
                                        position: "absolute",
                                        right: "28px",
                                        top: 0,
                                        width: 220,
                                        background: "var(--panel)",
                                        border: "1px solid var(--border-bright)",
                                        padding: "10px 12px",
                                        fontSize: 11,
                                        color: "var(--text-dim)",
                                        fontFamily: "var(--font-mono)",
                                        lineHeight: 1.5,
                                        zIndex: 100,
                                    }}>
                                        {indicator.description}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}