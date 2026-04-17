import { useEffect, useRef } from "react";
import { createChart, CandlestickSeries } from "lightweight-charts";
import { apiFetch } from "../lib/api";

const TIMEFRAMES = ["1D", "1W", "1M", "3M", "1Y", "ALL"];

interface Candle {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

interface Props {
    symbol: string;
    timeframe: string;
    onTimeframeChange: (tf: string) => void;
    onStatsChange: (candle: Candle | null) => void;
}

export default function PriceChart({ symbol, timeframe, onTimeframeChange, onStatsChange}: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
    const seriesRef = useRef<any>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const chart = createChart(containerRef.current, {
            layout: {
                background: { color: "#0f0f0f" },
                textColor: "#9ca3af",
            },
            grid: {
                vertLines: { color: "#1f1f1f" },
                horzLines: { color: "1f1f1f" },
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
        apiFetch<{ candles: Candle[] }>(`/ohlcv/${symbol}?timeframe=${timeframe}`)
        .then(({ candles }) => {
            seriesRef.current!.setData(candles);
            if (candles.length) onStatsChange(candles[candles.length - 1]);
            chartRef.current?.timeScale().fitContent();
        })
        .catch(console.error);
    }, [symbol, timeframe]);

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
            <div ref={containerRef} />
        </div>
    );
}