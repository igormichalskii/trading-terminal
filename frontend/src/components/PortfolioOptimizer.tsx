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

function lerpColor(a: [number, number, number], b: [number, number, number], t: number): string {
    return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`;
}

function sharpeColor(sharpe: number, minS: number, maxS: number): string {
    const t = maxS > minS ? Math.max(0, Math.min(1, (sharpe - minS) / (maxS - minS))) : 0.5;
    return t < 0.5
        ? lerpColor([80, 80, 80], [234, 179, 8], t * 2)
        : lerpColor([234, 179, 8], [34, 197, 94], (t - 0.5) * 2);
}

function EfficientFrontier({ frontier, maxSharpe, minVol }: {
    frontier: FrontierPoint[];
    maxSharpe: PortfolioAllocation;
    minVol: PortfolioAllocation;
}) {
    if (frontier.length === 0) return null;

    const W = 500, H = 280;
    const PAD = { l: 48, r: 24, t: 20, b: 38 };
    const iW = W - PAD.l - PAD.r;
    const iH = H - PAD.t - PAD.b;

    const vols = frontier.map(p => p.vol);
    const rets = frontier.map(p => p.ret);
    const sharpes = frontier.map(p => p.sharpe);

    const minV = Math.min(...vols), maxV = Math.max(...vols);
    const minR = Math.min(...rets), maxR = Math.max(...rets);
    const minS = Math.min(...sharpes), maxS = Math.max(...sharpes);

    const toX = (v: number) => PAD.l + ((v - minV) / (maxV - minV || 1)) * iW;
    const toY = (r: number) => H - PAD.b - ((r - minR) / (maxR - minR || 1)) * iH;

    const xTicks = [minV, (minV + maxV) / 2, maxV];
    const yTicks = [minR, (minR + maxR) / 2, maxR];

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-h-72">
            {yTicks.map((r, i) => (
                <g key={i}>
                    <line x1={PAD.l} x2={W - PAD.r} y1={toY(r)} y2={toY(r)} stroke="#2a2a2a" strokeWidth="1" />
                    <text x={PAD.l - 5} y={toY(r) + 3.5} textAnchor="end" fill="#4b5563" fontSize="9">
                        {(r * 100).toFixed(0)}%
                    </text>
                </g>
            ))}
            {xTicks.map((v, i) => (
                <g key={i}>
                    <line x1={toX(v)} x2={toX(v)} y1={PAD.t} y2={H - PAD.b} stroke="#2a2a2a" strokeWidth="1" />
                    <text x={toX(v)} y={H - PAD.b + 13} textAnchor="middle" fill="#4b5563" fontSize="9">
                        {(v * 100).toFixed(0)}%
                    </text>
                </g>
            ))}
            <text x={W / 2} y={H - 2} textAnchor="middle" fill="#6b7280" fontSize="9">Volatility (annualized)</text>
            <text x={10} y={H / 2} textAnchor="middle" fill="#6b7280" fontSize="9" transform={`rotate(-90, 10, ${H / 2})`}>Return (annualized)</text>

            {frontier.map((p, i) => (
                <circle key={i} cx={toX(p.vol)} cy={toY(p.ret)} r={2} fill={sharpeColor(p.sharpe, minS, maxS)} opacity={0.7} />
            ))}

            <circle cx={toX(minVol.volatility)} cy={toY(minVol.expected_return)} r={6} fill="#3b82f6" stroke="#0f0f0f" strokeWidth="1.5" />
            <text x={toX(minVol.volatility) + 9} y={toY(minVol.expected_return) + 3.5} fill="#60a5fa" fontSize="9">Min Vol</text>

            <circle cx={toX(maxSharpe.volatility)} cy={toY(maxSharpe.expected_return)} r={6} fill="#f59e0b" stroke="#0f0f0f" strokeWidth="1.5" />
            <text x={toX(maxSharpe.volatility) + 9} y={toY(maxSharpe.expected_return) + 3.5} fill="#fbbf24" fontSize="9">Max Sharpe</text>
        </svg>
    );
}

function WeightBar({ symbol, weight }: { symbol: string; weight: number }) {
    return (
        <div className="flex items-center gap-2 text-xs">
            <span className="w-16 shrink-0 text-gray-300 font-medium">{symbol}</span>
            <div className="flex-1 h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                <div className="h-full bg-white/35 rounded-full transition-all" style={{ width: `${weight * 100}%` }} />
            </div>
            <span className="w-10 shrink-0 text-right text-gray-400">{(weight * 100).toFixed(1)}%</span>
        </div>
    );
}

function PortfolioCard({ title, portfolio, accentClass }: {
    title: string;
    portfolio: PortfolioAllocation;
    accentClass: string;
}) {
    const sorted = Object.entries(portfolio.weights).sort((a, b) => b[1] - a[1]);
    return (
        <div className="bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] p-4 space-y-3">
            <div className="flex items-center justify-between">
                <h3 className={`text-sm font-medium ${accentClass}`}>{title}</h3>
                <span className="text-xs text-gray-500">Sharpe {portfolio.sharpe.toFixed(2)}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                    <div className="text-[10px] text-gray-500 mb-0.5">Return</div>
                    <div className={`text-sm font-semibold ${portfolio.expected_return >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {(portfolio.expected_return * 100).toFixed(1)}%
                    </div>
                </div>
                <div>
                    <div className="text-[10px] text-gray-500 mb-0.5">Volatility</div>
                    <div className="text-sm font-semibold text-gray-200">{(portfolio.volatility * 100).toFixed(1)}%</div>
                </div>
                <div>
                    <div className="text-[10px] text-gray-500 mb-0.5">Sharpe</div>
                    <div className="text-sm font-semibold text-gray-200">{portfolio.sharpe.toFixed(2)}</div>
                </div>
            </div>
            <div className="space-y-1.5 pt-2 border-t border-[#2a2a2a]">
                {sorted.filter(([, w]) => w >= 0.005).map(([sym, w]) => (
                    <WeightBar key={sym} symbol={sym} weight={w} />
                ))}
            </div>
        </div>
    );
}

