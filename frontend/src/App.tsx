import { useState, useEffect, useCallback } from "react";
import PriceChart from "./components/PriceChart";
import type { OverlayData } from "./components/PriceChart";
import IndicatorToggle from "./components/IndicatorToggle";
import IndicatorSubChart from "./components/IndicatorSubChart";
import type { SubChartSeries } from "./components/IndicatorSubChart";
import AuthModal from "./components/AuthModal";
import WatchlistPanel from "./components/WatchlistPanel";
import PriceAlertPanel from "./components/PriceAlertPanel";
import AIAssistant from "./components/AIAssistant";
import NewsFeed from "./components/NewsFeed";
import EarningsCalendar from "./components/EarningsCalendar";
import PortfolioOptimizer from "./components/PortfolioOptimizer";
import MLPrediction from "./components/MLPrediction";
import { apiFetch } from "./lib/api";
import { useAuthStore } from "./store/authStore";

interface Stats {
    time: string | number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

interface Point { time: string | number; value: number; }

interface IndicatorResponse {
    indicators: {
        sma?: Point[];
        ema?: Point[];
        bb?: { upper: Point[]; middle: Point[]; lower: Point[] };
        vwap?: Point[];
        ichimoku?: { tenkan: Point[]; kijun: Point[]; senkou_a: Point[]; senkou_b: Point[]; chikou: Point[] };
        rsi?: Point[];
        macd?: { macd: Point[]; signal: Point[]; histogram: Point[] };
        stoch?: { k: Point[]; d: Point[] };
        atr?: Point[];
        obv?: Point[];
    };
}

interface SubPanel {
    id: string;
    label: string;
    series: SubChartSeries[];
    refLines?: { value: number; color: string }[];
}

function buildSubPanels(indicators: IndicatorResponse["indicators"]): SubPanel[] {
    const panels: SubPanel[] = [];
    if (indicators.rsi) panels.push({ id: "rsi", label: "RSI (14)", series: [{ data: indicators.rsi, color: "#f59e0b" }], refLines: [{ value: 70, color: "#ef444466" }, { value: 30, color: "#22c55e66" }] });
    if (indicators.macd) panels.push({ id: "macd", label: "MACD (12, 26, 9)", series: [{ data: indicators.macd.macd, color: "#3b82f6" }, { data: indicators.macd.signal, color: "#f59e0b" }, { data: indicators.macd.histogram, color: "#22c55e", type: "histogram" }] });
    if (indicators.stoch) panels.push({ id: "stoch", label: "Stochastic (14, 3)", series: [{ data: indicators.stoch.k, color: "#3b82f6" }, { data: indicators.stoch.d, color: "#f59e0b" }], refLines: [{ value: 80, color: "#ef444466" }, { value: 20, color: "#22c55e66" }] });
    if (indicators.atr) panels.push({ id: "atr", label: "ATR (14)", series: [{ data: indicators.atr, color: "#a855f7" }] });
    if (indicators.obv) panels.push({ id: "obv", label: "OBV", series: [{ data: indicators.obv, color: "#06b6d4" }] });
    return panels;
}

export default function App() {
    const { user, loading: authLoading, init, signOut } = useAuthStore();
    const [showAuth, setShowAuth] = useState(false);
    const [symbol, setSymbol] = useState("AAPL");
    const [input, setInput] = useState("AAPL");
    const [timeframe, setTimeframe] = useState("1M");
    const [stats, setStats] = useState<Stats | null>(null);
    const [activeIndicators, setActiveIndicators] = useState<Set<string>>(new Set());
    const [overlays, setOverlays] = useState<OverlayData>({});
    const [subPanels, setSubPanels] = useState<SubPanel[]>([]);
    const [currentCandles, setCurrentCandles] = useState<{ time: string | number; open: number; high: number; low: number; close: number; volume: number }[]>([]);
    const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>([]);
    const [page, setPage] = useState<"chart" | "earnings" | "portfolio">("chart");

    useEffect(() => { init(); }, []);

    const toggleIndicator = useCallback((id: string) => {
        setActiveIndicators((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }, []);

    const limitParam = user ? "" : "&limit=250";

    useEffect(() => {
        if (activeIndicators.size === 0) { setOverlays({}); setSubPanels([]); return; }

        const controller = new AbortController();
        const query = Array.from(activeIndicators).join(",");

        apiFetch<IndicatorResponse>(
            `/indicators/${symbol}?timeframe=${timeframe}&indicators=${query}${limitParam}`,
            { signal: controller.signal },
        )
            .then(({ indicators }) => {
                const newOverlays: OverlayData = {};
                if (indicators.sma)      newOverlays.sma = indicators.sma;
                if (indicators.ema)      newOverlays.ema = indicators.ema;
                if (indicators.bb)       newOverlays.bb = indicators.bb;
                if (indicators.vwap)     newOverlays.vwap = indicators.vwap;
                if (indicators.ichimoku) newOverlays.ichimoku = indicators.ichimoku;
                setOverlays(newOverlays);
                setSubPanels(buildSubPanels(indicators));
            })
            .catch((err) => { if (err.name !== "AbortError") console.error(err); });

        return () => controller.abort();
    }, [symbol, timeframe, activeIndicators]);

    return (
        <div className="min-h-screen bg-[#0f0f0f] text-white">
            {/* Top bar */}
            <header className="flex items-center gap-3 px-6 py-3 border-b border-[#2a2a2a]">
                <span className="text-sm font-semibold tracking-wide text-gray-200 mr-2">Trading Terminal</span>
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && setSymbol(input)}
                    placeholder="Symbol"
                    className="bg-[#1a1a1a] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm w-32 focus:outline-none focus:border-gray-500"
                />
                <button
                    onClick={() => setSymbol(input)}
                    className="bg-white text-black text-sm px-3 py-1.5 rounded hover:bg-gray-200 transition-colors cursor-pointer"
                >
                    Load
                </button>
                <span className="text-base font-semibold">{symbol}</span>

                {/* Page nav */}
                <div className="flex gap-1 ml-4">
                    {(["chart", "earnings", "portfolio"] as const).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPage(p)}
                            className={`px-3 py-1.5 text-xs rounded capitalize cursor-pointer transition-colors ${
                                page === p ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"
                            }`}
                        >
                            {p === "earnings" ? "Earnings" : p === "portfolio" ? "Portfolio" : "Chart"}
                        </button>
                    ))}
                </div>

