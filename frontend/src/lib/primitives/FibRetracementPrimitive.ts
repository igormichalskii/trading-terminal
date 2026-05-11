import type { IPanePrimitive, IPanePrimitivePaneView, IPrimitivePaneRenderer } from "lightweight-charts";
import type { FibRetracementDrawing } from "../drawings";
import type React from "react";
import { lineDashForStyle } from "../drawingUtils";

class FibRetracementRenderer implements IPrimitivePaneRenderer {
    private _drawing: FibRetracementDrawing;
    private _seriesRef: React.RefObject<any>;
    private _chartRef: React.RefObject<any>;
    private _isSelected: boolean;

    constructor(drawing: FibRetracementDrawing, seriesRef: React.RefObject<any>, chartRef: React.RefObject<any>, isSelected: boolean) {
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
            if (
                x1 === null ||
                x1 === undefined ||
                x2 === null ||
                x2 === undefined
            ) return;
            const x1Px = Math.round(x1 * horizontalPixelRatio);
            const x2Px = Math.round(x2 * horizontalPixelRatio);
            for (const l of (this._drawing.levels ?? [])) {
                const price = this._drawing.p2.price + (this._drawing.p1.price - this._drawing.p2.price) * l;
                const y = this._seriesRef.current?.priceToCoordinate(price);
                if (
                    y === null ||
                    y === undefined
                ) continue;
                const yPx = Math.round(y * verticalPixelRatio);
                context.strokeStyle = this._drawing.color;
                context.lineWidth = (this._isSelected ? this._drawing.lineWidth + 1 : this._drawing.lineWidth) * verticalPixelRatio;
                context.fillStyle = this._drawing.color;
                context.font = `${11 * verticalPixelRatio}px monospace`;
                context.fillText(`${(l * 100).toFixed(1)}% ${price.toFixed(2)}`, x1Px+ 4 * horizontalPixelRatio, yPx - 3 * verticalPixelRatio);
                context.beginPath();
                context.setLineDash(this._isSelected ? [5,3]: lineDashForStyle(this._drawing.lineStyle));
                context.moveTo(x1Px, yPx);
                context.lineTo(x2Px, yPx);
                context.stroke();
            }
        })
    }
}

class FibPaneView implements IPanePrimitivePaneView {
    private _drawing: FibRetracementDrawing;
    private _seriesRef: React.RefObject<any>;
    private _chartRef: React.RefObject<any>;
    private _isSelected: boolean;

    constructor(drawing: FibRetracementDrawing, seriesRef: React.RefObject<any>, chartRef: React.RefObject<any>, isSelected: boolean) {
        this._drawing = drawing;
        this._seriesRef = seriesRef;
        this._isSelected = isSelected;
        this._chartRef = chartRef;
    }

    renderer(): IPrimitivePaneRenderer {
        return new FibRetracementRenderer(this._drawing, this._seriesRef, this._chartRef, this._isSelected);
    }
}

export class FibRetracementPrimitive implements IPanePrimitive {
    private _drawing: FibRetracementDrawing;
    private _seriesRef: React.RefObject<any>;
    private _chartRef: React.RefObject<any>;
    private _isSelected: boolean;
    private _requestUpdate?: () => void;

    constructor(drawing: FibRetracementDrawing, seriesRef: React.RefObject<any>, chartRef: React.RefObject<any>, isSelected: boolean) {
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
        return [new FibPaneView(this._drawing, this._seriesRef, this._chartRef, this._isSelected)]
    }

    update(drawing: FibRetracementDrawing, isSelected: boolean) {
        this._drawing = drawing;
        this._isSelected = isSelected;
        this._requestUpdate?.();
    }
}