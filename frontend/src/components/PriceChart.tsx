import { useEffect, useRef, useState } from "react";
import { createChart, CandlestickSeries, LineSeries } from "lightweight-charts";
import { apiFetch } from "../lib/api";

interface Candle {
    time: string | number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

interface Point {
    time: string | number;
    value: number;
}

interface OHLCVResponse {
    candles: Candle[];
    has_more: boolean;
}

export interface HoverCandle {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    time: string | number;
}

export interface OverlayData {
    sma?: Point[];
    ema?: Point[];
    bb?: { upper: Point[]; middle: Point[]; lower: Point[] };
    vwap?: Point[];
    ichimoku?: {
        tenkan: Point[];
        kijun: Point[];
        senkou_a: Point[];
        senkou_b: Point[];
        chikou: Point[];
    };
}

interface Props {
    symbol: string;
    timeframe: string;
    chartType: "CANDLE" | "LINE";
    overlays: OverlayData;
    onStatsChange: (candle: Candle | null) => void;
    onCandlesChange?: (candles: Candle[]) => void;
    onHoverChange?: (data: HoverCandle | null) => void;
}

const OVERLAY_SERIES = [
    { key: "sma",  color: "#3b82f6" },  // accent blue — matches mockup SMA line
    { key: "ema",  color: "#a78bfa" },  // purple
    { key: "vwap", color: "#00b4d8" },  // cyan
];

const BB_COLORS = { upper: "#5a5a5a", middle: "#5a5a5a", lower: "#5a5a5a" };

const ICHIMOKU_COLORS = {
    tenkan:   "#ef4444",
    kijun:    "#3b82f6",
    senkou_a: "#00d68f",
    senkou_b: "#ff4757",
    chikou:   "#f59e0b",
};

function timeToISO(time: string | number): string {
    if (typeof time === "number") return new Date(time * 1000).toISOString();
    return (time as string) + "T00:00:00Z";
}

export default function PriceChart({
    symbol, timeframe, chartType, overlays,
    onStatsChange, onCandlesChange, onHoverChange,
}: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef     = useRef<ReturnType<typeof createChart> | null>(null);
    const seriesRef    = useRef<any>(null);
    const overlaySeriesRef = useRef<any[]>([]);

    // Pagination refs
    const allCandlesRef        = useRef<Candle[]>([]);
    const isFetchingMoreRef    = useRef(false);
    const hasMoreRef           = useRef(false);
    const symbolRef            = useRef(symbol);
    const timeframeRef         = useRef(timeframe);
    const chartTypeRef         = useRef(chartType);
    const overlaysRef          = useRef(overlays);

    const [loading, setLoading]         = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError]             = useState<string | null>(null);

    useEffect(() => { symbolRef.current     = symbol;     }, [symbol]);
    useEffect(() => { timeframeRef.current  = timeframe;  }, [timeframe]);
    useEffect(() => { chartTypeRef.current  = chartType;  }, [chartType]);
    useEffect(() => { overlaysRef.current   = overlays;   }, [overlays]);

