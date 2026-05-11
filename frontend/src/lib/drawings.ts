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

export interface HorizontalRayDrawing {
    id: string;
    type: "horizontal_ray";
    p1: DrawingPoint;
    color: string;
    lineWidth: number;
    label?: string;
    lineStyle?: "solid" | "dashed" | "dotted";
}

export interface VerticalLineDrawing {
    id: string;
    type: "vertical_line";
    p1: DrawingPoint;
    color: string;
    lineWidth: number;
    label?: string;
    lineStyle?: "solid" | "dashed" | "dotted";
}

export interface CrossLineDrawing {
    id: string;
    type: "cross_line";
    p1: DrawingPoint;
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
    | HorizontalRayDrawing
    | VerticalLineDrawing
    | CrossLineDrawing
    | TrendLineDrawing
    | RectangleDrawing
    | FibRetracementDrawing;

export type DrawingType = Drawing['type'];
export type DrawingTool = DrawingType | null;
export type DrawingUpdate = 
    | Partial<Omit<HorizontalLineDrawing, 'id' | 'type'>>
    | Partial<Omit<HorizontalRayDrawing, 'id' | 'type'>>
    | Partial<Omit<VerticalLineDrawing, 'id' | 'type'>>
    | Partial<Omit<CrossLineDrawing, 'id' | 'type'>>
    | Partial<Omit<TrendLineDrawing, 'id' | 'type'>>
    | Partial<Omit<RectangleDrawing, 'id' | 'type'>>
    | Partial<Omit<FibRetracementDrawing, 'id' | 'type'>>