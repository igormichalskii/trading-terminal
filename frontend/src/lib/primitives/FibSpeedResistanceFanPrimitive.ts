import type { IPanePrimitive, IPanePrimitivePaneView, IPrimitivePaneRenderer } from "lightweight-charts";
import type { FibSpeedResistanceFanDrawing } from "../drawings";
import type React from "react";
import { lineDashForStyle, rayEndpoint } from "../drawingUtils";

class FibSpeedResistanceFanRenderer implements IPrimitivePaneRenderer {
    private _drawing: FibSpeedResistanceFanDrawing;
    private _seriesRef: React.RefObject<any>;
    private _chartRef: React.RefObject<any>;
    private _isSelected: boolean;

    constructor(drawing: FibSpeedResistanceFanDrawing, seriesRef: React.RefObject<any>, chartRef: React.RefObject<any>, isSelected: boolean) {
        this._drawing = drawing;
        this._seriesRef = seriesRef;
        this._chartRef = chartRef;
        this._isSelected = isSelected;
    }

    draw(target: any): void {
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
            const y1 = this._seriesRef.current?.priceToCoordinate(this._drawing.p1.price);
            const y2 = this._seriesRef.current?.priceToCoordinate(this._drawing.p2.price);
            if (x1 == null || x2 == null || y1 == null || y2 == null) return;
            const x1Px = Math.round(x1 * horizontalPixelRatio);
            const x2Px = Math.round(x2 * horizontalPixelRatio);
            const y1Px = Math.round(y1 * verticalPixelRatio);
            const y2Px = Math.round(y2 * verticalPixelRatio);
            const w = context.canvas.width;
            const h = context.canvas.height;
            const totalRun = x2Px - x1Px;
            const totalRise = y2Px - y1Px;
            context.strokeStyle = this._drawing.color;
            context.lineWidth = (this._isSelected ? this._drawing.lineWidth + 1 : this._drawing.lineWidth) * verticalPixelRatio;
            context.font = `${11 * verticalPixelRatio}px monospace`;
            context.setLineDash(this._isSelected ? [5, 3] : lineDashForStyle(this._drawing.lineStyle));
            context.fillStyle = this._drawing.color;
            for (const l of this._drawing.levels) {
                const dx = totalRun;
                const dy = l * totalRise;
                const [endX, endY] = rayEndpoint(x1Px, y1Px, dx, dy, w, h);
                context.beginPath();
                context.moveTo(x1Px, y1Px);
                context.lineTo(endX, endY);
                context.stroke();
                const labelY = Math.max(12 * verticalPixelRatio, endY - 3 * verticalPixelRatio);
                context.fillText(String(l), endX - 20, labelY);
            }
        })
    }
}

class FibSpeedResistanceFanPaneView implements IPanePrimitivePaneView {
    private _drawing: FibSpeedResistanceFanDrawing;
    private _seriesRef: React.RefObject<any>;
    private _chartRef: React.RefObject<any>;
    private _isSelected: boolean;

    constructor(drawing: FibSpeedResistanceFanDrawing, seriesRef: React.RefObject<any>, chartRef: React.RefObject<any>, isSelected: boolean) {
        this._drawing = drawing;
        this._seriesRef = seriesRef;
        this._chartRef = chartRef;
        this._isSelected = isSelected;
    }

    renderer(): IPrimitivePaneRenderer {
        return new FibSpeedResistanceFanRenderer(this._drawing, this._seriesRef, this._chartRef, this._isSelected);
    }
}

export class FibSpeedResistanceFanPrimitive implements IPanePrimitive {
    private _drawing: FibSpeedResistanceFanDrawing;
    private _seriesRef: React.RefObject<any>;
    private _chartRef: React.RefObject<any>;
    private _isSelected: boolean;
    private _requestUpdate?: () => void;

    constructor(drawing: FibSpeedResistanceFanDrawing, seriesRef: React.RefObject<any>, chartRef: React.RefObject<any>, isSelected: boolean) {
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
        return [new FibSpeedResistanceFanPaneView(this._drawing, this._seriesRef, this._chartRef, this._isSelected)]
    }

    update(drawing: FibSpeedResistanceFanDrawing, isSelected: boolean) {
        this._drawing = drawing;
        this._isSelected = isSelected;
        this._requestUpdate?.();
    }
}