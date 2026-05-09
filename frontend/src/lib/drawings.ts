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
    label?: string;
    lineStyle?: "solid" | "dashed" | "dotted";
}

export interface TrendLineDrawing {
    id: string;
    type: "trend_line";
    p1: DrawingPoint;
    p2: DrawingPoint;
    color: string;
    lineWidth: number;
    label?: string;
    lineStyle?: "solid" | "dashed" | "dotted";
}

export interface RectangleDrawing {
    id: string;
    type: "rectangle";
    p1: DrawingPoint;
    p2: DrawingPoint;
    color: string;
    fillOpacity: number;
    lineStyle?: "solid" | "dashed" | "dotted";
    label?: string;
    lineWidth: number;
}

export interface FibRetracementDrawing {
    id: string;
    type: "fib_retracement";
    p1: DrawingPoint;
    p2: DrawingPoint;
    color: string;
    levels: number[];
    lineStyle?: "solid" | "dashed" | "dotted";
    label?: string;
    lineWidth: number;
}

export type Drawing =
    | HorizontalLineDrawing
    | TrendLineDrawing
    | RectangleDrawing
    | FibRetracementDrawing;

export type DrawingType = Drawing['type'];
export type DrawingTool = DrawingType | null;
export type DrawingUpdate = 
    | Partial<Omit<HorizontalLineDrawing, 'id' | 'type'>>
    | Partial<Omit<TrendLineDrawing, 'id' | 'type'>>
    | Partial<Omit<RectangleDrawing, 'id' | 'type'>>
    | Partial<Omit<FibRetracementDrawing, 'id' | 'type'>>