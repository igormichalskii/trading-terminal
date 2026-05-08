export interface DrawingPoint {
    time: number;
    price: number;
    logical?: number;
}

export interface HorizontalLineDrawing {
    id: string;
    type: "horizontal_line";
    price: number;
    color: string;
    lineWidth: number;
}

export interface TrendLineDrawing {
    id: string;
    type: "trend_line";
    p1: DrawingPoint;
    p2: DrawingPoint;
    color: string;
    lineWidth: number;
}

export interface RectangleDrawing {
    id: string;
    type: "rectangle";
    p1: DrawingPoint;
    p2: DrawingPoint;
    color: string;
    fillOpacity: number;
}

export interface FibRetracementDrawing {
    id: string;
    type: "fib_retracement";
    p1: DrawingPoint;
    p2: DrawingPoint;
    color: string;
    levels: number[];
}

export type Drawing =
    | HorizontalLineDrawing
    | TrendLineDrawing
    | RectangleDrawing
    | FibRetracementDrawing;

export type DrawingType = Drawing['type'];
export type DrawingTool = DrawingType | null;