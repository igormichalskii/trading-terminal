import type { IPanePrimitive, IPanePrimitivePaneView, IPrimitivePaneRenderer } from "lightweight-charts";
import type { FibTimeZoneDrawing } from "../drawings";
import type React from "react";
import { lineDashForStyle } from "../drawingUtils";

class FibTimeZoneRenderer implements IPrimitivePaneRenderer {
    private _drawing: FibTimeZoneDrawing;
    private _chartRef: React.RefObject<any>;
    private _isSelected: boolean;

    constructor(drawing: FibTimeZoneDrawing, chartRef: React.RefObject<any>, isSelected: boolean) {
        this._drawing = drawing;
        this._chartRef = chartRef;
        this._isSelected = isSelected;
    }

    draw(target: any): void {
        console.log("draw called", this._drawing.p1.logical, this._drawing.p2.logical);
        target.useBitmapCoordinateSpace(({ context, verticalPixelRatio, horizontalPixelRatio }: {
            context: CanvasRenderingContext2D;
            verticalPixelRatio: number;
            horizontalPixelRatio: number;
        }) => {
            const x1 = this._drawing.p1.logical != null
                ? this._chartRef.current?.timeScale().logicalToCoordinate(this._drawing.p1.logical as any)
                : this._chartRef.current?.timeScale().timeToCoordinate(this._drawing.p1.time as any);
            const x2 = this._drawing.p2.logical != null
                ? this._chartRef.current?.timeScale().logicalToCoordinate(this._drawing.p2.logical as any)
                : this._chartRef.current?.timeScale().timeToCoordinate(this._drawing.p2.time as any);
            if (x1 == null || x2 == null) return;
            const p1 = this._chartRef.current?.timeScale().coordinateToLogical(x1);
            const p2 = this._chartRef.current?.timeScale().coordinateToLogical(x2);
            if (
                p1 == null ||
                p2 == null
            ) return;
            const n = p2 - p1;
            context.strokeStyle = this._drawing.color;
            context.lineWidth = (this._isSelected ? this._drawing.lineWidth + 1 : this._drawing.lineWidth) * verticalPixelRatio;
            context.fillStyle = this._drawing.color;
            context.font = `${11 * verticalPixelRatio}px monospace`;
            context.setLineDash(this._isSelected ? [5, 3] : lineDashForStyle(this._drawing.lineStyle));
            for (const l of this._drawing.levels) {
                const targetLogical = p1 + l * n
                const x = this._chartRef.current?.timeScale().logicalToCoordinate(targetLogical);
                if (x == null) continue;
                const xPx = Math.round(x * horizontalPixelRatio);
                context.beginPath();
                context.moveTo(xPx, 0);
                context.lineTo(xPx, context.canvas.height);
                context.stroke();
                context.fillText(String(l), xPx + 3, 14 * verticalPixelRatio);

            }
        })
    }
}

class FibTimeZonePaneView implements IPanePrimitivePaneView {
    private _drawing: FibTimeZoneDrawing;
    private _seriesRef: React.RefObject<any>;
    private _chartRef: React.RefObject<any>;
    private _isSelected: boolean;

    constructor(drawing: FibTimeZoneDrawing, seriesRef: React.RefObject<any>, chartRef: React.RefObject<any>, isSelected: boolean) {
        this._drawing = drawing;
        this._seriesRef = seriesRef;
        this._chartRef = chartRef;
        this._isSelected = isSelected;
    }

    renderer(): IPrimitivePaneRenderer {
        return new FibTimeZoneRenderer(this._drawing, this._chartRef, this._isSelected);
    }
}

export class FibTimeZonePrimitive implements IPanePrimitive {
    private _drawing: FibTimeZoneDrawing;
    private _seriesRef: React.RefObject<any>;
    private _chartRef: React.RefObject<any>;
    private _isSelected: boolean;
    private _requestUpdate?: () => void;

    constructor(drawing: FibTimeZoneDrawing, seriesRef: React.RefObject<any>, chartRef: React.RefObject<any>, isSelected: boolean) {
        this._drawing = drawing;
        this._seriesRef = seriesRef;
        this._chartRef = chartRef;
        this._isSelected = isSelected;
    }

    attached({ requestUpdate }: { requestUpdate: () => void }): void {
        this._requestUpdate = requestUpdate;
        requestUpdate();
    }

    paneViews() {
        return [new FibTimeZonePaneView(this._drawing, this._seriesRef, this._chartRef, this._isSelected)]
    }

    update(drawing: FibTimeZoneDrawing, isSelected: boolean) {
        this._drawing = drawing;
        this._isSelected = isSelected;
        this._requestUpdate?.();
    }
}