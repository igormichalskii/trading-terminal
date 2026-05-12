import React, { useEffect, useRef, useState } from "react";
import { createChart, CandlestickSeries, LineSeries } from "lightweight-charts";
import { apiFetch } from "../lib/api";
import { type DrawingPoint, type Drawing, type DrawingTool } from "../lib/drawings";
import { HorizontalLinePrimitive } from "../lib/primitives/HorizontalLinePrimitive";
import { COLOR_PALETTE, generateId, toDrawingPoint } from "../lib/drawingUtils";
import { TrendLinePrimitive } from "../lib/primitives/TrendLinePrimitive";
import { RectanglePrimitive } from "../lib/primitives/RectanglePrimitive";
import { FibRetracementPrimitive } from "../lib/primitives/FibRetracementPrimitive";
import { HorizontalRayPrimitive } from "../lib/primitives/HorizontalRayPrimitive";
import { VerticalLinePrimitive } from "../lib/primitives/VerticalLinePrimitive";
import { CrossLinePrimitive } from "../lib/primitives/CrossLinePrimitive";
import { RayPrimitive } from "../lib/primitives/RayPrimitive";
import { ExtendedLinePrimitive } from "../lib/primitives/ExtendedLinePrimitive";
import { InfoLinePrimitive } from "../lib/primitives/InfoLinePrimitive";
import { TrendAnglePrimitive } from "../lib/primitives/TrendAnglePrimitive";
import { ParallelChannelPrimitive } from "../lib/primitives/ParallelChannelPrimitive";
import { DisjointChannelPrimitive } from "../lib/primitives/DisjointChannelPrimitive";
import { FlatTopBottomPrimitive } from "../lib/primitives/FlatTopBottomPrimitive";
import { RegressionTrendPrimitive } from "../lib/primitives/RegressionTrendPrimitive";

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
    wma?: Point[];
    dema?: Point[];
    tema?: Point[];
    hma?: Point[];
    vwma?: Point[];
    kama?: Point[];
    alma?: Point[];
    zlema?: Point[];
    lsma?: Point[];
    trima?: Point[];
    t3?: Point[];
    mcginley?: Point[];
    vidya?: Point[];
    bb?: { upper: Point[]; middle: Point[]; lower: Point[] };
    kc?: { upper: Point[]; middle: Point[]; lower: Point[] };
    dc?: { upper: Point[]; middle: Point[]; lower: Point[] };
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
    drawings: Drawing[];
    selectedDrawingId: string | null;
    onStatsChange: (candle: Candle | null) => void;
    onCandlesChange?: (candles: Candle[]) => void;
    onHoverChange?: (data: HoverCandle | null) => void;
    onSelectDrawing: (id: string | null) => void;
    onToolChange: (tool: DrawingTool) => void;
    activeTool: DrawingTool;
    addDrawing: (drawing: Drawing) => void;
    removeDrawing: (id: string) => void;
}

const OVERLAY_SERIES = [
    { key: "sma", color: "#3b82f6" },
    { key: "ema", color: "#a78bfa" },
    { key: "vwap", color: "#00b4d8" },
    { key: "wma", color: "#ef4444" },
    { key: "dema", color: "#3b82f6" },
    { key: "tema", color: "#00d68f" },
    { key: "hma", color: "#f97316" },
    { key: "vwma", color: "#14b8a6" },
    { key: "kama", color: "#ec4899" },
    { key: "alma", color: "#84cc16" },
    { key: "zlema", color: "#6366f1" },
    { key: "lsma", color: "#f59e0b" },
    { key: "trima", color: "#0ea5e9" },
    { key: "t3", color: "#f43f5e" },
    { key: "mcginley", color: "#10b981" },
    { key: "vidya", color: "#8b5cf6" },
];

const BB_COLORS = { upper: "#5a5a5a", middle: "#5a5a5a", lower: "#5a5a5a" };
const KC_COLORS = { upper: "#6a6a6a", middle: "#6a6a6a", lower: "#6a6a6a" };
const DC_COLORS = { upper: "#7a7a7a", middle: "#7a7a7a", lower: "#7a7a7a" };

const ICHIMOKU_COLORS = {
    tenkan: "#ef4444",
    kijun: "#3b82f6",
    senkou_a: "#00d68f",
    senkou_b: "#ff4757",
    chikou: "#f59e0b",
};

function timeToISO(time: string | number): string {
    if (typeof time === "number") return new Date(time * 1000).toISOString();
    return (time as string) + "T00:00:00Z";
}

function createPrimitive(drawing: any, seriesRef: React.RefObject<any>, chartRef: React.RefObject<any>) {
    switch (drawing.type) {
        case "trend_line": return new TrendLinePrimitive(drawing, seriesRef, false, chartRef);
        case "ray": return new RayPrimitive(drawing, seriesRef, chartRef, false);
        case "extended_line": return new ExtendedLinePrimitive(drawing, seriesRef, chartRef, false);
        case "info_line": return new InfoLinePrimitive(drawing, seriesRef, chartRef, false);
        case "trend_angle": return new TrendAnglePrimitive(drawing, seriesRef, chartRef, false);
        case "rectangle": return new RectanglePrimitive(drawing, seriesRef, chartRef, false);
        case "fib_retracement": return new FibRetracementPrimitive(drawing, seriesRef, chartRef, false);
        case "horizontal_line": return new HorizontalLinePrimitive(drawing, seriesRef, false);
        case "horizontal_ray": return new HorizontalRayPrimitive(drawing, seriesRef, chartRef, false);
        case "cross_line": return new CrossLinePrimitive(drawing, seriesRef, chartRef, false);
        case "vertical_line": return new VerticalLinePrimitive(drawing, chartRef, false);
        case "parallel_channel": return new ParallelChannelPrimitive(drawing, seriesRef, chartRef, false);
        case "disjoint_channel": return new DisjointChannelPrimitive(drawing, seriesRef, chartRef, false);
        case "flat_top_bottom": return new FlatTopBottomPrimitive(drawing, seriesRef, chartRef, false);
        case "regression_trend": return new RegressionTrendPrimitive(drawing, seriesRef, chartRef, false);
    }
}

