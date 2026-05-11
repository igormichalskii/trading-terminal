import type { IPanePrimitive, IPanePrimitivePaneView, IPrimitivePaneRenderer } from "lightweight-charts";
import type { HorizontalRayDrawing } from "../drawings";
import type React from "react";
import { lineDashForStyle } from "../drawingUtils";

class HorizontalRayRenderer implements IPrimitivePaneRenderer {
    private _drawing: HorizontalRayDrawing;
    private _seriesRef: React.RefObject<any>;
    private _chartRef: React.RefObject<any>;
    private _isSelected: boolean;

    constructor(drawing: HorizontalRayDrawing, seriesRef: React.RefObject<any>, chartRef: React.RefObject<any>, isSelected: boolean) {
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
            const y = this._seriesRef.current?.priceToCoordinate(this._drawing.p1.price);
            const x = this._drawing.p1.logical != null
                ? this._chartRef.current?.timeScale().logicalToCoordinate(this._drawing.p1.logical as any)
                : this._chartRef.current?.timeScale().timeToCoordinate(this._drawing.p1.time as any);
            if ( 
                y === null || 
                y === undefined ||
                x === null ||
                x === undefined
            ) return;
            const yPx = Math.round(y * verticalPixelRatio);
            const xPx = Math.round(x * horizontalPixelRatio);
            context.strokeStyle = this._drawing.color;
            context.lineWidth = (this._isSelected ? this._drawing.lineWidth + 1 : this._drawing.lineWidth) * verticalPixelRatio;
            context.fillStyle = this._drawing.color;
            context.font = `${11 * verticalPixelRatio}px monospace`;
            context.beginPath();
            context.setLineDash(this._isSelected ? [5,3] : lineDashForStyle(this._drawing.lineStyle));
            context.moveTo(xPx, yPx);
            context.lineTo(bitmapSize.width, yPx);
            context.stroke();
            if (this._drawing.label) {
                context.textAlign = "left";
                context.fillText(this._drawing.label, xPx + 4 * horizontalPixelRatio, yPx - 4 * verticalPixelRatio);
                context.textAlign = "right";
            }
        })
    }
}

class HorizontalRayPaneView implements IPanePrimitivePaneView {
    private _drawing: HorizontalRayDrawing;
    private _seriesRef: React.RefObject<any>;
    private _chartRef: React.RefObject<any>;
    private _isSelected: boolean;

    constructor(drawing: HorizontalRayDrawing, seriesRef: React.RefObject<any>, chartRef: React.RefObject<any>, isSelected: boolean) {
        this._drawing = drawing;
        this._seriesRef = seriesRef;
        this._chartRef = chartRef;
        this._isSelected = isSelected;
    }

    renderer(): IPrimitivePaneRenderer {
        return new HorizontalRayRenderer(this._drawing, this._seriesRef, this._chartRef, this._isSelected);
    }
}

export class HorizontalRayPrimitive implements IPanePrimitive {
    private _drawing: HorizontalRayDrawing;
    private _seriesRef: React.RefObject<any>;
    private _chartRef: React.RefObject<any>;
    private _isSelected: boolean;
    private _requestUpdate?: () => void;

    constructor(drawing: HorizontalRayDrawing, seriesRef: React.RefObject<any>, chartRef: React.RefObject<any>, isSelected: boolean) {
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
        return [new HorizontalRayPaneView(this._drawing, this._seriesRef, this._chartRef, this._isSelected)]
    }

    update(drawing: HorizontalRayDrawing, isSelected: boolean) {
        this._drawing = drawing;
        this._isSelected = isSelected;
        this._requestUpdate?.()
    }
}