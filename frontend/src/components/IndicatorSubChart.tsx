import { useEffect, useRef } from "react";
import { createChart, LineSeries, HistogramSeries } from "lightweight-charts";

interface Point {
    time: string | number;
    value: number;
}

export interface SubChartSeries {
    data: Point[];
    color: string;
    type?: "line" | "histogram";
}

interface Props {
    label: string;
    series: SubChartSeries[];
    // Horizontal reference lines (e.g. 70/30 for RSI)
    refLines?: { value: number; color: string }[];
}

export default function IndicatorSubChart({ label, series, refLines }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current || !series.length) return;

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
            height: 120,
            rightPriceScale: { borderColor: "#2a2a2a" },
            timeScale: { borderColor: "#2a2a2a", visible: false },
        });

        for (const s of series) {
            if (s.type === "histogram") {
                const hist = chart.addSeries(HistogramSeries, {
                    color: s.color,
                    priceLineVisible: false,
                    lastValueVisible: false,
                });
                const colored = s.data.map((p) => ({
                    ...p,
                    color: p.value >= 0 ? "#22c55e" : "#ef4444",
                }));
                hist.setData(colored as any);
            } else {
                const line = chart.addSeries(LineSeries, {
                    color: s.color,
                    lineWidth: 1,
                    priceLineVisible: false,
                    lastValueVisible: false,
                    crosshairMarkerVisible: false,
                });
                line.setData(s.data as any);
            }
        }

        // Reference lines via overlay series with constant values
        if (refLines?.length && series[0]?.data.length) {
            for (const ref of refLines) {
                const times = series[0].data.map((p) => p.time);
                const refData = times.map((t) => ({ time: t, value: ref.value }));
                const s = chart.addSeries(LineSeries, {
                    color: ref.color,
                    lineWidth: 1,
                    lineStyle: 1, // dashed
                    priceLineVisible: false,
                    lastValueVisible: false,
                    crosshairMarkerVisible: false,
                });
                s.setData(refData as any);
            }
        }

        chart.timeScale().fitContent();

        const ro = new ResizeObserver(() => {
            chart.applyOptions({ width: containerRef.current!.clientWidth });
        });
        ro.observe(containerRef.current);

        return () => {
            ro.disconnect();
            chart.remove();
        };
    }, [series]);

    return (
        <div className="mt-2">
            <div className="text-xs text-gray-500 mb-1 px-1">{label}</div>
            <div ref={containerRef} />
        </div>
    );
}
