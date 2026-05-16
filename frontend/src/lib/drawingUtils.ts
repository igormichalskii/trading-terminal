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
    "#ec4899",
    "#14b8a6",
    "#8b5cf6",
    "#f43f5e",
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
    if (t === null) {
        const logical = chart.timeScale().coordinateToLogical(x);
        if (logical === null || logical === undefined) return null;
        const p = seriesRef.current?.coordinateToPrice(y);
        if (p === null || p === undefined) return null;

        const floorLogical = Math.floor(logical as number);
        const lastBarTime = seriesRef.current?.dataByIndex(floorLogical)?.time;
        const prevBarTime = seriesRef.current?.dataByIndex(floorLogical - 1)?.time;
        if(lastBarTime === null || prevBarTime === null) return null;

        const toUnix = (t: any) => typeof t === "string"
            ? Math.floor(new Date(t + "T00:00:00Z").getTime() / 1000)
            : t as number;

        const lastUnix = toUnix(lastBarTime);
        const prevUnix = toUnix(prevBarTime);
        const barDuration = lastUnix - prevUnix;
        const numericTime = lastUnix + Math.round((logical as number - floorLogical) * barDuration);
        return { time: numericTime, price: p, logical: logical != null ? logical as number : undefined };
    }
    const p = seriesRef.current?.coordinateToPrice(y);

    if (p === null) return null;

    const numericTime = typeof t === "string"
        ? Math.floor(new Date(t + "T00:00:00Z").getTime() / 1000)
        : t as number;

    return { time: numericTime, price: p};
}

export function lineDashForStyle(style?: string) {
    if (!style) return [];
    return ({
        "solid": [],
        "dashed": [6, 4],
        "dotted": [2, 3],
    })[style] ?? [];
}

export function rayEndpoint(sx: number, sy: number, dx: number, dy: number, w: number, h: number) {
    let t = Infinity;
    if (dx > 0) {
        t = Math.min(t, (w - sx) / dx);
    } else if (dx < 0) {
        t = Math.min(t, (0 - sx) / dx);
    }

    if (dy > 0) {
        t = Math.min(t, (h - sy) / dy);
    } else if (dy < 0) {
        t = Math.min(t, (0 - sy) / dy);
    }

    return [sx + t * dx, sy + t * dy];
}