    // Create chart once
    useEffect(() => {
        if (!containerRef.current) return;

        const chart = createChart(containerRef.current, {
            layout: {
                background: { color: "#111111" },
                textColor: "#8a8a8a",
                fontFamily: "JetBrains Mono, Consolas, monospace",
                fontSize: 10,
            },
            grid: {
                vertLines: { color: "#1a1a1a" },
                horzLines: { color: "#1a1a1a" },
            },
            crosshair: {
                mode: 1,
                vertLine: { color: "#3b82f6", width: 1, style: 2, labelBackgroundColor: "#3b82f6" },
                horzLine: { color: "#3b82f6", width: 1, style: 2, labelBackgroundColor: "#3b82f6" },
            },
            localization: {
                timeFormatter: (time: string | number) => {
                    if (typeof time === "number") return new Date(time * 1000).toLocaleString();
                    return time;
                }
            },
            rightPriceScale: { borderColor: "#1f1f1f" },
            timeScale:        { borderColor: "#1f1f1f" },
            width:  containerRef.current.clientWidth,
            height: containerRef.current.clientHeight || 300,
            handleScroll: true,
            handleScale:  true,
        });

        const series = chart.addSeries(CandlestickSeries, {
            upColor:      "#00d68f",
            downColor:    "#ff4757",
            borderVisible: false,
            wickUpColor:   "#00d68f",
            wickDownColor: "#ff4757",
        });

        chartRef.current  = chart;
        seriesRef.current = series;

        // Crosshair hover → feed OHLC overlay in ChartPanel
        // Uses seriesRef.current so it works after chart-type switches.
        chart.subscribeCrosshairMove((param) => {
            if (!param.time || !param.seriesData.size) {
                onHoverChange?.(null);
                return;
            }
            // Look up the full candle (with volume) from our cached data.
            const candle = allCandlesRef.current.find((c) => c.time === param.time);
            if (candle) {
                onHoverChange?.({ open: candle.open, high: candle.high, low: candle.low, close: candle.close, volume: candle.volume, time: candle.time });
                return;
            }
            // Fallback for candle series (no volume available)
            const raw = param.seriesData.get(seriesRef.current) as any;
            if (raw?.open !== undefined) {
                onHoverChange?.({ open: raw.open, high: raw.high, low: raw.low, close: raw.close, volume: 0, time: raw.time });
            }
        });

        // Pagination: load older candles when user pans to left edge
        chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
            if (
                !range ||
                range.from > 10 ||
                isFetchingMoreRef.current ||
                !hasMoreRef.current
            ) return;

            const oldest = allCandlesRef.current[0];
            if (!oldest) return;

            isFetchingMoreRef.current = true;
            setLoadingMore(true);

            const before = timeToISO(oldest.time);

            apiFetch<OHLCVResponse>(
                `/ohlcv/${symbolRef.current}?timeframe=${timeframeRef.current}&before=${encodeURIComponent(before)}`
            )
                .then(({ candles, has_more }) => {
                    if (!candles.length) { hasMoreRef.current = false; return; }
                    hasMoreRef.current = has_more;
                    const prevRange = chart.timeScale().getVisibleLogicalRange();
                    const seen = new Set(allCandlesRef.current.map((c) => c.time));
                    const prepend = candles.filter((c) => !seen.has(c.time));
                    const merged = [...prepend, ...allCandlesRef.current];
                    console.log("[pagination]", { tf: timeframeRef.current, fetched: candles.length, prepended: prepend.length, merged: merged.length, seriesOK: !!seriesRef.current, prevRange });
                    allCandlesRef.current = merged;
                    onCandlesChange?.(merged);
                    const displayData = chartTypeRef.current === "LINE"
                        ? merged.map((c) => ({ time: c.time, value: c.close }))
                        : merged;
                    seriesRef.current!.setData(displayData as any);
                    if (prevRange) {
                        chart.timeScale().setVisibleLogicalRange({
                            from: prevRange.from + candles.length,
                            to:   prevRange.to   + candles.length,
                        });
                    }
                })
                .catch(console.error)
                .finally(() => { isFetchingMoreRef.current = false; setLoadingMore(false); });
        });

        // Resize: update both width and height
        const ro = new ResizeObserver(() => {
            if (!containerRef.current) return;
            chart.applyOptions({
                width:  containerRef.current.clientWidth,
                height: containerRef.current.clientHeight,
            });
        });
        ro.observe(containerRef.current);

