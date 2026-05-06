import type { IChartApi } from "lightweight-charts";
import type { DrawingPoint } from "./drawings";

export const COLOR_PALETTE = [
    "#f59e0b",
    "#3b82f6",
    "#22c55e",
    "#ef4444",
    "#a855f7",
    "#06b6d4",
    "#f97316",
    "#ec4899"
]

export function generateId() {
    return crypto.randomUUID();
}

export function toDrawingPoint(
    x: number,
    y: number,
    chart: IChartApi,
    seriesRef: React.RefObject<any>
): DrawingPoint | null {
    const t = chart.timeScale().coordinateToTime(x);
    const p = seriesRef.current?.coordinateToPrice(y);

    if (t === null || p === null) return null;

    const numericTime = typeof t === "string"
        ? Math.floor(new Date(t + "T00:00:00Z").getTime() / 1000)
        : t as number;

    return { time: numericTime, price: p };
}