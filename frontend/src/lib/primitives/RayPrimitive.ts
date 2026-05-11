import type { IPanePrimitive, IPanePrimitivePaneView, IPrimitivePaneRenderer } from "lightweight-charts";
import type { RayDrawing } from "../drawings";
import type React from "react";
import { lineDashForStyle } from "../drawingUtils";

class RayRenderer implements IPrimitivePaneRenderer {
    private _drawing: RayDrawing;
    private _seriesRef: React.RefObject<any>;
    private _chartRef: React.RefObject<any>;
    private _isSelected: boolean;

    constructor(drawing: RayDrawing, seriesRef: React.RefObject<any>, chartRef: React.RefObject<any>, isSelected: boolean) {
        this._drawing = drawing;
        this._seriesRef = seriesRef;
        this._chartRef = chartRef;
        this._isSelected = isSelected;
    }

    draw(target: any): void {
        target.useBitmapCoordinateSpace(({ context, bitmapSize, verticalPixelRatio, horizontalPixelRatio }: {
            context: CanvasRenderingContext2D;
            bitmapSize: { width: number; height: number };
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
            if (
                x1 === null ||
                x1 === undefined ||
                x2 === null ||
                x2 === undefined ||
                y1 === null ||
                y1 === undefined ||
                y2 === null ||
                y2 === undefined
            ) return;
            const x1Px = Math.round(x1 * horizontalPixelRatio);
            const x2Px = Math.round(x2 * horizontalPixelRatio);
            const y1Px = Math.round(y1 * verticalPixelRatio);
            const y2Px = Math.round(y2 * verticalPixelRatio);
            const slope = (y2 - y1) / (x2 - x1);
            const yAtEdge = y1Px + slope * (bitmapSize.width - x1Px);
            context.strokeStyle = this._drawing.color;
            context.lineWidth = (this._isSelected ? this._drawing.lineWidth + 1 : this._drawing.lineWidth) * verticalPixelRatio;
            context.fillStyle = this._drawing.color;
            context.font = `${11 * verticalPixelRatio}px monospace`;
            context.beginPath();
            context.setLineDash(this._isSelected ? [5, 3] : lineDashForStyle(this._drawing.lineStyle));
            context.moveTo(x1Px, y1Px);
            context.lineTo(bitmapSize.width, yAtEdge);
            context.stroke();
            if (this._drawing.label) {
                context.save()
                context.translate((x1Px + x2Px) / 2, (y1Px + y2Px) / 2);
                context.rotate(Math.atan2(y2 - y1, x2 - x1));
                context.fillText(this._drawing.label, 0, -4 * verticalPixelRatio);
                context.restore();
            }
        })
    }
}
class RayPaneView implements IPanePrimitivePaneView {
    private _drawing: RayDrawing;
    private _seriesRef: React.RefObject<any>;
    private _chartRef: React.RefObject<any>;
    private _isSelected: boolean;

    constructor(drawing: RayDrawing, seriesRef: React.RefObject<any>, chartRef: React.RefObject<any>, isSelected: boolean) {
        this._drawing = drawing;
        this._seriesRef = seriesRef;
        this._chartRef = chartRef;
        this._isSelected = isSelected;
    }

    renderer(): IPrimitivePaneRenderer {
        return new RayRenderer(this._drawing, this._seriesRef, this._chartRef, this._isSelected);
    }
}

export class RayPrimitive implements IPanePrimitive {
    private _drawing: RayDrawing;
    private _seriesRef: React.RefObject<any>;
    private _chartRef: React.RefObject<any>;
    private _isSelected: boolean;
    private _requestUpdate?: () => void;

    constructor(drawing: RayDrawing, seriesRef: React.RefObject<any>, chartRef: React.RefObject<any>, isSelected: boolean) {
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
        return [new RayPaneView(this._drawing, this._seriesRef, this._chartRef, this._isSelected)]
    }

    update(drawing: RayDrawing, isSelected: boolean) {
        this._drawing = drawing;
        this._isSelected = isSelected;
        this._requestUpdate?.();
    }
}