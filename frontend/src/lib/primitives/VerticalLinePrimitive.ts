import type { IPanePrimitive, IPanePrimitivePaneView, IPrimitivePaneRenderer } from "lightweight-charts";
import type { VerticalLineDrawing } from "../drawings";
import type React from "react";
import { lineDashForStyle } from "../drawingUtils";

class VerticalLineRenderer implements IPrimitivePaneRenderer {
    private _drawing: VerticalLineDrawing;
    private _chartRef: React.RefObject<any>;
    private _isSelected: boolean;

    constructor(drawing: VerticalLineDrawing, chartRef: React.RefObject<any>, isSelected: boolean) {
        this._drawing = drawing;
        this._chartRef = chartRef;
        this._isSelected = isSelected;
    }

    draw(target: any): void {
        target.useBitmapCoordinateSpace(({ context, bitmapSize, verticalPixelRatio, horizontalPixelRatio } : {
            context: CanvasRenderingContext2D;
            bitmapSize: { width: number; height: number };
            verticalPixelRatio: number;
            horizontalPixelRatio: number;
        }) => {
            const x = this._drawing.p1.logical != null
                ? this._chartRef.current?.timeScale().logicalToCoordinate(this._drawing.p1.logical as any)
                : this._chartRef.current?.timeScale().timeToCoordinate(this._drawing.p1.time as any);
            if (
                x === null || 
                x === undefined
            ) return;
            const xPx = Math.round(x * horizontalPixelRatio);
            context.strokeStyle = this._drawing.color;
            context.lineWidth = (this._isSelected ? this._drawing.lineWidth + 1 : this._drawing.lineWidth) * verticalPixelRatio;
            context.fillStyle = this._drawing.color;
            context.font = `${11 * verticalPixelRatio}px monospace`;
            context.beginPath();
            context.setLineDash(this._isSelected ? [5,3] : lineDashForStyle(this._drawing.lineStyle));
            context.moveTo(xPx, 0);
            context.lineTo(xPx, bitmapSize.height);
            context.stroke();
            if (this._drawing.label) {
                context.save()
                context.translate(xPx, bitmapSize.height * 0.1);
                context.rotate(-Math.PI / 2);
                context.fillText(this._drawing.label, 0, -4 * horizontalPixelRatio);
                context.restore();
            }
        })
    }
}

class VerticalLinePaneView implements IPanePrimitivePaneView {
    private _drawing: VerticalLineDrawing;
    private _chartRef: React.RefObject<any>;
    private _isSelected: boolean;

    constructor(drawing: VerticalLineDrawing, chartRef: React.RefObject<any>, isSelected: boolean) {
        this._drawing = drawing;
        this._chartRef = chartRef;
        this._isSelected = isSelected;
    }

    renderer(): IPrimitivePaneRenderer {
        return new VerticalLineRenderer(this._drawing, this._chartRef, this._isSelected);
    }
}

export class VerticalLinePrimitive implements IPanePrimitive {
    private _drawing: VerticalLineDrawing;
    private _chartRef: React.RefObject<any>;
    private _isSelected: boolean;
    private _requestUpdate?: () => void;

    constructor(drawing: VerticalLineDrawing, chartRef: React.RefObject<any>, isSelected: boolean) {
        this._drawing = drawing;
        this._chartRef = chartRef;
        this._isSelected = isSelected;
    }

    attached({ requestUpdate }: { requestUpdate: () => void }): void {
        this._requestUpdate = requestUpdate;
        requestUpdate();
    }

    paneViews() {
        return [new VerticalLinePaneView(this._drawing, this._chartRef, this._isSelected)]
    }

    update(drawing: VerticalLineDrawing, isSelected: boolean) {
        this._drawing = drawing;
        this._isSelected = isSelected;
        this._requestUpdate?.()
    }
}