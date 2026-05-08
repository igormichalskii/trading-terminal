import type { IPanePrimitive, IPanePrimitivePaneView, IPrimitivePaneRenderer } from "lightweight-charts";
import type { FibRetracementDrawing } from "../drawings";
import type React from "react";

class FibRetracementRenderer implements IPrimitivePaneRenderer {
    private _drawing: FibRetracementDrawing;
    private _seriesRef: React.RefObject<any>;
    private _isSelected: boolean;

    constructor(drawing: FibRetracementDrawing, seriesRef: React.RefObject<any>, isSelected: boolean) {
        this._drawing = drawing;
        this._seriesRef = seriesRef;
        this._isSelected = isSelected;
    }

    draw(target: any): void {
        target.useBitmapCoordinateSpace(({ context, bitmapSize, verticalPixelRatio, horizontalPixelRatio } : {
            context: CanvasRenderingContext2D;
            bitmapSize: { width: number; height: number };
            verticalPixelRatio: number;
            horizontalPixelRatio: number;
        }) => {
            for (const l of this._drawing.levels) {
                const price = this._drawing.p2.price + (this._drawing.p1.price - this._drawing.p2.price) * l;
                const y = this._seriesRef.current?.priceToCoordinate(price);
                if (
                    y === null ||
                    y === undefined
                ) continue;
                const yPx = Math.round(y * verticalPixelRatio);
                context.strokeStyle = this._drawing.color;
                context.lineWidth = (this._isSelected ? 2 : 1) * verticalPixelRatio;
                context.fillStyle = this._drawing.color;
                context.font = `${11 * verticalPixelRatio}px monospace`;
                context.fillText(`${(l * 100).toFixed(1)}% ${price.toFixed(2)}`, 4 * horizontalPixelRatio, yPx - 3 * verticalPixelRatio);
                context.beginPath();
                context.setLineDash(this._isSelected ? [5,3] : []);
                context.moveTo(0, yPx);
                context.lineTo(bitmapSize.width, yPx);
                context.stroke();
            }
        })
    }
}

class FibPaneView implements IPanePrimitivePaneView {
    private _drawing: FibRetracementDrawing;
    private _seriesRef: React.RefObject<any>;
    private _isSelected: boolean;

    constructor(drawing: FibRetracementDrawing, seriesRef: React.RefObject<any>, isSelected: boolean) {
        this._drawing = drawing;
        this._seriesRef = seriesRef;
        this._isSelected = isSelected;
    }

    renderer(): IPrimitivePaneRenderer {
        return new FibRetracementRenderer(this._drawing, this._seriesRef, this._isSelected);
    }
}

export class FibRetracementPrimitive implements IPanePrimitive {
    private _drawing: FibRetracementDrawing;
    private _seriesRef: React.RefObject<any>;
    private _isSelected: boolean;
    private _requestUpdate?: () => void;

    constructor(drawing: FibRetracementDrawing, seriesRef: React.RefObject<any>, isSelected: boolean) {
        this._drawing = drawing;
        this._seriesRef = seriesRef;
        this._isSelected = isSelected;
    }

    attached({ requestUpdate }: { requestUpdate: () => void }): void {
        this._requestUpdate = requestUpdate;
        requestUpdate();
    }

    paneViews() {
        return [new FibPaneView(this._drawing, this._seriesRef, this._isSelected)]
    }

    update(drawing: FibRetracementDrawing, isSelected: boolean) {
        this._drawing = drawing;
        this._isSelected = isSelected;
        this._requestUpdate?.();
    }
}