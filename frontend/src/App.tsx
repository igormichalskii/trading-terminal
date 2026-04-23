import { useState, useEffect, useCallback } from "react";
import type { OverlayData } from "./components/PriceChart";
import TopBar from "./components/TopBar";
import WatchlistSidebar from "./components/WatchlistSidebar";
import ChartPanel from "./components/ChartPanel";
import OrderBook from "./components/OrderBook";
import IndicatorsPanel from "./components/IndicatorsPanel";
import type { SubPanel } from "./components/IndicatorsPanel";
import StatusBar from "./components/StatusBar";
import AuthModal from "./components/AuthModal";
import AIAssistant from "./components/AIAssistant";
import EarningsCalendar from "./components/EarningsCalendar";
import PortfolioOptimizer from "./components/PortfolioOptimizer";
import { apiFetch } from "./lib/api";
import { useAuthStore } from "./store/authStore";
import "./terminal.css";

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
        bb?: {
            upper: { time: string | number; value: number }[];
            middle: { time: string | number; value: number }[];
            lower: { time: string | number; value: number }[];
        };
        vwap?: { time: string | number; value: number }[];
        ichimoku?: {
            tenkan:   { time: string | number; value: number }[];
            kijun:    { time: string | number; value: number }[];
            senkou_a: { time: string | number; value: number }[];
            senkou_b: { time: string | number; value: number }[];
            chikou:   { time: string | number; value: number }[];
        };
        rsi?:  { time: string | number; value: number }[];
        macd?: {
            macd:      { time: string | number; value: number }[];
            signal:    { time: string | number; value: number }[];
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

function buildSubPanels(indicators: IndicatorResponse["indicators"]): SubPanel[] {
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
    return panels;
}

export default function App() {
    const { user, loading: authLoading, init, signOut } = useAuthStore();
    const [showAuth, setShowAuth]         = useState(false);
    const [symbol, setSymbol]             = useState("AAPL");
    const [timeframe, setTimeframe]       = useState("1M");
    const [stats, setStats]               = useState<Candle | null>(null);
    const [candles, setCandles]           = useState<Candle[]>([]);
    const [activeIndicators, setActiveIndicators] = useState<Set<string>>(new Set());
    const [overlays, setOverlays]         = useState<OverlayData>({});
    const [subPanels, setSubPanels]       = useState<SubPanel[]>([]);
    const [page, setPage]                 = useState<"chart" | "earnings" | "portfolio">("chart");

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
                if (indicators.bb)       newOverlays.bb  = indicators.bb;
                if (indicators.vwap)     newOverlays.vwap = indicators.vwap;
                if (indicators.ichimoku) newOverlays.ichimoku = indicators.ichimoku;
                setOverlays(newOverlays);
                setSubPanels(buildSubPanels(indicators));
            })
            .catch((err) => { if (err.name !== "AbortError") console.error(err); });
        return () => controller.abort();
    }, [symbol, timeframe, activeIndicators]);

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

            {/* Full-page views (earnings / portfolio) */}
            {page !== "chart" ? (
                <div className="t-fullpage">
                    {page === "earnings" && (
                        <EarningsCalendar
                            watchlistSymbols={[]}
                            activeSymbol={symbol}
                            isLoggedIn={!!user}
                        />
                    )}
                    {page === "portfolio" && (
                        <PortfolioOptimizer
                            watchlistSymbols={[]}
                            isLoggedIn={!!user}
                        />
                    )}
                </div>
            ) : (
                /* ── Terminal grid ── */
                <div className="t-main-grid">
                    {/* Left: watchlist (spans both rows) */}
                    <WatchlistSidebar
                        user={user}
                        activeSymbol={symbol}
                        onSelect={setSymbol}
                    />

                    {/* Center top: chart */}
                    <ChartPanel
                        symbol={symbol}
                        overlays={overlays}
                        activeIndicators={activeIndicators}
                        onToggleIndicator={toggleIndicator}
                        limitParam={limitParam}
                        onStatsChange={setStats}
                        onCandlesChange={setCandles}
                        onTimeframeChange={setTimeframe}
                        stats={stats}
                        candles={candles}
                    />

                    {/* Right top: order book — hidden (requires paid data feed) */}
                    {/* <OrderBook lastPrice={stats?.close ?? null} /> */}

                    {/* Bottom center+right: indicators panel */}
                    <IndicatorsPanel
                        subPanels={subPanels}
                        symbol={symbol}
                        timeframe={timeframe}
                        lastClose={stats?.close ?? null}
                    />
                </div>
            )}

            <StatusBar onAskAI={() => { /* AIAssistant has its own toggle — clicking opens it */ }} />

            {/* Floating AI assistant (has its own open/close button) */}
            <AIAssistant
                context={{
                    symbol,
                    timeframe,
                    stats,
                    candles,
                    activeIndicators: Array.from(activeIndicators),
                }}
            />

            {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
        </div>
    );
}
