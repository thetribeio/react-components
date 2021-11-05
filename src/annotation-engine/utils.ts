/* eslint-disable no-param-reassign */

import { Coordinates, Annotation } from './models';

class CanvasBuilder {
    protected readonly renderingContext: CanvasRenderingContext2D;

    constructor(renderingContext: CanvasRenderingContext2D) {
        this.renderingContext = renderingContext;
    }

    beginpath(): CanvasBuilder {
        this.renderingContext.beginPath();

        return this;
    }

    closePath(): CanvasBuilder {
        this.renderingContext.closePath();

        return this;
    }

    fill(): CanvasBuilder {
        this.renderingContext.fill();

        return this;
    }

    fillStyle(hexa: string): CanvasBuilder {
        this.renderingContext.fillStyle = hexa;

        return this;
    }

    stroke(): CanvasBuilder {
        this.renderingContext.stroke();

        return this;
    }

    strokeStyle(hexa: string): CanvasBuilder {
        this.renderingContext.strokeStyle = hexa;

        return this;
    }

    lineWidth(width: number): CanvasBuilder {
        this.renderingContext.lineWidth = width;

        return this;
    }

    arc({ x, y }: Coordinates, radius: number): CanvasBuilder {
        this.renderingContext.arc(x, y, radius, 0, Math.PI * 2, true);

        return this;
    }

    moveTo({ x, y }: Coordinates): CanvasBuilder {
        this.renderingContext.moveTo(x, y);

        return this;
    }

    lineTo({ x, y }: Coordinates): CanvasBuilder {
        this.renderingContext.lineTo(x, y);

        return this;
    }

    lineCap(cap: CanvasLineCap): CanvasBuilder {
        this.renderingContext.lineCap = cap;

        return this;
    }
}

export const areCoordinatesInsideCircle = (
    pointCoordinates: Coordinates,
    circleCenterCoordinates: Coordinates,
    radius: number,
): boolean => {
    const distance =
        (pointCoordinates.x - circleCenterCoordinates.x) * (pointCoordinates.x - circleCenterCoordinates.x) +
        (pointCoordinates.y - circleCenterCoordinates.y) * (pointCoordinates.y - circleCenterCoordinates.y);
    const squareRadius = radius * radius;

    return distance < squareRadius;
};

export const drawRoundRect = (
    renderingContext: CanvasRenderingContext2D,
    coordinates: Coordinates,
    width: number,
    height: number,
    radius: number,
): Path2D => {
    // renderingContext.beginPath();
    const path = new Path2D();
    path.moveTo(coordinates.x + radius, coordinates.y);
    path.lineTo(coordinates.x + width - radius, coordinates.y);
    path.quadraticCurveTo(
        coordinates.x + width,
        coordinates.y,
        coordinates.x + width,
        coordinates.y + radius,
    );
    path.lineTo(coordinates.x + width, coordinates.y + height);
    path.quadraticCurveTo(
        coordinates.x + width,
        coordinates.y + height,
        coordinates.x + width,
        coordinates.y + height,
    );
    path.lineTo(coordinates.x, coordinates.y + height);
    path.quadraticCurveTo(coordinates.x, coordinates.y + height, coordinates.x, coordinates.y + height);
    path.lineTo(coordinates.x, coordinates.y + radius);
    path.quadraticCurveTo(coordinates.x, coordinates.y, coordinates.x + radius, coordinates.y);
    renderingContext.fill(path);

    return path;
    // renderingContext.closePath();
};

const drawLabel = (renderingContext: CanvasRenderingContext2D, label: string, from: Coordinates, to: Coordinates): Path2D => {
    const distanceX = to.x - from.x;
    const distanceY = to.y - from.y;
    const textSize = renderingContext.measureText(label);
    renderingContext.save();
    renderingContext.textAlign = 'left';
    // on se place sur le point de départ du label
    // renderingContext.translate(from.x, from.y);
    // renderingContext.rotate(Math.atan2(distanceY, distanceX));
    renderingContext.fillStyle = '#F0F';
    const labelPath = drawRoundRect(renderingContext, { x: from.x - 2, y: from.y -20 }, textSize.width + 10, 20, 10);
    // const labelPath = drawRoundRect(renderingContext, { x: - 2, y: -20 }, textSize.width + 10, 20, 10);
    renderingContext.fillStyle = '#0053CC';
    // renderingContext.fillText(label, 2, 5);
    renderingContext.fillText(label, from.x + 2, from.y -5 );
    renderingContext.restore();

    return labelPath;
};

