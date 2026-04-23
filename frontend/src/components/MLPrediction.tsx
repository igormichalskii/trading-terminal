import { useState, useEffect } from "react";
import { apiFetch } from "../lib/api";

interface FeatureImportance {
    feature: string;
    label: string;
    importance: number;
}

interface PredictionResult {
    symbol: string;
    direction: "up" | "down";
    up_probability: number;
    confidence: number;
    trained_on: number;
    feature_importances: FeatureImportance[];
    signal_date: string;
}

interface Props {
    symbol: string;
}

export default function MLPrediction({ symbol }: Props) {
    const [result,  setResult]  = useState<PredictionResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error,   setError]   = useState<string | null>(null);

    useEffect(() => {
        setResult(null);
        setError(null);
        setLoading(true);
        apiFetch<PredictionResult>(`/predict/${symbol}`)
            .then(setResult)
            .catch(() => setError("Prediction unavailable"))
            .finally(() => setLoading(false));
    }, [symbol]);

    const mono: React.CSSProperties = { fontFamily: "var(--font-mono)" };

    if (loading) return (
        <div style={{ ...mono, padding: "16px 12px", fontSize: 11, color: "var(--text-muted)" }}>
            RUNNING MODEL…
        </div>
    );

    if (error) return (
        <div style={{ ...mono, padding: "16px 12px", fontSize: 11, color: "var(--down)" }}>
            {error.toUpperCase()}
        </div>
    );

    if (!result) return null;

    const isUp       = result.direction === "up";
    const confPct    = Math.round(result.confidence * 100);
    const upPct      = Math.round(result.up_probability * 100);
    const downPct    = 100 - upPct;
    const topFeats   = result.feature_importances.slice(0, 6);
    const dirColor   = isUp ? "var(--up)" : "var(--down)";
    const dirBg      = isUp ? "var(--up-bg)" : "var(--down-bg)";

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>

            {/* Direction header */}
            <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                borderBottom: "1px solid var(--border)",
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                        ...mono,
                        fontSize: 22,
                        fontWeight: 700,
                        color: dirColor,
                        background: dirBg,
                        padding: "4px 10px",
                        letterSpacing: "0.04em",
                    }}>
                        {isUp ? "↑ BULLISH" : "↓ BEARISH"}
                    </div>
                    <div style={{ ...mono, fontSize: 11, color: "var(--text-dim)" }}>
                        <span style={{ color: dirColor, fontWeight: 600 }}>{confPct}%</span>
                        <span style={{ color: "var(--text-muted)" }}> CONFIDENCE</span>
                    </div>
                </div>
                <div style={{ ...mono, fontSize: 10, color: "var(--text-muted)", textAlign: "right" }}>
                    <div>TRAINED ON {result.trained_on} DAYS</div>
                    <div>AS OF {result.signal_date}</div>
                </div>
            </div>

            {/* Probability bar */}
            <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ ...mono, fontSize: 10, color: "var(--down)" }}>
                        ↓ BEARISH {downPct}%
                    </span>
                    <span style={{ ...mono, fontSize: 10, color: "var(--up)" }}>
                        ↑ BULLISH {upPct}%
                    </span>
                </div>
                <div style={{ height: 6, background: "var(--border)", position: "relative" }}>
                    {/* Bearish fill from left */}
                    <div style={{
                        position: "absolute", top: 0, bottom: 0, left: 0,
                        width: `${downPct}%`,
                        background: "var(--down)",
                        opacity: 0.6,
                    }} />
                    {/* Bullish fill from right */}
                    <div style={{
                        position: "absolute", top: 0, bottom: 0, right: 0,
                        width: `${upPct}%`,
                        background: "var(--up)",
                        opacity: 0.6,
                    }} />
                </div>
            </div>

            {/* Feature importances */}
            <div style={{ padding: "10px 12px" }}>
                <div style={{ ...mono, fontSize: 9, letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 8 }}>
                    TOP FEATURES
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {topFeats.map((f) => {
                        const pct = Math.round(f.importance * 100);
                        return (
                            <div key={f.feature} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8, alignItems: "center" }}>
                                <div style={{ height: 3, background: "var(--border)", position: "relative" }}>
                                    <div style={{
                                        position: "absolute", top: 0, bottom: 0, left: 0,
                                        width: `${pct}%`,
                                        background: "var(--accent)",
                                    }} />
                                </div>
                                <span style={{ ...mono, fontSize: 10, color: "var(--text-dim)", whiteSpace: "nowrap" }}>
                                    {f.label}
                                </span>
                                <span style={{ ...mono, fontSize: 10, color: "var(--text-muted)", minWidth: 28, textAlign: "right" }}>
                                    {pct}%
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Disclaimer */}
            <div style={{
                ...mono,
                fontSize: 9,
                color: "var(--text-muted)",
                letterSpacing: "0.04em",
                padding: "6px 12px 10px",
                borderTop: "1px solid var(--border)",
                lineHeight: 1.5,
            }}>
                SIGNAL ONLY — NOT FINANCIAL ADVICE. PAST PATTERNS DO NOT GUARANTEE FUTURE RESULTS.
            </div>
        </div>
    );
}
