import type { IPanePrimitive, IPanePrimitivePaneView, IPrimitivePaneRenderer } from "lightweight-charts";
import type { RectangleDrawing } from "../drawings";
import type React from "react";

class RectangleRenderer implements IPrimitivePaneRenderer {
    private _drawing: RectangleDrawing;
    private _seriesRef: React.RefObject<any>;
    private _chartRef: React.RefObject<any>;
    private _isSelected: boolean;

    constructor(drawing: RectangleDrawing, seriesRef: React.RefObject<any>, chartRef: React.RefObject<any>, isSelected: boolean) {
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
            const y1 = this._seriesRef.current?.priceToCoordinate(this._drawing.p1.price);
            const x2 = this._drawing.p2.logical != null
                ? this._chartRef.current?.timeScale().logicalToCoordinate(this._drawing.p2.logical as any)
                : this._chartRef.current?.timeScale().timeToCoordinate(this._drawing.p2.time as any);
            const y2 = this._seriesRef.current?.priceToCoordinate(this._drawing.p2.price);
            if (
                x1 === null ||
                x1 === undefined ||
                y1 === null ||
                y1 === undefined ||
                x2 === null ||
                x2 === undefined ||
                y2 === null ||
                y2 === undefined
            ) return;
            const x1Px = Math.round(x1 * horizontalPixelRatio);
            const y1Px = Math.round(y1 * verticalPixelRatio);
            const x2Px = Math.round(x2 * horizontalPixelRatio);
            const y2Px = Math.round(y2 * verticalPixelRatio);
            context.globalAlpha = this._drawing.fillOpacity;
            context.fillStyle = this._drawing.color;
            context.fillRect(x1Px, y1Px, x2Px - x1Px, y2Px - y1Px);
            context.globalAlpha = 1;
            context.strokeStyle = this._drawing.color;
            context.lineWidth = (this._isSelected ? 2 : 1) * verticalPixelRatio;
            context.setLineDash(this._isSelected ? [5,3] : []);
            context.strokeRect(x1Px, y1Px, x2Px - x1Px, y2Px - y1Px);

        })
    }
}

class RectanglePaneView implements IPanePrimitivePaneView {
    private _drawing: RectangleDrawing;
    private _seriesRef: React.RefObject<any>;
    private _chartRef: React.RefObject<any>;
    private _isSelected: boolean;

    constructor(drawing: RectangleDrawing, seriesRef: React.RefObject<any>, chartRef: React.RefObject<any>, isSelected: boolean) {
        this._drawing = drawing;
        this._seriesRef = seriesRef;
        this._chartRef = chartRef;
        this._isSelected = isSelected;
    }

    renderer(): IPrimitivePaneRenderer {
        return new RectangleRenderer(this._drawing, this._seriesRef, this._chartRef, this._isSelected);
    }
}

export class RectanglePrimitive implements IPanePrimitive {
    private _drawing: RectangleDrawing;
    private _seriesRef: React.RefObject<any>;
    private _chartRef: React.RefObject<any>;
    private _isSelected: boolean;
    private _requestUpdate?: () => void;

    constructor(drawing: RectangleDrawing, seriesRef: React.RefObject<any>, chartRef: React.RefObject<any>, isSelected: boolean) {
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
        return [new RectanglePaneView(this._drawing, this._seriesRef, this._chartRef, this._isSelected)]
    }

    update(drawing: RectangleDrawing, isSelected: boolean) {
        this._drawing = drawing;
        this._isSelected = isSelected;
        this._requestUpdate?.();
    }
}