import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import type { OverlayData } from "./components/PriceChart";
import TopBar from "./components/TopBar";
import ChartPanel from "./components/ChartPanel";
import StatusBar from "./components/StatusBar";
import AuthModal from "./components/AuthModal";
import MobileGate from "./components/MobileGate";
import AIAssistant from "./components/AIAssistant";
import EarningsCalendar from "./components/EarningsCalendar";
import PortfolioOptimizer from "./components/PortfolioOptimizer";
import RightSidebar from "./components/RightSidebar";
import RightPanel from "./components/RightPanel";
import { apiFetch } from "./lib/api";
import { useAuthStore } from "./store/authStore";
import IndicatorSubChart from "./components/IndicatorSubChart";
import "./terminal.css";
import IndicatorsLibrary from "./components/IndicatorsLibrary";

interface Candle {
    time: string | number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

interface IndicatorResponse {
    indicators: {
        sma?: { time: string | number; value: number }[];
        ema?: { time: string | number; value: number }[];
        wma?: { time: string | number; value: number }[];
        dema?: { time: string | number; value: number }[];
        tema?: { time: string | number; value: number }[];
        bb?: {
            upper: { time: string | number; value: number }[];
            middle: { time: string | number; value: number }[];
            lower: { time: string | number; value: number }[];
        };
        kc?: {
            upper: { time: string | number; value: number }[];
            middle: { time: string | number; value: number }[];
            lower: { time: string | number; value: number }[];
        };
        dc?: {
            upper: { time: string | number; value: number }[];
            middle: { time: string | number; value: number }[];
            lower: { time: string | number; value: number }[];
        }
        vwap?: { time: string | number; value: number }[];
        ichimoku?: {
            tenkan: { time: string | number; value: number }[];
            kijun: { time: string | number; value: number }[];
            senkou_a: { time: string | number; value: number }[];
            senkou_b: { time: string | number; value: number }[];
            chikou: { time: string | number; value: number }[];
        };
        rsi?: { time: string | number; value: number }[];
        macd?: {
            macd: { time: string | number; value: number }[];
            signal: { time: string | number; value: number }[];
            histogram: { time: string | number; value: number }[];
        };
        stoch?: {
            k: { time: string | number; value: number }[];
            d: { time: string | number; value: number }[];
        };
        atr?: { time: string | number; value: number }[];
        obv?: { time: string | number; value: number }[];
    };
}

function buildSubSeries(id: string, ind: any) {
    if (id === "rsi" && ind.rsi) return [{ data: ind.rsi, color: "#f59e0b" }];
    if (id === "macd" && ind.macd) return [
        { data: ind.macd.macd, color: "#3b82f6" },
        { data: ind.macd.signal, color: "#f59e0b" },
        { data: ind.macd.histogram, color: "#22c55e", type: "histogram" as const },
    ];
    if (id === "stoch" && ind.stoch) return [
        { data: ind.stoch.k, color: "#3b82f6" },
        { data: ind.stoch.d, color: "#f59e0b" },
    ];
    if (id === "atr" && ind.atr) return [{ data: ind.atr, color: "#a855f7" }];
    if (id === "obv" && ind.obv) return [{ data: ind.obv, color: "#06b6d4" }];
    return [];
}

function buildRefLines(id: string) {
    if (id === "rsi") return [{ value: 70, color: "#ef444466" }, { value: 30, color: "#22c55e66" }];
    if (id === "stoch") return [{ value: 80, color: "#ef444466" }, { value: 20, color: "#22c55e66" }];
    return undefined;
}


export default function App() {
    const { user, loading: authLoading, init, signOut } = useAuthStore();
    const [showAuth, setShowAuth] = useState(false);
    const [symbol, setSymbol] = useState(() => localStorage.getItem("symbol") ?? "AAPL");
    const [timeframe, setTimeframe] = useState(() => localStorage.getItem("timeframe") ?? "1M");
    const [stats, setStats] = useState<Candle | null>(null);
    const [candles, setCandles] = useState<Candle[]>([]);
    const [activeIndicators, setActiveIndicators] = useState<Set<string>>(() => {
        const saved = localStorage.getItem("indicators");
        return saved ? new Set(JSON.parse(saved)) : new Set();
    });
    const [pinnedIndicators, setPinnedIndicators] = useState<Set<string>>(() => {
        const saved = localStorage.getItem("pinnedInd");
        return saved ? new Set(JSON.parse(saved)) : new Set();
    })
    const [activeSubCharts, setActiveSubCharts] = useState<Set<string>>(() => {
        const saved = localStorage.getItem("subCharts");
        return saved ? new Set(JSON.parse(saved)) : new Set();
    });
    const [rightPanel, setRightPanel] = useState<string | null>(null);
    const [overlays, setOverlays] = useState<OverlayData>({});
    const [page, setPage] = useState<"chart" | "earnings" | "portfolio">("chart");
    const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>([]);
    const [showAI, setShowAI] = useState(false);
    const [subChartData, setSubChartData] = useState<any>({});
    const [showLibrary, setShowLibrary] = useState<boolean>(false);

    const isNarrow = useSyncExternalStore(
        (cb) => { window.addEventListener("resize", cb); return () => window.removeEventListener("resize", cb); },
        () => window.innerWidth < 768,
    );


    useEffect(() => { init(); }, []);
    useEffect(() => {
        setOverlays({});
    }, [symbol, timeframe]);
    useEffect(() => { localStorage.setItem("symbol", symbol); }, [symbol]);
    useEffect(() => { localStorage.setItem("timeframe", timeframe); }, [timeframe]);
    useEffect(() => {
        localStorage.setItem("indicators", JSON.stringify(Array.from(activeIndicators)));
    }, [activeIndicators]);
    useEffect(() => {
        localStorage.setItem("pinnedInd", JSON.stringify(Array.from(pinnedIndicators)));
    }, [pinnedIndicators]);
    useEffect(() => {
        localStorage.setItem("subCharts", JSON.stringify(Array.from(activeSubCharts)));
    }, [activeSubCharts]);

    const toggleIndicator = useCallback((id: string) => {
        setActiveIndicators((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }, []);

    const onPin = useCallback((id: string) => {
        setPinnedIndicators((prev) => {
            const next = new Set(prev);
            next.add(id);
            return next;
        });
    }, []);

    const onUnpin = useCallback((id: string) => {
        setPinnedIndicators((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        })
    }, []);

    const toggleRightPanel = useCallback((panel: string) => {
        setRightPanel((prev) => prev === panel ? null : panel);
    }, []);

    const toggleSubChart = useCallback((id: string) => {
        setActiveSubCharts((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }, []);

    useEffect(() => {
        if (activeIndicators.size === 0) { setOverlays({}); return; }
        const controller = new AbortController();
        const query = Array.from(activeIndicators).join(",");
        const afterParam = candles.length > 0 ? `&after=${encodeURIComponent(candles[0].time)}` : "";
        apiFetch<IndicatorResponse>(
            `/indicators/${symbol}?timeframe=${timeframe}&indicators=${query}${afterParam}`,
            { signal: controller.signal },
        )
            .then(({ indicators }) => {
                const newOverlays: OverlayData = {};
                if (indicators.sma) newOverlays.sma = indicators.sma;
                if (indicators.ema) newOverlays.ema = indicators.ema;
                if (indicators.wma) newOverlays.wma = indicators.wma;
                if (indicators.dema) newOverlays.dema = indicators.dema;
                if (indicators.tema) newOverlays.tema = indicators.tema;
                if (indicators.bb) newOverlays.bb = indicators.bb;
                if (indicators.kc) newOverlays.kc = indicators.kc;
                if (indicators.dc) newOverlays.dc = indicators.dc;
                if (indicators.vwap) newOverlays.vwap = indicators.vwap;
                if (indicators.ichimoku) newOverlays.ichimoku = indicators.ichimoku;
                setOverlays(newOverlays);
            })
            .catch((err) => { if (err.name !== "AbortError") console.error(err); });
        return () => controller.abort();
    }, [symbol, timeframe, activeIndicators, candles[0]?.time]);

    if (isNarrow) return <MobileGate />;

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100vh", width: "100vw", overflow: "hidden" }}>
            <TopBar
                symbol={symbol}
                onSymbolChange={setSymbol}
                page={page}
                onPageChange={setPage}
                user={user}
                authLoading={authLoading}
                onSignIn={() => setShowAuth(true)}
                onSignOut={signOut}
            />

            {/* Terminal grid — always mounted so chart never reloads on page switch */}
            <div
                className="t-main-grid"
                style={{
                    display: page === "chart" ? undefined : "none",
                    "--right-panel-width": rightPanel ? "320px" : "0px",
                } as React.CSSProperties}
            >

                {/* Center top: chart */}
                <div style={{ display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden", flex: 1 }}>
                    <ChartPanel
                        symbol={symbol}
                        timeframe={timeframe}
                        overlays={overlays}
                        activeIndicators={activeIndicators}
                        onToggleIndicator={toggleIndicator}
                        onStatsChange={setStats}
                        onCandlesChange={setCandles}
                        onTimeframeChange={setTimeframe}
                        onOpenLibrary={() => setShowLibrary(true)}
                        stats={stats}
                        candles={candles}
                    />

                    {activeSubCharts.size > 0 && (
                        <div style={{ overflowY: "auto", flexShrink: 0, maxHeight: "45%" }}>
                            {Array.from(activeSubCharts).map((id) => (
                                <IndicatorSubChart
                                    key={id}
                                    label={id.toUpperCase()}
                                    series={buildSubSeries(id, subChartData)}
                                    refLines={buildRefLines(id)}
                                />
                            ))}
                        </div>
                    )}
                </div>


                {/* Right top: order book — hidden (requires paid data feed) */}
                {/* <OrderBook lastPrice={stats?.close ?? null} /> */}

                {/* Bottom center+right: indicators panel */}
                <RightPanel
                    user={user}
                    symbol={symbol}
                    timeframe={timeframe}
                    lastClose={stats?.close ?? null}
                    activePanel={rightPanel}
                    pinnedIndicators={pinnedIndicators}
                    onSelect={setSymbol}
                    onSymbolsChange={setWatchlistSymbols}
                />
                <RightSidebar activePanel={rightPanel} onToggle={toggleRightPanel} />
            </div>

            {/* Full-page views — always mounted so state survives page switches */}
            <div className="t-fullpage" style={{ display: page !== "chart" ? undefined : "none" }}>
                <div style={{ display: page === "earnings" ? undefined : "none" }}>
                    <EarningsCalendar
                        watchlistSymbols={watchlistSymbols}
                        activeSymbol={symbol}
                        isLoggedIn={!!user}
                    />
                </div>
                <div style={{ display: page === "portfolio" ? undefined : "none" }}>
                    <PortfolioOptimizer
                        watchlistSymbols={watchlistSymbols}
                        isLoggedIn={!!user}
                    />
                </div>
            </div>

            <StatusBar onAskAI={() => setShowAI(true)} />

            {/* Floating AI assistant (has its own open/close button) */}
            <AIAssistant
                open={showAI}
                onClose={() => setShowAI(false)}
                context={{
                    symbol,
                    timeframe,
                    stats,
                    candles,
                    activeIndicators: Array.from(activeIndicators),
                }}
            />

            {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
            <IndicatorsLibrary 
                user={user}
                pinnedIndicators={pinnedIndicators}
                isOpen={showLibrary}
                onPin={onPin}
                onUnpin={onUnpin}
                onClose={() => setShowLibrary(false)}
            />
        </div>
    );
}