export default function PortfolioOptimizer({ watchlistSymbols, isLoggedIn }: Props) {
    const [selected, setSelected] = useState<Set<string>>(new Set(watchlistSymbols));
    const [result, setResult] = useState<OptimizeResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
        if (symbols.length < 2) { setError("Select at least 2 symbols to optimize"); return; }
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
            setError(e.message || "Optimization failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 min-w-0 space-y-6">
            <div>
                <h1 className="text-lg font-semibold text-gray-100">Portfolio Optimizer</h1>
                <p className="text-xs text-gray-500 mt-0.5">Modern Portfolio Theory · 1-year daily returns · 2 000 Monte Carlo simulations</p>
            </div>

            {watchlistSymbols.length === 0 ? (
                <div className="bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] p-12 text-center">
                    <p className="text-gray-400 text-sm">
                        {isLoggedIn
                            ? "Add symbols to your watchlist to optimize a portfolio."
                            : "Sign in and add symbols to your watchlist to use the optimizer."}
                    </p>
                </div>
            ) : (
                <div className="bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] p-4 space-y-3">
                    <p className="text-xs text-gray-500">Toggle symbols to include in optimization</p>
                    <div className="flex flex-wrap gap-2">
                        {watchlistSymbols.map(sym => (
                            <button
                                key={sym}
                                onClick={() => toggle(sym)}
                                className={`px-3 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
                                    selected.has(sym)
                                        ? "bg-white/15 text-white border border-white/25"
                                        : "bg-transparent text-gray-500 border border-[#2a2a2a] hover:border-gray-600 hover:text-gray-400"
                                }`}
                            >
                                {sym}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={run}
                            disabled={loading || selected.size < 2}
                            className="px-4 py-1.5 text-sm bg-white text-black rounded font-medium cursor-pointer hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? "Optimizing…" : "Run Optimization"}
                        </button>
                        {selected.size < 2 && (
                            <span className="text-xs text-gray-600">Select at least 2 symbols</span>
                        )}
                    </div>
                    {error && <p className="text-xs text-red-400">{error}</p>}
                </div>
            )}

            {loading && (
                <div className="flex justify-center py-16">
                    <div className="w-6 h-6 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
                </div>
            )}

            {!loading && result && (
                <>
                    <div className="bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] overflow-hidden">
                        <div className="px-4 py-3 border-b border-[#2a2a2a] flex items-center justify-between">
                            <h2 className="text-sm font-medium text-gray-200">Efficient Frontier</h2>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                                    Max Sharpe
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                                    Min Volatility
                                </span>
                            </div>
                        </div>
                        <div className="p-4">
                            <EfficientFrontier
                                frontier={result.frontier}
                                maxSharpe={result.max_sharpe}
                                minVol={result.min_vol}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <PortfolioCard title="Max Sharpe" portfolio={result.max_sharpe} accentClass="text-amber-400" />
                        <PortfolioCard title="Min Volatility" portfolio={result.min_vol} accentClass="text-blue-400" />
                        <PortfolioCard title="Equal Weight" portfolio={result.equal_weight} accentClass="text-gray-400" />
                    </div>
                </>
            )}
        </div>
    );
}
