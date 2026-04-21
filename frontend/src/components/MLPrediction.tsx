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
    const [result, setResult] = useState<PredictionResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setResult(null);
        setError(null);
        setLoading(true);
        apiFetch<PredictionResult>(`/predict/${symbol}`)
            .then(setResult)
            .catch(() => setError("Prediction unavailable"))
            .finally(() => setLoading(false));
    }, [symbol]);

    const isUp = result?.direction === "up";
    const confidencePct = result ? Math.round(result.confidence * 100) : 0;
    const upPct = result ? Math.round(result.up_probability * 100) : 0;
    const topFeatures = result?.feature_importances.slice(0, 4) ?? [];

    return (
        <div className="bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] p-4 mt-3">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-300">ML Signal</span>
                    <span className="text-[10px] text-gray-600 bg-[#2a2a2a] px-1.5 py-0.5 rounded">
                        Random Forest
                    </span>
                </div>
                {result && (
                    <span className="text-[10px] text-gray-600">
                        Trained on {result.trained_on} days · as of {result.signal_date}
                    </span>
                )}
            </div>

            {loading && (
                <div className="flex items-center gap-2 py-2">
                    <div className="w-4 h-4 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
                    <span className="text-xs text-gray-500">Running model…</span>
                </div>
            )}

            {!loading && error && (
                <p className="text-xs text-gray-600">{error}</p>
            )}

            {!loading && result && (
                <div className="flex gap-6">
                    {/* Direction + confidence */}
                    <div className="flex items-center gap-3 shrink-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold ${
                            isUp ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
                        }`}>
                            {isUp ? "↑" : "↓"}
                        </div>
                        <div>
                            <div className={`text-sm font-semibold ${isUp ? "text-green-400" : "text-red-400"}`}>
                                {isUp ? "Bullish" : "Bearish"}
                            </div>
                            <div className="text-[10px] text-gray-500">{confidencePct}% confidence</div>
                        </div>
                    </div>

                    {/* Probability bar */}
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                            <span>Bearish {100 - upPct}%</span>
                            <span>Bullish {upPct}%</span>
                        </div>
                        <div className="h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all"
                                style={{
                                    width: `${upPct}%`,
                                    background: upPct >= 50
                                        ? `linear-gradient(90deg, #2a2a2a 0%, #22c55e ${upPct}%)`
                                        : `linear-gradient(90deg, #ef4444 0%, #2a2a2a ${upPct}%)`,
                                }}
                            />
                        </div>
                        {/* Feature importances */}
                        <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1">
                            {topFeatures.map((f) => (
                                <div key={f.feature} className="flex items-center gap-1.5">
                                    <div className="h-1 rounded-full bg-white/20" style={{ width: `${Math.round(f.importance * 100)}%`, minWidth: 4, maxWidth: 40 }} />
                                    <span className="text-[10px] text-gray-500 truncate">{f.label}</span>
                                    <span className="text-[10px] text-gray-600 ml-auto shrink-0">{Math.round(f.importance * 100)}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <p className="text-[10px] text-gray-700 mt-3">
                Directional signal only — not financial advice. Past patterns do not guarantee future results.
            </p>
        </div>
    );
}