                <div className="ml-auto">
                    {authLoading ? null : user ? (
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-500 hidden sm:block">{user.email}</span>
                            <button
                                onClick={signOut}
                                className="text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
                            >
                                Sign out
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowAuth(true)}
                            className="text-sm px-3 py-1.5 border border-[#2a2a2a] rounded hover:border-gray-500 transition-colors cursor-pointer"
                        >
                            Sign in
                        </button>
                    )}
                </div>
            </header>

            <div className="flex gap-4 p-4 lg:p-6">
                {/* Watchlist sidebar */}
                {user && (
                    <aside className="hidden md:block">
                        <WatchlistPanel
                            user={user}
                            activeSymbol={symbol}
                            onSelect={(s) => { setSymbol(s); setInput(s); }}
                            onSymbolsChange={setWatchlistSymbols}
                        />
                    </aside>
                )}

                {/* Main content */}
                <main className="flex-1 min-w-0">
                    {page === "chart" ? (
                        <>
                            <IndicatorToggle active={activeIndicators} onToggle={toggleIndicator} />

                            <PriceChart
                                symbol={symbol}
                                timeframe={timeframe}
                                overlays={overlays}
                                limitParam={limitParam}
                                onTimeframeChange={setTimeframe}
                                onStatsChange={setStats}
                                onCandlesChange={setCurrentCandles}
                            />

                            {stats && (
                                <div className="grid grid-cols-5 gap-2 mt-3">
                                    {[
                                        { label: "Open",   value: stats.open.toFixed(2) },
                                        { label: "High",   value: stats.high.toFixed(2) },
                                        { label: "Low",    value: stats.low.toFixed(2) },
                                        { label: "Close",  value: stats.close.toFixed(2) },
                                        { label: "Volume", value: Number(stats.volume).toLocaleString() },
                                    ].map(({ label, value }) => (
                                        <div key={label} className="bg-[#1a1a1a] rounded p-3">
                                            <div className="text-xs text-gray-500 mb-1">{label}</div>
                                            <div className="text-sm font-medium">{value}</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {subPanels.map((panel) => (
                                <IndicatorSubChart
                                    key={panel.id}
                                    label={panel.label}
                                    series={panel.series}
                                    refLines={panel.refLines}
                                />
                            ))}

                            <MLPrediction symbol={symbol} />

                            <NewsFeed symbol={symbol} />
                        </>
                    ) : page === "earnings" ? (
                        <EarningsCalendar
                            watchlistSymbols={watchlistSymbols}
                            activeSymbol={symbol}
                            isLoggedIn={!!user}
                        />
                    ) : (
                        <PortfolioOptimizer
                            watchlistSymbols={watchlistSymbols}
                            isLoggedIn={!!user}
                        />
                    )}
                </main>

                {/* Alerts sidebar */}
                {user && (
                    <aside className="hidden lg:block w-64 shrink-0">
                        <PriceAlertPanel user={user} />
                    </aside>
                )}
            </div>

            <AIAssistant
                context={{
                    symbol,
                    timeframe,
                    stats,
                    candles: currentCandles,
                    activeIndicators: Array.from(activeIndicators),
                }}
            />

            {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
        </div>
    );
}