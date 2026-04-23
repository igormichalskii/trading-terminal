import { useState, useEffect } from "react";
import { apiFetch } from "../lib/api";

interface FrontierPoint { vol: number; ret: number; sharpe: number }

interface PortfolioAllocation {
    weights: Record<string, number>;
    expected_return: number;
    volatility: number;
    sharpe: number;
}

interface OptimizeResult {
    symbols: string[];
    frontier: FrontierPoint[];
    max_sharpe: PortfolioAllocation;
    min_vol: PortfolioAllocation;
    equal_weight: PortfolioAllocation;
}

interface Props {
    watchlistSymbols: string[];
    isLoggedIn: boolean;
}

const mono: React.CSSProperties = { fontFamily: "var(--font-mono)" };

function lerpColor(a: [number, number, number], b: [number, number, number], t: number): string {
    return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`;
}

function sharpeColor(sharpe: number, minS: number, maxS: number): string {
    const t = maxS > minS ? Math.max(0, Math.min(1, (sharpe - minS) / (maxS - minS))) : 0.5;
    return t < 0.5
        ? lerpColor([42, 42, 42], [59, 130, 246], t * 2)       // border → accent
        : lerpColor([59, 130, 246], [0, 214, 143], (t - 0.5) * 2); // accent → up
}

function EfficientFrontier({ frontier, maxSharpe, minVol }: {
    frontier: FrontierPoint[];
    maxSharpe: PortfolioAllocation;
    minVol: PortfolioAllocation;
}) {
    if (frontier.length === 0) return null;

    const W = 500, H = 260;
    const PAD = { l: 48, r: 24, t: 16, b: 36 };
    const iW = W - PAD.l - PAD.r;
    const iH = H - PAD.t - PAD.b;

    const vols   = frontier.map(p => p.vol);
    const rets   = frontier.map(p => p.ret);
    const sharpes = frontier.map(p => p.sharpe);

    const minV = Math.min(...vols),  maxV = Math.max(...vols);
    const minR = Math.min(...rets),  maxR = Math.max(...rets);
    const minS = Math.min(...sharpes), maxS = Math.max(...sharpes);

    const toX = (v: number) => PAD.l + ((v - minV) / (maxV - minV || 1)) * iW;
    const toY = (r: number) => H - PAD.b - ((r - minR) / (maxR - minR || 1)) * iH;

    const xTicks = [minV, (minV + maxV) / 2, maxV];
    const yTicks = [minR, (minR + maxR) / 2, maxR];

    return (
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxHeight: 260 }}>
            {yTicks.map((r, i) => (
                <g key={i}>
                    <line x1={PAD.l} x2={W - PAD.r} y1={toY(r)} y2={toY(r)} stroke="#1f1f1f" strokeWidth="1" />
                    <text x={PAD.l - 5} y={toY(r) + 3.5} textAnchor="end" fill="#5a5a5a" fontSize="9" fontFamily="var(--font-mono)">
                        {(r * 100).toFixed(0)}%
                    </text>
                </g>
            ))}
            {xTicks.map((v, i) => (
                <g key={i}>
                    <line x1={toX(v)} x2={toX(v)} y1={PAD.t} y2={H - PAD.b} stroke="#1f1f1f" strokeWidth="1" />
                    <text x={toX(v)} y={H - PAD.b + 12} textAnchor="middle" fill="#5a5a5a" fontSize="9" fontFamily="var(--font-mono)">
                        {(v * 100).toFixed(0)}%
                    </text>
                </g>
            ))}

            <text x={W / 2} y={H - 1} textAnchor="middle" fill="#5a5a5a" fontSize="8" fontFamily="var(--font-mono)">VOLATILITY (ANNUALIZED)</text>
            <text x={9} y={H / 2} textAnchor="middle" fill="#5a5a5a" fontSize="8" fontFamily="var(--font-mono)" transform={`rotate(-90, 9, ${H / 2})`}>RETURN</text>

            {frontier.map((p, i) => (
                <circle key={i} cx={toX(p.vol)} cy={toY(p.ret)} r={2.5} fill={sharpeColor(p.sharpe, minS, maxS)} opacity={0.8} />
            ))}

            <circle cx={toX(minVol.volatility)} cy={toY(minVol.expected_return)} r={5} fill="#3b82f6" stroke="#0a0a0a" strokeWidth="1.5" />
            <text x={toX(minVol.volatility) + 8} y={toY(minVol.expected_return) + 3.5} fill="#3b82f6" fontSize="9" fontFamily="var(--font-mono)">MIN VOL</text>

            <circle cx={toX(maxSharpe.volatility)} cy={toY(maxSharpe.expected_return)} r={5} fill="#00d68f" stroke="#0a0a0a" strokeWidth="1.5" />
            <text x={toX(maxSharpe.volatility) + 8} y={toY(maxSharpe.expected_return) + 3.5} fill="#00d68f" fontSize="9" fontFamily="var(--font-mono)">MAX SHARPE</text>
        </svg>
    );
}

function WeightBar({ symbol, weight }: { symbol: string; weight: number }) {
    return (
        <div style={{ display: "grid", gridTemplateColumns: "64px 1fr 40px", gap: 8, alignItems: "center" }}>
            <span style={{ ...mono, fontSize: 11, color: "var(--text)", fontWeight: 600 }}>{symbol}</span>
            <div style={{ height: 3, background: "var(--border)", position: "relative" }}>
                <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: `${weight * 100}%`, background: "var(--accent)" }} />
            </div>
            <span style={{ ...mono, fontSize: 10, color: "var(--text-dim)", textAlign: "right" }}>
                {(weight * 100).toFixed(1)}%
            </span>
        </div>
    );
}

function PortfolioCard({ title, portfolio, accentColor }: {
    title: string;
    portfolio: PortfolioAllocation;
    accentColor: string;
}) {
    const sorted = Object.entries(portfolio.weights).sort((a, b) => b[1] - a[1]);
    const retColor = portfolio.expected_return >= 0 ? "var(--up)" : "var(--down)";

    return (
        <div style={{ border: "1px solid var(--border)" }}>
            {/* Card header */}
            <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 14px",
                borderBottom: "1px solid var(--border)",
            }}>
                <span style={{ ...mono, fontSize: 11, fontWeight: 700, color: accentColor, letterSpacing: "0.06em" }}>
                    {title}
                </span>
                <span style={{ ...mono, fontSize: 10, color: "var(--text-muted)" }}>
                    SHARPE {portfolio.sharpe.toFixed(2)}
                </span>
            </div>

            {/* Stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1, background: "var(--border)", borderBottom: "1px solid var(--border)" }}>
                {[
                    { label: "RETURN",     value: `${portfolio.expected_return >= 0 ? "+" : ""}${(portfolio.expected_return * 100).toFixed(1)}%`, color: retColor },
                    { label: "VOLATILITY", value: `${(portfolio.volatility * 100).toFixed(1)}%`,                                                   color: "var(--text)" },
                    { label: "SHARPE",     value: portfolio.sharpe.toFixed(2),                                                                     color: "var(--text)" },
                ].map(({ label, value, color }) => (
                    <div key={label} style={{ background: "var(--panel)", padding: "8px 14px", textAlign: "center" }}>
                        <div style={{ ...mono, fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.1em", marginBottom: 4 }}>{label}</div>
                        <div style={{ ...mono, fontSize: 14, fontWeight: 600, color }}>{value}</div>
                    </div>
                ))}
            </div>

            {/* Weight bars */}
            <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                {sorted.filter(([, w]) => w >= 0.005).map(([sym, w]) => (
                    <WeightBar key={sym} symbol={sym} weight={w} />
                ))}
            </div>
        </div>
    );
}

export default function PortfolioOptimizer({ watchlistSymbols, isLoggedIn }: Props) {
    const [selected, setSelected] = useState<Set<string>>(new Set(watchlistSymbols));
    const [result,   setResult]   = useState<OptimizeResult | null>(null);
    const [loading,  setLoading]  = useState(false);
    const [error,    setError]    = useState<string | null>(null);

    useEffect(() => {
        setSelected(prev => {
            const next = new Set(prev);
            watchlistSymbols.forEach(s => next.add(s));
            return next;
        });
    }, [watchlistSymbols.join(",")]);

    const toggle = (sym: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(sym) ? next.delete(sym) : next.add(sym);
            return next;
        });
    };

    const run = async () => {
        const symbols = [...selected];
        if (symbols.length < 2) { setError("SELECT AT LEAST 2 SYMBOLS TO OPTIMIZE"); return; }
        setLoading(true);
        setError(null);
        try {
            const data = await apiFetch<OptimizeResult>("/portfolio/optimize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ symbols, period_days: 365 }),
            });
            setResult(data);
        } catch (e: any) {
            setError((e.message || "Optimization failed").toUpperCase());
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Page header */}
            <div>
                <div style={{ ...mono, fontSize: 16, fontWeight: 700, color: "var(--text)", letterSpacing: "0.04em" }}>
                    PORTFOLIO OPTIMIZER
                </div>
                <div style={{ ...mono, fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.08em", marginTop: 4 }}>
                    MODERN PORTFOLIO THEORY · 1-YEAR DAILY RETURNS · 2,000 MONTE CARLO SIMULATIONS
                </div>
            </div>

            {watchlistSymbols.length === 0 ? (
                <div style={{ border: "1px solid var(--border)", padding: "40px 24px", textAlign: "center" }}>
                    <p style={{ ...mono, fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.06em" }}>
                        {isLoggedIn
                            ? "ADD SYMBOLS TO YOUR WATCHLIST TO OPTIMIZE A PORTFOLIO."
                            : "SIGN IN AND ADD SYMBOLS TO YOUR WATCHLIST TO USE THE OPTIMIZER."}
                    </p>
                </div>
            ) : (
                <div style={{ border: "1px solid var(--border)" }}>
                    {/* Symbol selector */}
                    <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)" }}>
                        <div style={{ ...mono, fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.1em", marginBottom: 10 }}>
                            SELECT SYMBOLS
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {watchlistSymbols.map(sym => (
                                <button
                                    key={sym}
                                    onClick={() => toggle(sym)}
                                    style={{
                                        ...mono,
                                        fontSize: 10,
                                        letterSpacing: "0.06em",
                                        padding: "4px 10px",
                                        cursor: "pointer",
                                        border: `1px solid ${selected.has(sym) ? "var(--accent)" : "var(--border-bright)"}`,
                                        color: selected.has(sym) ? "var(--accent)" : "var(--text-muted)",
                                        background: selected.has(sym) ? "var(--accent-dim)" : "transparent",
                                        transition: "all 0.15s",
                                    }}
                                >
                                    {sym}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Run button */}
                    <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                        <button
                            onClick={run}
                            disabled={loading || selected.size < 2}
                            style={{
                                ...mono,
                                fontSize: 10,
                                letterSpacing: "0.1em",
                                padding: "6px 16px",
                                cursor: loading || selected.size < 2 ? "not-allowed" : "pointer",
                                border: "1px solid var(--accent)",
                                color: "var(--bg)",
                                background: loading || selected.size < 2 ? "var(--text-muted)" : "var(--accent)",
                                opacity: loading || selected.size < 2 ? 0.5 : 1,
                                transition: "all 0.15s",
                            }}
                        >
                            {loading ? "OPTIMIZING…" : "RUN OPTIMIZATION"}
                        </button>
                        {selected.size < 2 && (
                            <span style={{ ...mono, fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.05em" }}>
                                SELECT AT LEAST 2 SYMBOLS
                            </span>
                        )}
                        {error && (
                            <span style={{ ...mono, fontSize: 10, color: "var(--down)", letterSpacing: "0.05em" }}>{error}</span>
                        )}
                    </div>
                </div>
            )}

            {loading && (
                <div style={{ ...mono, padding: "40px 0", textAlign: "center", fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.1em" }}>
                    RUNNING MODEL…
                </div>
            )}

            {!loading && result && (
                <>
                    {/* Efficient Frontier chart */}
                    <div style={{ border: "1px solid var(--border)" }}>
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "8px 14px",
                            borderBottom: "1px solid var(--border)",
                        }}>
                            <span style={{ ...mono, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", color: "var(--text-muted)" }}>
                                EFFICIENT FRONTIER
                            </span>
                            <div style={{ display: "flex", gap: 16 }}>
                                {[
                                    { color: "#00d68f", label: "MAX SHARPE" },
                                    { color: "#3b82f6", label: "MIN VOLATILITY" },
                                ].map(({ color, label }) => (
                                    <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                        <div style={{ width: 6, height: 6, background: color, borderRadius: "50%" }} />
                                        <span style={{ ...mono, fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.06em" }}>{label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div style={{ padding: "12px 14px" }}>
                            <EfficientFrontier
                                frontier={result.frontier}
                                maxSharpe={result.max_sharpe}
                                minVol={result.min_vol}
                            />
                        </div>
                    </div>

                    {/* Portfolio cards */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: "var(--border)" }}>
                        <PortfolioCard title="MAX SHARPE"    portfolio={result.max_sharpe}    accentColor="var(--up)" />
                        <PortfolioCard title="MIN VOLATILITY" portfolio={result.min_vol}      accentColor="var(--accent)" />
                        <PortfolioCard title="EQUAL WEIGHT"  portfolio={result.equal_weight}  accentColor="var(--text-dim)" />
                    </div>
                </>
            )}
        </div>
    );
}
