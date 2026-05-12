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

export interface RayDrawing {
    id: string;
    type: "ray";
    p1: DrawingPoint;
    p2: DrawingPoint;
    color: string;
    lineWidth: number;
    lineStyle?: "solid" | "dashed" | "dotted";
    label?: string;
}

export interface InfoLineDrawing {
    id: string;
    type: "info_line";
    p1: DrawingPoint;
    p2: DrawingPoint;
    color: string;
    lineWidth: number;
    lineStyle?: "solid" | "dashed" | "dotted";
    label?: string;
}

export interface ExtendedLineDrawing {
    id: string;
    type: "extended_line";
    p1: DrawingPoint;
    p2: DrawingPoint;
    color: string;
    lineWidth: number;
    lineStyle?: "solid" | "dashed" | "dotted";
    label?: string;
}

export interface TrendAngleDrawing {
    id: string;
    type: "trend_angle";
    p1: DrawingPoint;
    p2: DrawingPoint;
    color: string;
    lineWidth: number;
    lineStyle?: "solid" | "dashed" | "dotted";
    label?: string;
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

export interface ParallelChannelDrawing {
    id: string;
    type: "parallel_channel";
    p1: DrawingPoint;
    p2: DrawingPoint;
    p3: DrawingPoint;
    color: string;
    lineWidth: number;
    lineStyle?: "solid" | "dashed" | "dotted";
    label?: string;
}

export interface DisjointChannelDrawing {
    id: string;
    type: "disjoint_channel";
    p1: DrawingPoint;
    p2: DrawingPoint;
    p3: DrawingPoint;
    color: string;
    lineWidth: number;
    lineStyle?: "solid" | "dashed" | "dotted";
    label?: string;
}

export interface FlatTopBottomDrawing {
    id: string;
    type: "flat_top_bottom";
    p1: DrawingPoint;
    p2: DrawingPoint;
    p3: DrawingPoint;
    color: string;
    lineWidth: number;
    lineStyle?: "solid" | "dashed" | "dotted";
    label?: string;
}

export interface RegressionTrendDrawing {
    id: string;
    type: "regression_trend";
    p1: DrawingPoint;
    p2: DrawingPoint;
    r1Price: number;
    r2Price: number;
    deviation: number;
    color: string;
    lineWidth: number;
    lineStyle?: "solid" | "dashed" | "dotted";
    label?: string;
}

export type Drawing =
    | HorizontalLineDrawing
    | HorizontalRayDrawing
    | VerticalLineDrawing
    | CrossLineDrawing
    | TrendLineDrawing
    | RectangleDrawing
    | FibRetracementDrawing
    | RayDrawing
    | ExtendedLineDrawing
    | InfoLineDrawing
    | TrendAngleDrawing
    | ParallelChannelDrawing
    | DisjointChannelDrawing
    | FlatTopBottomDrawing
    | RegressionTrendDrawing;

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
    | Partial<Omit<RayDrawing, 'id' | 'type'>>
    | Partial<Omit<ExtendedLineDrawing, 'id' | 'type'>>
    | Partial<Omit<InfoLineDrawing, 'id' | 'type'>>
    | Partial<Omit<TrendAngleDrawing, 'id' | 'type'>>
    | Partial<Omit<ParallelChannelDrawing, 'id' | 'type'>>
    | Partial<Omit<DisjointChannelDrawing, 'id' | 'type'>>
    | Partial<Omit<FlatTopBottomDrawing, 'id' | 'type'>>
    | Partial<Omit<RegressionTrendDrawing, 'id' | 'type'>>;