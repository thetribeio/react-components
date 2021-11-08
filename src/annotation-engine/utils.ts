/* eslint-disable no-param-reassign */

import { Coordinates, Annotation } from './models';

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
};

const drawLabel = (renderingContext: CanvasRenderingContext2D, label: string, from: Coordinates, to: Coordinates): Path2D => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const distanceX = to.x - from.x;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const distanceY = to.y - from.y;
    const textSize = renderingContext.measureText(label);
    renderingContext.save();
    renderingContext.textAlign = 'left';
    // renderingContext.translate(from.x, from.y);
    // renderingContext.rotate(Math.atan2(distanceY, distanceX));
    renderingContext.fillStyle = '#FFFFFF';
    const path = drawRoundRect(renderingContext, { x: from.x - 2, y: from.y -20 }, textSize.width + 10, 20, 10);
    renderingContext.fillStyle = '#0053CC';
    renderingContext.fillText(label, from.x + 2, from.y -5);
    renderingContext.restore();

    return path;
};

export const drawPoint = (
    type: 'SELECTED' | 'UNSELECTED' | 'HIGHLIGHTED',
    renderingContext: CanvasRenderingContext2D,
    coordinates: Coordinates,
): void => {
    renderingContext.beginPath();

    // stroke and line
    if (type === 'SELECTED') {
        renderingContext.strokeStyle = '#FFF';
        renderingContext.lineWidth = 1;
    } else if (type === 'HIGHLIGHTED' || type === 'UNSELECTED') {
        renderingContext.strokeStyle = '#FFFFFF95';
        renderingContext.lineWidth = 2;
    }

    // arc
    if (type === 'UNSELECTED') {
        renderingContext.arc(coordinates.x, coordinates.y, 7, 0, Math.PI * 2, true);
    } else if (type === 'SELECTED') {
        renderingContext.arc(coordinates.x, coordinates.y, 8, 0, Math.PI * 2, true);
    } else if (type === 'HIGHLIGHTED') {
        renderingContext.arc(coordinates.x, coordinates.y, 14, 0, Math.PI * 2, true);
    }

    renderingContext.stroke();

    if (type === 'SELECTED' || type === 'UNSELECTED') {
        renderingContext.strokeStyle = '#000';
    }

    renderingContext.closePath();

    renderingContext.beginPath();

    // fill
    if (type === 'SELECTED' || type === 'HIGHLIGHTED') {
        renderingContext.fillStyle = '#0053CC66';
    } else if (type === 'UNSELECTED') {
        renderingContext.fillStyle = '#0053CC30';
    }

    // arc
    if (type === 'SELECTED') {
        renderingContext.arc(coordinates.x, coordinates.y, 8, 0, Math.PI * 2, true);
    } else if (type === 'UNSELECTED') {
        renderingContext.arc(coordinates.x, coordinates.y, 5, 0, Math.PI * 2, true);
    } else if (type === 'HIGHLIGHTED') {
        renderingContext.arc(coordinates.x, coordinates.y, 12, 0, Math.PI * 2, true);
    }

    renderingContext.fill();

    if (type === 'SELECTED' || type === 'UNSELECTED') {
        renderingContext.strokeStyle = '#000';
    }

    renderingContext.closePath();
};

export const drawLine = (
    type: 'SELECTED' | 'UNSELECTED',
    renderingContext: CanvasRenderingContext2D,
    startCoordinates: Coordinates,
    endCoordinates: Coordinates,
): void => {
    renderingContext.beginPath();

    if (type === 'SELECTED') {
        renderingContext.strokeStyle = '#0053CC';
    } else if (type === 'UNSELECTED') {
        renderingContext.strokeStyle = '#FFFFFF';
        renderingContext.lineCap = 'round';
    }

    renderingContext.moveTo(startCoordinates.x, startCoordinates.y);
    renderingContext.lineTo(endCoordinates.x, endCoordinates.y);
    renderingContext.lineWidth = 2;
    renderingContext.stroke();

    renderingContext.closePath();
};

export const drawAnnotations = (renderingContext: CanvasRenderingContext2D, annotations: Annotation[], annotationToHighlightId: string | undefined, annotationToTemporaryHighlightId: string | undefined): void => {
    annotations.forEach((annotation) => {
        let previousCoordinates: Coordinates | undefined =
            annotation.coordinates.length > 2 ? annotation.coordinates[annotation.coordinates.length - 1] : undefined;

        const selectStyle = (annotation.id === annotationToHighlightId || annotation.id === annotationToTemporaryHighlightId) ? 'SELECTED' : 'UNSELECTED';
        annotation.coordinates.forEach((coordinates: Coordinates, index: number) => {
            if (previousCoordinates) {
                if (annotation.isClosed === false) {
                    if (index > 0) {
                        drawLine(selectStyle, renderingContext, previousCoordinates, coordinates);
                    }
                } else {
                    drawLine(selectStyle, renderingContext, previousCoordinates, coordinates);
                }
            }

            previousCoordinates = coordinates;
        });

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
            drawPoint(selectStyle, renderingContext, middlePoint);
            const path = drawLabel(renderingContext, annotation.name, firstPoint, secondPoint);
            annotation.label = {
                name: annotation.name,
                path,
            };
        }
        if (annotation.coordinates.length >= 2) {
            const firstPoint = annotation.coordinates[0];
            const secondPoint = annotation.coordinates[1];
            const path = drawLabel(renderingContext, annotation.name, firstPoint, secondPoint);
            annotation.label = {
            name: annotation.name,
            path,
        };
        }
    });
};

export const drawCurrentAnnotation = (
    renderingContext: CanvasRenderingContext2D,
    annotationPoints: Coordinates[],
    isComplete: boolean,
    annotationHighlightPointIndex?: number,
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
        if (currentAnnotation?.isClosed === true) {
            drawLine('SELECTED', renderingContext, annotationPoints[annotationPoints.length - 1], annotationPoints[0]);
        }
    }
};
