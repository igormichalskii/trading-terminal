import { useState } from "react";
import type { User } from "@supabase/supabase-js";

export const INDICATORS = [
    { id: "sma", label: "SMA", type: "overlay", fullName: "Simple Moving Average" },
    { id: "ema", label: "EMA", type: "overlay", fullName: "Exponential Moving Average" },
    { id: "bb", label: "BB", type: "overlay", fullName: "Bollinger Bands" },
    { id: "vwap", label: "VWAP", type: "overlay", fullName: "Volume-Weighted Average Price" },
    { id: "wma", label: "WMA", type: "overlay", fullName: "Weighted Moving Average" },
    { id: "dema", label: "DEMA", type: "overlay", fullName: "Double Exponential Moving Average" },
    { id: "tema", label: "TEMA", type: "overlay", fullName: "Triple Exponential Moving Average" },
    { id: "kc", label: "KC", type: "overlay", fullName: "Keltner Channel" },
    { id: "dc", label: "DC", type: "overlay", fullName: "Donchian Channels" },
    { id: "rsi", label: "RSI", type: "oscillator", fullName: "Relative Strength Index" },
    { id: "macd", label: "MACD", type: "oscillator", fullName: "Moving Average Convergence Divergence" },
    { id: "stoch", label: "STOCH", type: "oscillator", fullName: "Stochastic Oscillator" },
    { id: "atr", label: "ATR", type: "oscillator", fullName: "Average True Range" },
    { id: "obv", label: "OBV", type: "oscillator", fullName: "On-Balance Volume" },
    { id: "ichimoku", label: "ICHIMOKU", type: "overlay", fullName: "Ichimoku" },
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

    return (
        <div
            style={{ position: "fixed", inset: 0, zIndex: 50, display: isOpen ? "flex" : "none", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)" }}
            onClick={onClose}
        >
            <div
                style={{ background: "var(--panel)", border: "1px solid var(--border-bright)", padding: "28px 24px", width: "100%", maxWidth: 360, margin: "0 16px" }}
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

                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                    {INDICATORS.map((indicator) => (
                        <div 
                            key={indicator.id}
                            style={{ display: "flex", justifyContent: "space-between"}}                            
                        >
                            <span>
                                {indicator.fullName}
                            </span>
                            {user === null ? (
                                <span
                                    style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", letterSpacing: "0.04em", textDecoration: "underline" }}
                                >
                                    Sign In First
                                </span>
                            ) : (
                            <button
                                style={{ color: pinnedIndicators.has(indicator.id) ? "rgb(244, 202, 51)" : "#7d7c7c"}}
                                onClick={() => {
                                    if (pinnedIndicators.has(indicator.id)) onUnpin(indicator.id);
                                    else onPin(indicator.id);
                                }}
                            >
                                {pinnedIndicators.has(indicator.id) ? "★" : "☆"}
                            </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}