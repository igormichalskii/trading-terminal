import { useEffect, useRef, useState } from "react";
import { createChart, CandlestickSeries, LineSeries } from "lightweight-charts";
import { apiFetch } from "../lib/api";

const TIMEFRAMES = ["1D", "1W", "1M", "3M", "1Y", "ALL"];

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
    overlays: OverlayData;
    limitParam: string;
    onTimeframeChange: (tf: string) => void;
    onStatsChange: (candle: Candle | null) => void;
}

const OVERLAY_SERIES = [
    { key: "sma",  color: "#f59e0b" },
    { key: "ema",  color: "#3b82f6" },
    { key: "vwap", color: "#a855f7" },
];

const BB_COLORS = { upper: "#6b7280", middle: "#6b7280", lower: "#6b7280" };

const ICHIMOKU_COLORS = {
    tenkan:   "#ef4444",
    kijun:    "#3b82f6",
    senkou_a: "#22c55e",
    senkou_b: "#ef4444",
    chikou:   "#f59e0b",
};

export default function PriceChart({ symbol, timeframe, overlays, limitParam, onTimeframeChange, onStatsChange }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
    const seriesRef = useRef<any>(null);
    const overlaySeriesRef = useRef<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const chart = createChart(containerRef.current, {
            layout: {
                background: { color: "#0f0f0f" },
                textColor: "#9ca3af",
            },
            grid: {
                vertLines: { color: "#1f1f1f" },
                horzLines: { color: "#1f1f1f" },
            },
            width: containerRef.current.clientWidth,
            height: 420,
        });

        const series = chart.addSeries(CandlestickSeries, {
            upColor: "#22c55e",
            downColor: "#ef4444",
            borderVisible: false,
            wickUpColor: "#22c55e",
            wickDownColor: "#ef4444",
        });

        chartRef.current = chart;
        seriesRef.current = series;

        const ro = new ResizeObserver(() => {
            chart.applyOptions({ width: containerRef.current!.clientWidth });
        });
        ro.observe(containerRef.current);

        return () => {
            ro.disconnect();
            chart.remove();
        };
    }, []);

    useEffect(() => {
        if (!seriesRef.current) return;
        setLoading(true);
        setError(null);
        apiFetch<{ candles: Candle[] }>(`/ohlcv/${symbol}?timeframe=${timeframe}${limitParam}`)
            .then(({ candles }) => {
                seriesRef.current!.setData(candles);
                if (candles.length) onStatsChange(candles[candles.length - 1]);
                chartRef.current?.timeScale().fitContent();
            })
            .catch((err) => {
                const msg = err?.message ?? "Failed to load data";
                setError(msg.includes("404") ? `No data found for "${symbol}"` : "Failed to load chart data");
                onStatsChange(null);
            })
            .finally(() => setLoading(false));
    }, [symbol, timeframe, limitParam]);

    useEffect(() => {
        const chart = chartRef.current;
        if (!chart) return;

        for (const s of overlaySeriesRef.current) {
            try { chart.removeSeries(s); } catch {}
        }
        overlaySeriesRef.current = [];

        const addLine = (data: Point[], color: string, dashed = false) => {
            if (!data?.length) return;
            const s = chart.addSeries(LineSeries, {
                color,
                lineWidth: 1,
                lineStyle: dashed ? 1 : 0,
                priceLineVisible: false,
                lastValueVisible: false,
                crosshairMarkerVisible: false,
            });
            s.setData(data as any);
            overlaySeriesRef.current.push(s);
        };

        for (const { key, color } of OVERLAY_SERIES) {
            const data = (overlays as any)[key];
            if (data) addLine(data, color);
        }

        if (overlays.bb) {
            addLine(overlays.bb.upper, BB_COLORS.upper, true);
            addLine(overlays.bb.middle, BB_COLORS.middle);
            addLine(overlays.bb.lower, BB_COLORS.lower, true);
        }

        if (overlays.ichimoku) {
            for (const [key, color] of Object.entries(ICHIMOKU_COLORS)) {
                addLine((overlays.ichimoku as any)[key], color);
            }
        }
    }, [overlays]);

    return (
        <div>
            <div className="flex gap-1 mb-2">
                {TIMEFRAMES.map((tf) => (
                    <button
                        key={tf}
                        onClick={() => onTimeframeChange(tf)}
                        className={`px-3 py-1 text-xs rounded cursor-pointer transition-colors ${
                            tf === timeframe
                                ? "bg-white text-black"
                                : "text-gray-400 hover:text-white"
                        }`}
                    >
                        {tf}
                    </button>
                ))}
            </div>

            <div className="relative">
                <div ref={containerRef} />
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#0f0f0f]/70 rounded">
                        <div className="w-6 h-6 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
                    </div>
                )}
                {!loading && error && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-sm text-red-400">{error}</p>
                    </div>
                )}
            </div>
        </div>
    );
}