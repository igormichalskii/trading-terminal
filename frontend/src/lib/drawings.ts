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

export interface PitchforkDrawing {
    id: string;
    type: "pitchfork";
    p1: DrawingPoint;
    p2: DrawingPoint;
    p3: DrawingPoint;
    color: string;
    lineWidth: number;
    lineStyle?: "solid" | "dashed" | "dotted";
    label?: string;
}

export interface SchiffPitchforkDrawing {
    id: string;
    type: "schiff_pitchfork";
    p1: DrawingPoint;
    p2: DrawingPoint;
    p3: DrawingPoint;
    color: string;
    lineWidth: number;
    lineStyle?: "solid" | "dashed" | "dotted";
    label?: string;
}

export interface ModifiedSchiffPitchforkDrawing {
    id: string;
    type: "modified_schiff_pitchfork";
    p1: DrawingPoint;
    p2: DrawingPoint;
    p3: DrawingPoint;
    color: string;
    lineWidth: number;
    lineStyle?: "solid" | "dashed" | "dotted";
    label?: string;
}

export interface InsidePitchforkDrawing {
    id: string;
    type: "inside_pitchfork";
    p1: DrawingPoint;
    p2: DrawingPoint;
    p3: DrawingPoint;
    color: string;
    lineWidth: number;
    lineStyle?: "solid" | "dashed" | "dotted";
    label?: string;
}

export interface FibTimeZoneDrawing {
    id: string;
    type: "fib_time_zone";
    p1: DrawingPoint;
    p2: DrawingPoint;
    color: string;
    lineWidth: number;
    lineStyle?: "solid" | "dashed" | "dotted";
    label?: string;
    levels: number[];
}

export interface TrendBasedFibExtensionDrawing {
    id: string;
    type: "trend_based_fib_extension";
    p1: DrawingPoint;
    p2: DrawingPoint;
    p3: DrawingPoint;
    color: string;
    lineWidth: number;
    lineStyle?: "solid" | "dashed" | "dotted";
    label?: string;
    levels: number[];
}

export interface FibChannelDrawing {
    id: string;
    type: "fib_channel";
    p1: DrawingPoint;
    p2: DrawingPoint;
    p3: DrawingPoint;
    color: string;
    lineWidth: number;
    lineStyle?: "solid" | "dashed" | "dotted";
    label?: string;
    levels: number[];
}

export interface FibSpeedResistanceFanDrawing {
    id: string;
    type: "fib_speed_resistance_fan";
    p1: DrawingPoint;
    p2: DrawingPoint;
    color: string;
    lineWidth: number;
    lineStyle?: "solid" | "dashed" | "dotted";
    label?: string;
    levels: number[];
}

export interface TrendBasedFibTimeDrawing {
    id: string;
    type: "trend_based_fib_time";
    p1: DrawingPoint;
    p2: DrawingPoint;
    p3: DrawingPoint;
    color: string;
    lineWidth: number;
    lineStyle?: "solid" | "dashed" | "dotted";
    label?: string;
    levels: number[];
}

export interface PitchfanDrawing {
    id: string;
    type: "pitchfan";
    p1: DrawingPoint;
    p2: DrawingPoint;
    p3: DrawingPoint;
    color: string;
    lineWidth: number;
    lineStyle?: "solid" | "dashed" | "dotted";
    label?: string;
    levels: number[];
}

export interface FibCirclesDrawing {
    id: string;
    type: "fib_circles";
    p1: DrawingPoint;
    p2: DrawingPoint;
    color: string;
    lineWidth: number;
    lineStyle?: "solid" | "dashed" | "dotted";
    label?: string;
    levels: number[];
}

export interface FibSpeedResistanceArcsDrawing {
    id: string;
    type: "fib_speed_resistance_arcs";
    p1: DrawingPoint;
    p2: DrawingPoint;
    color: string;
    lineWidth: number;
    lineStyle?: "solid" | "dashed" | "dotted";
    label?: string;
    levels: number[];
}

export interface FibWedgeDrawing {
    id: string;
    type: "fib_wedge";
    p1: DrawingPoint;
    p2: DrawingPoint;
    color: string;
    lineWidth: number;
    lineStyle?: "solid" | "dashed" | "dotted";
    label?: string;
    levels: number[];
}

export interface FibSpiralDrawing {
    id: string;
    type: "fib_spiral";
    p1: DrawingPoint;
    p2: DrawingPoint;
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
    | RegressionTrendDrawing
    | PitchforkDrawing
    | SchiffPitchforkDrawing
    | ModifiedSchiffPitchforkDrawing
    | InsidePitchforkDrawing
    | FibTimeZoneDrawing
    | TrendBasedFibExtensionDrawing
    | FibChannelDrawing
    | FibSpeedResistanceFanDrawing
    | TrendBasedFibTimeDrawing
    | PitchfanDrawing
    | FibCirclesDrawing
    | FibSpeedResistanceArcsDrawing
    | FibWedgeDrawing
    | FibSpiralDrawing;

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
    | Partial<Omit<RegressionTrendDrawing, 'id' | 'type'>>
    | Partial<Omit<PitchforkDrawing, 'id' | 'type'>>
    | Partial<Omit<SchiffPitchforkDrawing, 'id' | 'type'>>
    | Partial<Omit<ModifiedSchiffPitchforkDrawing, 'id' | 'type'>>
    | Partial<Omit<InsidePitchforkDrawing, 'id' | 'type'>>
    | Partial<Omit<FibTimeZoneDrawing, 'id' | 'type'>>
    | Partial<Omit<TrendBasedFibExtensionDrawing, 'id' | 'type'>>
    | Partial<Omit<FibChannelDrawing, 'id' | 'type'>>
    | Partial<Omit<FibSpeedResistanceFanDrawing, 'id' | 'type'>>
    | Partial<Omit<TrendBasedFibTimeDrawing, 'id' | 'type'>>
    | Partial<Omit<PitchfanDrawing, 'id' | 'type'>>
    | Partial<Omit<FibCirclesDrawing, 'id' | 'type'>>
    | Partial<Omit<FibSpeedResistanceArcsDrawing, 'id' | 'type'>>
    | Partial<Omit<FibWedgeDrawing, 'id' | 'type'>>
    | Partial<Omit<FibSpiralDrawing, 'id' | 'type'>>;