        return () => { ro.disconnect(); chart.remove(); };
    }, []);

    // Reload data on symbol / timeframe change
    useEffect(() => {
        if (!seriesRef.current) return;

        allCandlesRef.current    = [];
        hasMoreRef.current       = false;
        isFetchingMoreRef.current = false;

        setLoading(true);
        setError(null);

        apiFetch<OHLCVResponse>(`/ohlcv/${symbol}?timeframe=${timeframe}`)
            .then(({ candles, has_more }) => {
                allCandlesRef.current = candles;
                hasMoreRef.current    = has_more;
                const displayData = chartTypeRef.current === "LINE"
                    ? candles.map((c) => ({ time: c.time, value: c.close }))
                    : candles;
                seriesRef.current!.setData(displayData as any);
                if (candles.length) {
                    onStatsChange(candles[candles.length - 1]);
                    onCandlesChange?.(candles);
                }
                chartRef.current?.timeScale().fitContent();
            })
            .catch((err) => {
                const msg: string = err?.message ?? "";
                const is404 = msg.includes("404") || msg.toLowerCase().includes("not found") || msg.toLowerCase().includes("no data");
                setError(is404 ? `Symbol "${symbol}" not found` : (msg || "Failed to load chart data"));
                seriesRef.current?.setData([]);
                onStatsChange(null);
                onCandlesChange?.([]);
            })
            .finally(() => setLoading(false));
    }, [symbol, timeframe]);

    const addLine = (data: Point[], color: string, dashed = false) => {
        const chart = chartRef.current;
        if (!chart || !data?.length) return;
        const s = chart.addSeries(LineSeries, {
            color, lineWidth: 1,
            lineStyle: dashed ? 1 : 0,
            priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
        });
        s.setData(data as any);
        overlaySeriesRef.current.push(s);
    };

    // Switch between candlestick and line series when chartType changes
    useEffect(() => {
        const chart = chartRef.current;
        if (!chart) return;

        // Remove existing main series and overlay series
        if (seriesRef.current) {
            try { chart.removeSeries(seriesRef.current); } catch {}
        }
        for (const s of overlaySeriesRef.current) {
            try { chart.removeSeries(s); } catch {}
        }
        overlaySeriesRef.current = [];

        if (chartType === "CANDLE") {
            seriesRef.current = chart.addSeries(CandlestickSeries, {
                upColor: "#00d68f", downColor: "#ff4757",
                borderVisible: false, wickUpColor: "#00d68f", wickDownColor: "#ff4757",
            });
        } else {
            seriesRef.current = chart.addSeries(LineSeries, {
                color: "#3b82f6", lineWidth: 2,
                priceLineVisible: false, lastValueVisible: true,
            });
        }

        if (allCandlesRef.current.length) {
            const data = chartType === "LINE"
                ? allCandlesRef.current.map((c) => ({ time: c.time, value: c.close }))
                : allCandlesRef.current;
            seriesRef.current.setData(data as any);
            const ov = overlaysRef.current;
            for (const { key, color } of OVERLAY_SERIES) {
                const d = (ov as any)[key];
                if (d) addLine(d, color);
            }
            if (ov.bb) {
                addLine(ov.bb.upper, BB_COLORS.upper, true);
                addLine(ov.bb.middle, BB_COLORS.middle);
                addLine(ov.bb.lower, BB_COLORS.lower, true);
            }
            if (ov.ichimoku) {
                for (const [key, color] of Object.entries(ICHIMOKU_COLORS)) {
                    addLine((ov.ichimoku as any)[key], color);
                }
            }
            chart.timeScale().fitContent();
        }
    }, [chartType]);

    // Sync overlay series (SMA, EMA, BB, etc.) whenever overlays prop changes
    useEffect(() => {
        const chart = chartRef.current;
        if (!chart) return;

        for (const s of overlaySeriesRef.current) {
            try { chart.removeSeries(s); } catch {}
        }
        overlaySeriesRef.current = [];

        for (const { key, color } of OVERLAY_SERIES) {
            const data = (overlays as any)[key];
            if (data) addLine(data, color);
        }

        if (overlays.bb) {
            addLine(overlays.bb.upper,  BB_COLORS.upper,  true);
            addLine(overlays.bb.middle, BB_COLORS.middle);
            addLine(overlays.bb.lower,  BB_COLORS.lower,  true);
        }

        if (overlays.ichimoku) {
            for (const [key, color] of Object.entries(ICHIMOKU_COLORS)) {
                addLine((overlays.ichimoku as any)[key], color);
            }
        }
    }, [overlays]);

    return (
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
            <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

            {loading && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(17,17,17,0.7)" }}>
                    <div style={{ width: 24, height: 24, border: "2px solid #2a2a2a", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                </div>
            )}

            {!loading && error && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(17,17,17,0.9)" }}>
                    <div style={{ textAlign: "center" }}>
                        <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--down)", marginBottom: 6 }}>{error}</p>
                        <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)" }}>CHECK SYMBOL AND RETRY</p>
                    </div>
                </div>
            )}

            {loadingMore && (
                <div style={{ position: "absolute", top: 8, left: 8, display: "flex", alignItems: "center", gap: 6, background: "var(--panel)", padding: "4px 10px", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-dim)" }}>
                    <div style={{ width: 10, height: 10, border: "1px solid #2a2a2a", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                    LOADING HISTORY…
                </div>
            )}

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