function computeRegression(candles: any[], p1Time: number, p2Time: number) {
    const startTime = Math.min(p1Time, p2Time);
    const endTime = Math.max(p1Time, p2Time);
    const range = candles.filter(c => {
        const t = typeof c.time === "string"
            ? Math.floor(new Date(c.time + "T00:00:00Z").getTime() / 1000)
            : c.time as number;
        return t >= startTime && t <= endTime;
    });
    if (range.length < 2) return null;
    const n = range.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
        sumX += i; sumY += range[i].close;
        sumXY += i * range[i].close; sumX2 += i * i;
    }
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    const r1Price = intercept;
    const r2Price = intercept + slope * (n - 1);
    const residuals = range.map((c, i) => c.close - (intercept + slope * i));
    const variance = residuals.reduce((s, r) => s + r * r, 0) / n;
    const deviation = Math.sqrt(variance);
    return { r1Price, r2Price, deviation };
}

export default function PriceChart({
    symbol, timeframe, chartType, overlays, drawings, selectedDrawingId,
    onStatsChange, onCandlesChange, onHoverChange, onSelectDrawing, onToolChange, activeTool, addDrawing, removeDrawing,
}: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const primitiveMapRef = useRef<Map<string, HorizontalLinePrimitive | TrendLinePrimitive | RectanglePrimitive | FibRetracementPrimitive | HorizontalRayPrimitive | VerticalLinePrimitive | CrossLinePrimitive | RayPrimitive | ExtendedLinePrimitive | InfoLinePrimitive | TrendAnglePrimitive | ParallelChannelPrimitive | DisjointChannelPrimitive | FlatTopBottomPrimitive | RegressionTrendPrimitive>>(new Map());
    const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
    const seriesRef = useRef<any>(null);
    const overlaySeriesRef = useRef<any[]>([]);
    const inProgressRef = useRef<DrawingPoint[]>([]);
    const previewPrimitiveRef = useRef<HorizontalLinePrimitive | TrendLinePrimitive | RectanglePrimitive | FibRetracementPrimitive | HorizontalRayPrimitive | VerticalLinePrimitive | CrossLinePrimitive | RayPrimitive | ExtendedLinePrimitive | InfoLinePrimitive | TrendAnglePrimitive | ParallelChannelPrimitive | DisjointChannelPrimitive | FlatTopBottomPrimitive | RegressionTrendPrimitive | null>(null);
    const previewTypeRef = useRef<string | null>(null);

    // Pagination refs
    const allCandlesRef = useRef<Candle[]>([]);
    const isFetchingMoreRef = useRef(false);
    const hasMoreRef = useRef(false);
    const symbolRef = useRef(symbol);
    const timeframeRef = useRef(timeframe);
    const chartTypeRef = useRef(chartType);
    const overlaysRef = useRef(overlays);

    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => { symbolRef.current = symbol; }, [symbol]);
    useEffect(() => { timeframeRef.current = timeframe; }, [timeframe]);
    useEffect(() => { chartTypeRef.current = chartType; }, [chartType]);
    useEffect(() => { overlaysRef.current = overlays; }, [overlays]);

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
            timeScale: { borderColor: "#1f1f1f" },
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight || 300,
            handleScroll: true,
            handleScale: true,
        });

        const series = chart.addSeries(CandlestickSeries, {
            upColor: "#00d68f",
            downColor: "#ff4757",
            borderVisible: false,
            wickUpColor: "#00d68f",
            wickDownColor: "#ff4757",
        });

        chartRef.current = chart;
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
                            to: prevRange.to + candles.length,
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
                width: containerRef.current.clientWidth,
                height: containerRef.current.clientHeight,
            });
        });
        ro.observe(containerRef.current);

        return () => { ro.disconnect(); chart.remove(); };
    }, []);


    // Reload data on symbol / timeframe change
    useEffect(() => {
        if (!seriesRef.current) return;

        allCandlesRef.current = [];
        hasMoreRef.current = false;
        isFetchingMoreRef.current = false;

        setLoading(true);
        setError(null);

        apiFetch<OHLCVResponse>(`/ohlcv/${symbol}?timeframe=${timeframe}`)
            .then(({ candles, has_more }) => {
                allCandlesRef.current = candles;
                hasMoreRef.current = has_more;
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

    // Switch between candlestick and line series when chartType changes
    useEffect(() => {
        const chart = chartRef.current;
        if (!chart) return;

        // Remove existing main series and overlay series
        if (seriesRef.current) {
            try { chart.removeSeries(seriesRef.current); } catch { }
        }
        for (const s of overlaySeriesRef.current) {
            try { chart.removeSeries(s); } catch { }
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
            if (ov.kc) {
                addLine(ov.kc.upper, KC_COLORS.upper, true);
                addLine(ov.kc.middle, KC_COLORS.middle);
                addLine(ov.kc.lower, KC_COLORS.lower, true);
            }
            if (ov.dc) {
                addLine(ov.dc.upper, DC_COLORS.upper, true);
                addLine(ov.dc.middle, DC_COLORS.middle);
                addLine(ov.dc.lower, DC_COLORS.lower, true);
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
            try { chart.removeSeries(s); } catch { }
        }
        overlaySeriesRef.current = [];

        for (const { key, color } of OVERLAY_SERIES) {
            const data = (overlays as any)[key];
            if (data) addLine(data, color);
        }

        if (overlays.bb) {
            addLine(overlays.bb.upper, BB_COLORS.upper, true);
            addLine(overlays.bb.middle, BB_COLORS.middle);
            addLine(overlays.bb.lower, BB_COLORS.lower, true);
        }

        if (overlays.kc) {
            addLine(overlays.kc.upper, KC_COLORS.upper, true);
            addLine(overlays.kc.middle, KC_COLORS.middle);
            addLine(overlays.kc.lower, KC_COLORS.lower, true);
        }

        if (overlays.dc) {
            addLine(overlays.dc.upper, DC_COLORS.upper, true);
            addLine(overlays.dc.middle, DC_COLORS.middle);
            addLine(overlays.dc.lower, DC_COLORS.lower, true);
        }

        if (overlays.ichimoku) {
            for (const [key, color] of Object.entries(ICHIMOKU_COLORS)) {
                addLine((overlays.ichimoku as any)[key], color);
            }
        }
    }, [overlays]);

    useEffect(() => {
        const chart = chartRef.current;
        if (!chart) return;
        for (const drawing of drawings) {
            if (!primitiveMapRef.current.has(drawing.id)) {
                const primitive = createPrimitive(drawing, seriesRef, chartRef);
                if (primitive) {
                    seriesRef.current?.attachPrimitive(primitive);
                    primitiveMapRef.current.set(drawing.id, primitive);
                }
            } else {
                (primitiveMapRef.current.get(drawing.id) as any).update(drawing, drawing.id === selectedDrawingId);
            }

        }
        for (const [id, primitive] of primitiveMapRef.current) {
            if (!drawings.find((d) => d.id === id)) {
                seriesRef.current?.detachPrimitive(primitive);
                primitiveMapRef.current.delete(id);
            }
        }
    }, [drawings, selectedDrawingId]);

    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === "Delete" && selectedDrawingId) {
                removeDrawing(selectedDrawingId);
                onSelectDrawing(null);
            }
            if (e.key === "Escape" && activeTool) {
                inProgressRef.current = [];
                if (previewPrimitiveRef.current) {
                    seriesRef.current?.detachPrimitive(previewPrimitiveRef.current);
                    previewPrimitiveRef.current = null;
                    previewTypeRef.current = null
                }
                onToolChange(null);
            }
        }
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedDrawingId, removeDrawing, onSelectDrawing, activeTool, onToolChange])

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

    const handleMouseMove = (e: any) => {
        if (!activeTool || inProgressRef.current.length === 0) {
            if (previewPrimitiveRef.current) {
                seriesRef.current?.detachPrimitive(previewPrimitiveRef.current);
                previewPrimitiveRef.current = null;
                previewTypeRef.current = null;
            }
            return;
        }
        const THREE_CLICK_TOOLS = ["parallel_channel", "disjoint_channel", "flat_top_bottom"];
        const rect = containerRef.current!.getBoundingClientRect();
        const point = toDrawingPoint(e.clientX - rect.left, e.clientY - rect.top, chartRef.current!, seriesRef);
        if (!point) return;

        let tempDrawing: any;
        if (inProgressRef.current.length === 1 && THREE_CLICK_TOOLS.includes(activeTool)) {
            tempDrawing = {
                id: "__preview__", type: "trend_line",
                p1: inProgressRef.current[0], p2: point,
                color: COLOR_PALETTE[0] + "99", lineWidth: 1, lineStyle: "solid" as const, label: ""
            };
        } else if (inProgressRef.current.length === 2) {
            tempDrawing = {
                id: "__preview__", type: activeTool,
                p1: inProgressRef.current[0], p2: inProgressRef.current[1], p3: point,
                color: COLOR_PALETTE[0] + "99", lineWidth: 1, lineStyle: "solid" as const, label: "",
                levels: [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1],
                fillOpacity: 0.1
            };
        } else {
            const previewType = activeTool === "regression_trend" ? "trend_line" : activeTool;
            tempDrawing = {
                id: "__preview__", type: previewType,
                p1: inProgressRef.current[0], p2: point,
                color: COLOR_PALETTE[0] + "99", lineWidth: 1, lineStyle: "solid" as const, label: "",
                levels: [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1],
                fillOpacity: 0.1
            };
        }

        if (previewPrimitiveRef.current && previewTypeRef.current !== tempDrawing.type) {
            seriesRef.current?.detachPrimitive(previewPrimitiveRef.current);
            previewPrimitiveRef.current = null;
            previewTypeRef.current = null;
        }

        if (previewPrimitiveRef.current) {
            (previewPrimitiveRef.current as any).update(tempDrawing, false);
        }
        else {
            const primitive = createPrimitive(tempDrawing, seriesRef, chartRef);
            if (primitive) {
                previewTypeRef.current = tempDrawing.type;
                seriesRef.current?.attachPrimitive(primitive);
                previewPrimitiveRef.current = primitive as any;
            }
        }
    }

    return (
        <div style={{ position: "relative", width: "100%", flex: 1, minHeight: 0 }}>
            <div
                ref={containerRef}
                style={{ width: "100%", height: "100%" }}
                onClick={(e) => {
                    if (activeTool === "horizontal_line") {
                        const rect = containerRef.current!.getBoundingClientRect();
                        const point = toDrawingPoint(e.clientX - rect.left, e.clientY - rect.top, chartRef.current!, seriesRef);
                        if (!point) return;
                        addDrawing({ id: generateId(), type: "horizontal_line", price: point.price, color: COLOR_PALETTE[0], lineWidth: 1, lineStyle: "solid", label: "" });
                        onToolChange(null);
                    } else if (activeTool === "trend_line") {
                        const rect = containerRef.current!.getBoundingClientRect();
                        const point = toDrawingPoint(e.clientX - rect.left, e.clientY - rect.top, chartRef.current!, seriesRef);
                        if (!point) return;
                        if (inProgressRef.current.length === 0) {
                            inProgressRef.current = [point];
                        } else {
                            const p1 = inProgressRef.current[0];
                            inProgressRef.current = [];
                            seriesRef.current?.detachPrimitive(previewPrimitiveRef.current);
                            previewPrimitiveRef.current = null;
                            previewTypeRef.current = null;
                            addDrawing({ id: generateId(), type: "trend_line", p1: p1, p2: point, color: COLOR_PALETTE[1], lineWidth: 1, lineStyle: "solid", label: "" });
                            onToolChange(null);
                        }
                    } else if (activeTool === "rectangle") {
                        const rect = containerRef.current!.getBoundingClientRect();
                        const point = toDrawingPoint(e.clientX - rect.left, e.clientY - rect.top, chartRef.current!, seriesRef);
                        if (!point) return;
                        if (inProgressRef.current.length === 0) {
                            inProgressRef.current = [point];
                        } else {
                            const p1 = inProgressRef.current[0];
                            inProgressRef.current = [];
                            seriesRef.current?.detachPrimitive(previewPrimitiveRef.current);
                            previewPrimitiveRef.current = null;
                            previewTypeRef.current = null;
                            addDrawing({ id: generateId(), type: "rectangle", p1: p1, p2: point, color: COLOR_PALETTE[2], fillOpacity: 0.85, lineWidth: 1, lineStyle: "solid", label: "" });
                            onToolChange(null);
                        }
                    } else if (activeTool === "fib_retracement") {
                        const rect = containerRef.current!.getBoundingClientRect();
                        const point = toDrawingPoint(e.clientX - rect.left, e.clientY - rect.top, chartRef.current!, seriesRef);
                        if (!point) return;
                        if (inProgressRef.current.length === 0) {
                            inProgressRef.current = [point];
                        } else {
                            const p1 = inProgressRef.current[0];
                            inProgressRef.current = [];
                            seriesRef.current?.detachPrimitive(previewPrimitiveRef.current);
                            previewPrimitiveRef.current = null;
                            previewTypeRef.current = null;
                            addDrawing({ id: generateId(), type: "fib_retracement", p1: p1, p2: point, color: COLOR_PALETTE[3], levels: [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1], lineWidth: 1, lineStyle: "solid", label: "" })
                            onToolChange(null);
                        }
                    } else if (activeTool === "horizontal_ray") {
                        const rect = containerRef.current!.getBoundingClientRect();
                        const point = toDrawingPoint(e.clientX - rect.left, e.clientY - rect.top, chartRef.current!, seriesRef);
                        if (!point) return;
                        addDrawing({ id: generateId(), type: "horizontal_ray", p1: point, color: COLOR_PALETTE[4], lineWidth: 1, lineStyle: "solid", label: "" });
                        onToolChange(null);
                    } else if (activeTool === "vertical_line") {
                        const rect = containerRef.current!.getBoundingClientRect();
                        const point = toDrawingPoint(e.clientX - rect.left, e.clientY - rect.top, chartRef.current!, seriesRef);
                        if (!point) return;
                        addDrawing({ id: generateId(), type: "vertical_line", p1: point, color: COLOR_PALETTE[5], lineWidth: 1, lineStyle: "solid", label: "" });
                        onToolChange(null);
                    } else if (activeTool === "cross_line") {
                        const rect = containerRef.current!.getBoundingClientRect();
                        const point = toDrawingPoint(e.clientX - rect.left, e.clientY - rect.top, chartRef.current!, seriesRef);
                        if (!point) return;
                        addDrawing({ id: generateId(), type: "cross_line", p1: point, color: COLOR_PALETTE[6], lineWidth: 1, lineStyle: "solid", label: "" });
                        onToolChange(null);
                    } else if (activeTool === "ray") {
                        const rect = containerRef.current!.getBoundingClientRect();
                        const point = toDrawingPoint(e.clientX - rect.left, e.clientY - rect.top, chartRef.current!, seriesRef);
                        if (!point) return;
                        if (inProgressRef.current.length === 0) {
                            inProgressRef.current = [point];
                        } else {
                            const p1 = inProgressRef.current[0];
                            inProgressRef.current = [];
                            seriesRef.current?.detachPrimitive(previewPrimitiveRef.current);
                            previewPrimitiveRef.current = null;
                            previewTypeRef.current = null;
                            addDrawing({ id: generateId(), type: "ray", p1: p1, p2: point, color: COLOR_PALETTE[7], lineWidth: 1, lineStyle: "solid", label: "" });
                            onToolChange(null);
                        }
                    } else if (activeTool === "info_line") {
                        const rect = containerRef.current!.getBoundingClientRect();
                        const point = toDrawingPoint(e.clientX - rect.left, e.clientY - rect.top, chartRef.current!, seriesRef);
                        if (!point) return;
                        if (inProgressRef.current.length === 0) {
                            inProgressRef.current = [point];
                        } else {
                            const p1 = inProgressRef.current[0];
                            inProgressRef.current = [];
                            seriesRef.current?.detachPrimitive(previewPrimitiveRef.current);
                            previewPrimitiveRef.current = null;
                            previewTypeRef.current = null;
                            addDrawing({ id: generateId(), type: "info_line", p1: p1, p2: point, color: COLOR_PALETTE[8], lineWidth: 1, lineStyle: "solid", label: "" });
                            onToolChange(null);
                        }
                    } else if (activeTool === "extended_line") {
                        const rect = containerRef.current!.getBoundingClientRect();
                        const point = toDrawingPoint(e.clientX - rect.left, e.clientY - rect.top, chartRef.current!, seriesRef);
                        if (!point) return;
                        if (inProgressRef.current.length === 0) {
                            inProgressRef.current = [point];
                        } else {
                            const p1 = inProgressRef.current[0];
                            inProgressRef.current = [];
                            seriesRef.current?.detachPrimitive(previewPrimitiveRef.current);
                            previewPrimitiveRef.current = null;
                            previewTypeRef.current = null;
                            addDrawing({ id: generateId(), type: "extended_line", p1: p1, p2: point, color: COLOR_PALETTE[9], lineWidth: 1, lineStyle: "solid", label: "" });
                            onToolChange(null);
                        }
                    } else if (activeTool === "trend_angle") {
                        const rect = containerRef.current!.getBoundingClientRect();
                        const point = toDrawingPoint(e.clientX - rect.left, e.clientY - rect.top, chartRef.current!, seriesRef);
                        if (!point) return;
                        if (inProgressRef.current.length === 0) {
                            inProgressRef.current = [point];
                        } else {
                            const p1 = inProgressRef.current[0];
                            inProgressRef.current = [];
                            seriesRef.current?.detachPrimitive(previewPrimitiveRef.current);
                            previewPrimitiveRef.current = null;
                            previewTypeRef.current = null;
                            addDrawing({ id: generateId(), type: "trend_angle", p1: p1, p2: point, color: COLOR_PALETTE[10], lineWidth: 1, lineStyle: "solid", label: "" });
                            onToolChange(null)
                        }
                    } else if (activeTool === "parallel_channel") {
                        const rect = containerRef.current!.getBoundingClientRect();
                        const point = toDrawingPoint(e.clientX - rect.left, e.clientY - rect.top, chartRef.current!, seriesRef);
                        if (!point) return;
                        if (inProgressRef.current.length < 2) {
                            inProgressRef.current = [...inProgressRef.current, point];
                        } else {
                            const [p1, p2] = inProgressRef.current;
                            inProgressRef.current = [];
                            seriesRef.current?.detachPrimitive(previewPrimitiveRef.current);
                            previewPrimitiveRef.current = null;
                            previewTypeRef.current = null;
                            addDrawing({ id: generateId(), type: "parallel_channel", p1, p2, p3: point, color: COLOR_PALETTE[0], lineWidth: 1, lineStyle: "solid", label: "" });
                            onToolChange(null);
                        }
                    } else if (activeTool === "disjoint_channel") {
                        const rect = containerRef.current!.getBoundingClientRect();
                        const point = toDrawingPoint(e.clientX - rect.left, e.clientY - rect.top, chartRef.current!, seriesRef);
                        if (!point) return;
                        if (inProgressRef.current.length < 2) {
                            inProgressRef.current = [...inProgressRef.current, point];
                        } else {
                            const [p1, p2] = inProgressRef.current;
                            inProgressRef.current = [];
                            seriesRef.current?.detachPrimitive(previewPrimitiveRef.current);
                            previewPrimitiveRef.current = null;
                            previewTypeRef.current = null;
                            addDrawing({ id: generateId(), type: "disjoint_channel", p1, p2, p3: point, color: COLOR_PALETTE[1], lineWidth: 1, lineStyle: "solid", label: "" });
                            onToolChange(null);
                        }
                    } else if (activeTool === "flat_top_bottom") {
                        const rect = containerRef.current!.getBoundingClientRect();
                        const point = toDrawingPoint(e.clientX - rect.left, e.clientY - rect.top, chartRef.current!, seriesRef);
                        if (!point) return;
                        if (inProgressRef.current.length < 2) {
                            inProgressRef.current = [...inProgressRef.current, point];
                        } else {
                            const [p1, p2] = inProgressRef.current;
                            inProgressRef.current = [];
                            seriesRef.current?.detachPrimitive(previewPrimitiveRef.current);
                            previewPrimitiveRef.current = null;
                            previewTypeRef.current = null;
                            addDrawing({ id: generateId(), type: "flat_top_bottom", p1, p2, p3: point, color: COLOR_PALETTE[2], lineWidth: 1, lineStyle: "solid", label: "" });
                            onToolChange(null);
                        }
                    } else if (activeTool === "regression_trend") {
                        const rect = containerRef.current!.getBoundingClientRect();
                        const point = toDrawingPoint(e.clientX - rect.left, e.clientY - rect.top, chartRef.current!, seriesRef);
                        if (!point) return;
                        if (inProgressRef.current.length === 0) {
                            inProgressRef.current = [point];
                        } else {
                            const p1 = inProgressRef.current[0];
                            inProgressRef.current = [];
                            seriesRef.current?.detachPrimitive(previewPrimitiveRef.current);
                            previewPrimitiveRef.current = null;
                            previewTypeRef.current = null;
                            const reg = computeRegression(allCandlesRef.current, p1.time, point.time);
                            if (!reg) return;
                            addDrawing({ id: generateId(), type: "regression_trend", p1, p2: point, ...reg, color: COLOR_PALETTE[3], lineWidth: 1, lineStyle: "solid", label: "" });
                            onToolChange(null);
                        }
                    }
                    else if (activeTool === null) {
                        const rect = containerRef.current!.getBoundingClientRect();
                        let found = null;
                        for (const d of drawings.filter(d => d.type === "horizontal_line")) {
                            const lineY = seriesRef.current?.priceToCoordinate(d.price);
                            if (lineY == null) continue;
                            const clickY = e.clientY - rect.top;
                            if (Math.abs(clickY - lineY) < 5) { found = d.id; break; }
                        }

                        if (!found) {
                            for (const d of drawings.filter(d => d.type === "vertical_line")) {
                                const x = d.p1.logical != null
                                    ? chartRef.current?.timeScale().logicalToCoordinate(d.p1.logical as any)
                                    : chartRef.current?.timeScale().timeToCoordinate(d.p1.time as any);
                                if (x === null || x === undefined) continue;
                                const clickX = e.clientX - rect.left;
                                if (Math.abs(clickX - x) < 5) { found = d.id; break; }
                            }
                        }

                        if (!found) {
                            for (const d of drawings.filter(d => d.type === "cross_line")) {
                                const x = d.p1.logical != null
                                    ? chartRef.current?.timeScale().logicalToCoordinate(d.p1.logical as any)
                                    : chartRef.current?.timeScale().timeToCoordinate(d.p1.time as any);
                                const y = seriesRef.current?.priceToCoordinate(d.p1.price);
                                if (
                                    x === null ||
                                    x === undefined ||
                                    y === null ||
                                    y === undefined
                                ) continue;
                                const cx = e.clientX - rect.left;
                                const cy = e.clientY - rect.top;
                                if (Math.abs(cx - x) < 5 || Math.abs(cy - y) < 5) { found = d.id; break; }
                            }
                        }

                        if (!found) {
                            for (const d of drawings.filter(d => d.type === "horizontal_ray")) {
                                const x = d.p1.logical != null
                                    ? chartRef.current?.timeScale().logicalToCoordinate(d.p1.logical as any)
                                    : chartRef.current?.timeScale().timeToCoordinate(d.p1.time as any);
                                const y = seriesRef.current?.priceToCoordinate(d.p1.price);
                                if (
                                    x === null ||
                                    x === undefined ||
                                    y === null ||
                                    y === undefined
                                ) continue;
                                const cx = e.clientX - rect.left;
                                const cy = e.clientY - rect.top;
                                if (cx >= x && Math.abs(cy - y) < 5) { found = d.id; break; }
                            }
                        }

                        if (!found) {
                            for (const d of drawings.filter(d => d.type === "ray")) {
                                const x1 = d.p1.logical != null
                                    ? chartRef.current?.timeScale().logicalToCoordinate(d.p1.logical as any)
                                    : chartRef.current?.timeScale().timeToCoordinate(d.p1.time as any);
                                const x2 = d.p2.logical != null
                                    ? chartRef.current?.timeScale().logicalToCoordinate(d.p2.logical as any)
                                    : chartRef.current?.timeScale().timeToCoordinate(d.p2.time as any);
                                const y1 = seriesRef.current?.priceToCoordinate(d.p1.price);
                                const y2 = seriesRef.current?.priceToCoordinate(d.p2.price);
                                if (
                                    x1 === null ||
                                    x1 === undefined ||
                                    x2 === null ||
                                    x2 === undefined ||
                                    y1 === null ||
                                    y1 === undefined ||
                                    y2 === null ||
                                    y2 === undefined
                                ) continue;
                                const cx = e.clientX - rect.left;
                                const cy = e.clientY - rect.top;
                                const dx = x2 - x1;
                                const dy = y2 - y1;
                                const len2 = dx * dx + dy * dy;
                                const t = Math.max(0, ((cx - x1) * dx + (cy - y1) * dy) / len2);
                                const nearX = x1 + t * dx;
                                const nearY = y1 + t * dy;
                                const dist = Math.sqrt((cx - nearX) ** 2 + (cy - nearY) ** 2);
                                if (dist < 5) { found = d.id; break; }
                            }
                        }

                        if (!found) {
                            for (const d of drawings.filter(d => d.type === "info_line")) {
                                const x1 = d.p1.logical != null
                                    ? chartRef.current?.timeScale().logicalToCoordinate(d.p1.logical as any)
                                    : chartRef.current?.timeScale().timeToCoordinate(d.p1.time as any);
                                const x2 = d.p2.logical != null
                                    ? chartRef.current?.timeScale().logicalToCoordinate(d.p2.logical as any)
                                    : chartRef.current?.timeScale().timeToCoordinate(d.p2.time as any);
                                const y1 = seriesRef.current?.priceToCoordinate(d.p1.price);
                                const y2 = seriesRef.current?.priceToCoordinate(d.p2.price);
                                if (
                                    x1 === null ||
                                    x1 === undefined ||
                                    x2 === null ||
                                    x2 === undefined ||
                                    y1 === null ||
                                    y1 === undefined ||
                                    y2 === null ||
                                    y2 === undefined
                                ) continue;
                                const cx = e.clientX - rect.left;
                                const cy = e.clientY - rect.top;
                                const dx = x2 - x1;
                                const dy = y2 - y1;
                                const len2 = dx * dx + dy * dy;
                                const t = Math.max(0, Math.min(1, ((cx - x1) * dx + (cy - y1) * dy) / len2));
                                const nearX = x1 + t * dx;
                                const nearY = y1 + t * dy;
                                const dist = Math.sqrt((cx - nearX) ** 2 + (cy - nearY) ** 2);
                                if (dist < 5) { found = d.id; break; }
                            }
                        }

                        if (!found) {
                            for (const d of drawings.filter(d => d.type === "trend_line")) {
                                const x1 = d.p1.logical != null
                                    ? chartRef.current?.timeScale().logicalToCoordinate(d.p1.logical as any)
                                    : chartRef.current?.timeScale().timeToCoordinate(d.p1.time as any);
                                const y1 = seriesRef.current?.priceToCoordinate(d.p1.price);
                                const x2 = d.p2.logical != null
                                    ? chartRef.current?.timeScale().logicalToCoordinate(d.p2.logical as any)
                                    : chartRef.current?.timeScale().timeToCoordinate(d.p2.time as any);
                                const y2 = seriesRef.current.priceToCoordinate(d.p2.price);
                                if (
                                    x1 === null ||
                                    x1 === undefined ||
                                    y1 === null ||
                                    y1 === undefined ||
                                    x2 === null ||
                                    x2 === undefined ||
                                    y2 === null ||
                                    y2 === undefined
                                ) continue;
                                const cx = e.clientX - rect.left;
                                const cy = e.clientY - rect.top;
                                const dx = x2 - x1;
                                const dy = y2 - y1;
                                const len2 = dx * dx + dy * dy;
                                const t = Math.max(0, Math.min(1, ((cx - x1) * dx + (cy - y1) * dy) / len2));
                                const nearX = x1 + t * dx;
                                const nearY = y1 + t * dy;
                                const dist = Math.sqrt((cx - nearX) ** 2 + (cy - nearY) ** 2);
                                if (dist < 5) { found = d.id; break; }
                            }
                        }

                        if (!found) {
                            for (const d of drawings.filter(d => d.type === "extended_line")) {
                                const x1 = d.p1.logical != null
                                    ? chartRef.current?.timeScale().logicalToCoordinate(d.p1.logical as any)
                                    : chartRef.current?.timeScale().timeToCoordinate(d.p1.time as any);
                                const x2 = d.p2.logical != null
                                    ? chartRef.current?.timeScale().logicalToCoordinate(d.p2.logical as any)
                                    : chartRef.current?.timeScale().timeToCoordinate(d.p2.time as any);
                                const y1 = seriesRef.current?.priceToCoordinate(d.p1.price);
                                const y2 = seriesRef.current?.priceToCoordinate(d.p2.price);
                                if (
                                    x1 === null ||
                                    x1 === undefined ||
                                    x2 === null ||
                                    x2 === undefined ||
                                    y1 === null ||
                                    y1 === undefined ||
                                    y2 === null ||
                                    y2 === undefined
                                ) continue;
                                const cx = e.clientX - rect.left;
                                const cy = e.clientY - rect.top;
                                const dx = x2 - x1;
                                const dy = y2 - y1;
                                const len2 = dx * dx + dy * dy;
                                const t = Math.max(0, ((cx - x1) * dx + (cy - y1) * dy) / len2);
                                const nearX = x1 + t * dx;
                                const nearY = y1 + t * dy;
                                const dist = Math.sqrt((cx - nearX) ** 2 + (cy - nearY) ** 2);
                                if (dist < 5) { found = d.id; break; }
                            }
                        }

                        if (!found) {
                            for (const d of drawings.filter(d => d.type === "trend_angle")) {
                                const x1 = d.p1.logical != null
                                    ? chartRef.current?.timeScale().logicalToCoordinate(d.p1.logical as any)
                                    : chartRef.current?.timeScale().timeToCoordinate(d.p1.time as any);
                                const x2 = d.p2.logical != null
                                    ? chartRef.current?.timeScale().logicalToCoordinate(d.p2.logical as any)
                                    : chartRef.current?.timeScale().timeToCoordinate(d.p2.time as any);
                                const y1 = seriesRef.current?.priceToCoordinate(d.p1.price);
                                const y2 = seriesRef.current?.priceToCoordinate(d.p2.price);
                                if (
                                    x1 === null ||
                                    x1 === undefined ||
                                    x2 === null ||
                                    x2 === undefined ||
                                    y1 === null ||
                                    y1 === undefined ||
                                    y2 === null ||
                                    y2 === undefined
                                ) continue;
                                const cx = e.clientX - rect.left;
                                const cy = e.clientY - rect.top;
                                const dx = x2 - x1;
                                const dy = y2 - y1;
                                const len2 = dx * dx + dy * dy;
                                const t = Math.max(0, Math.min(1, ((cx - x1) * dx + (cy - y1) * dy) / len2));
                                const nearX = x1 + t * dx;
                                const nearY = y1 + t * dy;
                                const dist = Math.sqrt((cx - nearX) ** 2 + (cy - nearY) ** 2);
                                if (dist < 5) { found = d.id; break; }
                            }
                        }

                        if (!found) {
                            for (const d of drawings.filter(d => d.type === "rectangle")) {
                                const x1 = d.p1.logical != null
                                    ? chartRef.current?.timeScale().logicalToCoordinate(d.p1.logical as any)
                                    : chartRef.current?.timeScale().timeToCoordinate(d.p1.time as any);
                                const y1 = seriesRef.current?.priceToCoordinate(d.p1.price);
                                const x2 = d.p1.logical != null
                                    ? chartRef.current?.timeScale().logicalToCoordinate(d.p2.logical as any)
                                    : chartRef.current?.timeScale().timeToCoordinate(d.p2.time as any);
                                const y2 = seriesRef.current?.priceToCoordinate(d.p2.price);
                                if (
                                    x1 === null ||
                                    x1 === undefined ||
                                    y1 === null ||
                                    y1 === undefined ||
                                    x2 === null ||
                                    x2 === undefined ||
                                    y2 === null ||
                                    y2 === undefined
                                ) continue;
                                const cx = e.clientX - rect.left;
                                const cy = e.clientY - rect.top;
                                if (
                                    cx >= Math.min(x1, x2) &&
                                    cx <= Math.max(x1, x2) &&
                                    cy >= Math.min(y1, y2) &&
                                    cy <= Math.max(y1, y2)
                                ) { found = d.id; break; }
                            }
                        }

                        if (!found) {
                            const cy = e.clientY - rect.top;
                            for (const d of drawings.filter(d => d.type === "fib_retracement")) {
                                for (const l of d.levels) {
                                    const price = d.p2.price + (d.p1.price - d.p2.price) * l;
                                    const lineY = seriesRef.current?.priceToCoordinate(price);
                                    if (lineY === null) continue;
                                    if (Math.abs(cy - lineY) < 5) { found = d.id; break; }
                                }
                                if (found) break;
                            }

                        }

                        if (!found) {
                            const cx = e.clientX - rect.left;
                            const cy = e.clientY - rect.top;
                            for (const d of drawings.filter(d => d.type === "parallel_channel")) {
                                const x1 = d.p1.logical != null
                                    ? chartRef.current?.timeScale().logicalToCoordinate(d.p1.logical as any)
                                    : chartRef.current?.timeScale().timeToCoordinate(d.p1.time as any);
                                const x2 = d.p2.logical != null
                                    ? chartRef.current?.timeScale().logicalToCoordinate(d.p2.logical as any)
                                    : chartRef.current?.timeScale().timeToCoordinate(d.p2.time as any);
                                const x3 = d.p3.logical != null
                                    ? chartRef.current?.timeScale().logicalToCoordinate(d.p3.logical as any)
                                    : chartRef.current?.timeScale().timeToCoordinate(d.p3.time as any);
                                const y1 = seriesRef.current?.priceToCoordinate(d.p1.price);
                                const y2 = seriesRef.current?.priceToCoordinate(d.p2.price);
                                const y3 = seriesRef.current?.priceToCoordinate(d.p3.price);
                                if (
                                    x1 === null ||
                                    x1 === undefined ||
                                    x2 === null ||
                                    x2 === undefined ||
                                    x3 === null ||
                                    x3 === undefined ||
                                    y1 === null ||
                                    y1 === undefined ||
                                    y2 === null ||
                                    y2 === undefined ||
                                    y3 === null ||
                                    y3 === undefined
                                ) continue;
                                const slope = (y2 - y1) / (x2 - x1);
                                const yOnLine1At3 = y1 + slope * (x3 - x1);
                                const dy = y3 - yOnLine1At3;
                                const t = (cx - x1) / (x2 - x1);
                                const yL1 = y1 + t * (y2 - y1);
                                const yL2 = yL1 + dy;
                                if (cx >= Math.min(x1, x2) && cx <= Math.max(x1, x2) && cy >= Math.min(yL1, yL2) && cy <= Math.max(yL1, yL2)) { found = d.id; break; }
                            }
                        }

                        if (!found) {
                            const cx = e.clientX - rect.left;
                            const cy = e.clientY - rect.top;
                            for (const d of drawings.filter(d => d.type === "disjoint_channel")) {
                                const x1 = d.p1.logical != null
                                    ? chartRef.current?.timeScale().logicalToCoordinate(d.p1.logical as any)
                                    : chartRef.current?.timeScale().timeToCoordinate(d.p1.time as any);
                                const x2 = d.p2.logical != null
                                    ? chartRef.current?.timeScale().logicalToCoordinate(d.p2.logical as any)
                                    : chartRef.current?.timeScale().timeToCoordinate(d.p2.time as any);
                                const y1 = seriesRef.current?.priceToCoordinate(d.p1.price);
                                const y2 = seriesRef.current?.priceToCoordinate(d.p2.price);
                                const y3 = seriesRef.current?.priceToCoordinate(d.p3.price);
                                if (
                                    x1 === null ||
                                    x1 === undefined ||
                                    x2 === null ||
                                    x2 === undefined ||
                                    y1 === null ||
                                    y1 === undefined ||
                                    y2 === null ||
                                    y2 === undefined ||
                                    y3 === null ||
                                    y3 === undefined
                                ) continue;
                                const t = (cx - x1) / (x2 - x1);
                                const yL1 = y1 + t * (y2 - y1);
                                const yL2 = y3 - t * (y2 - y1);
                                if (cx >= Math.min(x1, x2) && cx <= Math.max(x1, x2) && cy >= Math.min(yL1, yL2) && cy <= Math.max(yL1, yL2)) { found = d.id; break; }
                            }
                        }

                        if (!found) {
                            const cx = e.clientX - rect.left;
                            const cy = e.clientY - rect.top;
                            for (const d of drawings.filter(d => d.type === "flat_top_bottom")) {
                                const x1 = d.p1.logical != null
                                    ? chartRef.current?.timeScale().logicalToCoordinate(d.p1.logical as any)
                                    : chartRef.current?.timeScale().timeToCoordinate(d.p1.time as any);
                                const x2 = d.p2.logical != null
                                    ? chartRef.current?.timeScale().logicalToCoordinate(d.p2.logical as any)
                                    : chartRef.current?.timeScale().timeToCoordinate(d.p2.time as any);
                                const y1 = seriesRef.current?.priceToCoordinate(d.p1.price);
                                const y2 = seriesRef.current?.priceToCoordinate(d.p2.price);
                                const y3 = seriesRef.current?.priceToCoordinate(d.p3.price);
                                if (
                                    x1 === null ||
                                    x1 === undefined ||
                                    x2 === null ||
                                    x2 === undefined ||
                                    y1 === null ||
                                    y1 === undefined ||
                                    y2 === null ||
                                    y2 === undefined ||
                                    y3 === null ||
                                    y3 === undefined
                                ) continue;
                                const t = (cx - x1) / (x2 - x1);
                                const yL1 = y1 + t * (y2 - y1);
                                const yL2 = y3;
                                if (cx >= Math.min(x1, x2) && cx <= Math.max(x1, x2) && cy >= Math.min(yL1, yL2) && cy <= Math.max(yL1, yL2)) { found = d.id; break; }
                            }
                        }

                        if (!found) {
                            const cx = e.clientX - rect.left;
                            const cy = e.clientY - rect.top;
                            for (const d of drawings.filter(d => d.type === "regression_trend")) {
                                const x1 = d.p1.logical != null
                                    ? chartRef.current?.timeScale().logicalToCoordinate(d.p1.logical as any)
                                    : chartRef.current?.timeScale().timeToCoordinate(d.p2.time as any);
                                const x2 = d.p2.logical != null
                                    ? chartRef.current?.timeScale().logicalToCoordinate(d.p2.logical as any)
                                    : chartRef.current?.timeScale().timeToCoordinate(d.p2.time as any);
                                const yLo1 = seriesRef.current?.priceToCoordinate(d.r1Price - d.deviation);
                                const yLo2 = seriesRef.current?.priceToCoordinate(d.r2Price - d.deviation);
                                const yHi1 = seriesRef.current?.priceToCoordinate(d.r1Price + d.deviation);
                                const yHi2 = seriesRef.current?.priceToCoordinate(d.r2Price + d.deviation);
                                if (x1 == null || x2 == null || yLo1 == null || yLo2 == null || yHi1 == null || yHi2 == null) continue;
                                const t = (cx - x1) / (x2 - x1);
                                const yLo = yLo1 + t * (yLo2 - yLo1);
                                const yHi = yHi1 + t * (yHi2 - yHi1);
                                if (cx >= Math.min(x1, x2) && cx <= Math.max(x1, x2) && cy >= Math.min(yLo, yHi) && cy <= Math.max(yLo, yHi)) { found = d.id; break; }
                            }
                        }

                        onSelectDrawing(found);
                    }

                }}
                onMouseMove={(e) => handleMouseMove(e)}
            />

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