export const drawPoint = (
    type: 'SELECTED' | 'UNSELECTED' | 'HIGHLIGHTED',
    renderingContext: CanvasRenderingContext2D,
    coordinates: Coordinates,
): void => {
    const cb = new CanvasBuilder(renderingContext);

    cb.beginpath();

    // stroke and line
    if (type === 'SELECTED') {
        cb.strokeStyle('#FFF').lineWidth(1);
    } else if (type === 'HIGHLIGHTED' || type === 'UNSELECTED') {
        cb.strokeStyle('#FFFFFF95').lineWidth(2);
    }

    // arc
    if (type === 'UNSELECTED') {
        cb.arc(coordinates, 7);
    } else if (type === 'SELECTED') {
        cb.arc(coordinates, 8);
    } else if (type === 'HIGHLIGHTED') {
        cb.arc(coordinates, 14);
    }

    cb.stroke();

    if (type === 'SELECTED' || type === 'UNSELECTED') {
        cb.strokeStyle('#000');
    }

    cb.closePath();

    cb.beginpath();

    // fill
    if (type === 'SELECTED' || type === 'HIGHLIGHTED') {
        cb.fillStyle('#0053CC66');
    } else if (type === 'UNSELECTED') {
        cb.fillStyle('#0053CC30');
    }

    // arc
    if (type === 'SELECTED') {
        cb.arc(coordinates, 8);
    } else if (type === 'UNSELECTED') {
        cb.arc(coordinates, 5);
    } else if (type === 'HIGHLIGHTED') {
        cb.arc(coordinates, 12);
    }

    cb.fill();

    if (type === 'SELECTED' || type === 'UNSELECTED') {
        cb.strokeStyle('#000');
    }

    cb.closePath();
};

export const drawLine = (
    type: 'SELECTED' | 'UNSELECTED',
    renderingContext: CanvasRenderingContext2D,
    startCoordinates: Coordinates,
    endCoordinates: Coordinates,
): void => {
    const cb = new CanvasBuilder(renderingContext);

    cb.beginpath();

    if (type === 'SELECTED') {
        cb.strokeStyle('#0053CC');
    } else if (type === 'UNSELECTED') {
        cb.strokeStyle('#FFFFFF').lineCap('round');
    }

    cb.moveTo(startCoordinates).lineTo(endCoordinates).lineWidth(2).stroke().closePath();
};

export const drawAnnotations = (renderingContext: CanvasRenderingContext2D, annotations: Annotation[]): void => {
    annotations.forEach((annotation) => {
        let previousCoordinates: Coordinates | undefined =
            annotation.coordinates.length > 2 ? annotation.coordinates[annotation.coordinates.length - 1] : undefined;

        if (annotation.coordinates.length === 1) {
            const middlePoint = annotation.coordinates[0];
            const textSize = renderingContext.measureText(annotation.name);
            const firstPoint = {
                x: middlePoint.x - textSize.width / 2,
                y: middlePoint.y - 10,
            };
            const secondPoint = {
                x: middlePoint.x + textSize.width / 2,
                y: middlePoint.y - 10,
            };
            drawPoint('UNSELECTED', renderingContext, middlePoint);
            const path = drawLabel(renderingContext, annotation.name, firstPoint, secondPoint);
            annotation.label = {
                name: annotation.name,
                path,
            };

            return;
        }
        annotation.coordinates.forEach((coordinates: Coordinates, index: number) => {
            if (previousCoordinates) {
                if (annotation.type === 'POLYLINE') {
                    if (index > 0) {
                        drawLine('UNSELECTED', renderingContext, previousCoordinates, coordinates);
                    }
                } else {
                    drawLine('UNSELECTED', renderingContext, previousCoordinates, coordinates);
                }
            }

            previousCoordinates = coordinates;
        });

        const firstPoint = annotation.coordinates[0];
        const secondPoint = annotation.coordinates[1];
        const path = drawLabel(renderingContext, annotation.name, firstPoint, secondPoint);
        annotation.label = {
            name: annotation.name,
            path,
        };
        // if (annotation.coordinates.length >= 2) {
        // }
    });
};

export const drawCurrentAnnotation = (
    renderingContext: CanvasRenderingContext2D,
    annotationPoints: Coordinates[],
    annotationHighlightPointIndex: number,
    isComplete: boolean,
    currentAnnotation?: Annotation,
): void => {
    annotationPoints.forEach((annotationPoint: Coordinates, index: number) => {
        if (index === annotationHighlightPointIndex) {
            drawPoint('HIGHLIGHTED', renderingContext, annotationPoint);
        } else {
            drawPoint('SELECTED', renderingContext, annotationPoint);
        }
    });

    if (annotationPoints.length > 1) {
        for (let i = 1; i < annotationPoints.length; i++) {
            drawLine('SELECTED', renderingContext, annotationPoints[i - 1], annotationPoints[i]);
        }
    }

    if (isComplete) {
        if (currentAnnotation?.type !== 'POLYLINE') {
            drawLine('SELECTED', renderingContext, annotationPoints[annotationPoints.length - 1], annotationPoints[0]);
        }
    }
};
