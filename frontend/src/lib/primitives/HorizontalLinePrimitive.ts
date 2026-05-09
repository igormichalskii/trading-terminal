import type { IPanePrimitive, IPanePrimitivePaneView, IPrimitivePaneRenderer } from "lightweight-charts";
import type { HorizontalLineDrawing } from "../drawings";
import type React from "react";
import { lineDashForStyle } from "../drawingUtils";


class HorizontalLineRenderer implements IPrimitivePaneRenderer {
    private _drawing: HorizontalLineDrawing;
    private _seriesRef: React.RefObject<any>;
    private _isSelected: boolean;


    constructor(drawing: HorizontalLineDrawing, seriesRef: React.RefObject<any>, isSelected: boolean) {
        this._drawing = drawing;
        this._seriesRef = seriesRef;
        this._isSelected = isSelected;
    }

    draw(target: any): void {
        target.useBitmapCoordinateSpace(({ context, bitmapSize, verticalPixelRatio, horizontalPixelRatio }: {
            context: CanvasRenderingContext2D;
            bitmapSize: { width: number; height: number };
            verticalPixelRatio: number;
            horizontalPixelRatio: number;
        }) => {
            const y = this._seriesRef.current?.priceToCoordinate(this._drawing.price);
            if (y === null || y === undefined) return;
            const yPx = Math.round(y * verticalPixelRatio);
            context.strokeStyle = this._drawing.color;
            context.lineWidth = (this._isSelected ? this._drawing.lineWidth + 1 : this._drawing.lineWidth) * verticalPixelRatio;
            context.fillStyle = this._drawing.color;
            context.font = `${11 * verticalPixelRatio}px monospace`
            context.beginPath();
            context.setLineDash(this._isSelected ? [5, 3] : lineDashForStyle(this._drawing.lineStyle));
            context.moveTo(0, yPx);
            context.lineTo(bitmapSize.width, yPx);
            context.stroke();
            if (this._drawing.label) {
                context.textAlign = "left";
                context.fillText(this._drawing.label, 4 * horizontalPixelRatio, yPx - 4 * verticalPixelRatio);
                context.textAlign = "right";
            }

        })
    }
}

class HorizontalPaneView implements IPanePrimitivePaneView {
    private _drawing: HorizontalLineDrawing;
    private _seriesRef: React.RefObject<any>;
    private _isSelected: boolean;

    constructor(drawing: HorizontalLineDrawing, seriesRef: React.RefObject<any>, isSelected: boolean) {
        this._drawing = drawing;
        this._seriesRef = seriesRef;
        this._isSelected = isSelected;
    }

    renderer(): IPrimitivePaneRenderer {
        return new HorizontalLineRenderer(this._drawing, this._seriesRef, this._isSelected);
    }
}

export class HorizontalLinePrimitive implements IPanePrimitive {
    private _drawing: HorizontalLineDrawing;
    private _seriesRef: React.RefObject<any>;
    private _requestUpdate?: () => void;
    private _isSelected: boolean;

    constructor(drawing: HorizontalLineDrawing, seriesRef: React.RefObject<any>, isSelected: boolean) {
        this._drawing = drawing;
        this._seriesRef = seriesRef;
        this._isSelected = isSelected;
    }

    attached({ requestUpdate }: { requestUpdate: () => void }): void {
        this._requestUpdate = requestUpdate;
        requestUpdate();
    }

    paneViews() {
        return [new HorizontalPaneView(this._drawing, this._seriesRef, this._isSelected)]
    }

    update(drawing: HorizontalLineDrawing, isSelected: boolean) {
        this._drawing = drawing;
        this._isSelected = isSelected;
        this._requestUpdate?.()
    }
}