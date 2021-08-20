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
): void => {
    renderingContext.beginPath();
    renderingContext.moveTo(coordinates.x + radius, coordinates.y);
    renderingContext.lineTo(coordinates.x + width - radius, coordinates.y);
    renderingContext.quadraticCurveTo(
        coordinates.x + width,
        coordinates.y,
        coordinates.x + width,
        coordinates.y + radius,
    );
    renderingContext.lineTo(coordinates.x + width, coordinates.y + height);
    renderingContext.quadraticCurveTo(
        coordinates.x + width,
        coordinates.y + height,
        coordinates.x + width,
        coordinates.y + height,
    );
    renderingContext.lineTo(coordinates.x, coordinates.y + height);
    renderingContext.quadraticCurveTo(coordinates.x, coordinates.y + height, coordinates.x, coordinates.y + height);
    renderingContext.lineTo(coordinates.x, coordinates.y + radius);
    renderingContext.quadraticCurveTo(coordinates.x, coordinates.y, coordinates.x + radius, coordinates.y);
    renderingContext.fill();
    renderingContext.closePath();
};

const drawLabel = (renderingContext: CanvasRenderingContext2D, label: string, from: Coordinates, to: Coordinates) => {
    const distanceX = to.x - from.x;
    const distanceY = to.y - from.y;
    const textSize = renderingContext.measureText(label);
    renderingContext.save();
    renderingContext.textAlign = 'left';
    renderingContext.translate(from.x, from.y);
    renderingContext.rotate(Math.atan2(distanceY, distanceX));
    renderingContext.fillStyle = '#FFFFFF';
    drawRoundRect(renderingContext, { x: -2, y: -20 }, textSize.width + 10, 20, 10);
    renderingContext.fillStyle = '#0053CC';
    renderingContext.fillText(label, 2, -5);
    renderingContext.restore();
};

export const drawSelectedPoint = (renderingContext: CanvasRenderingContext2D, coordinates: Coordinates): void => {
    renderingContext.beginPath();
    renderingContext.strokeStyle = '#0053CC';
    renderingContext.lineWidth = 2;
    renderingContext.arc(coordinates.x, coordinates.y, 7, 0, Math.PI * 2, true);
    renderingContext.stroke();
    renderingContext.strokeStyle = '#000';
    renderingContext.closePath();

    renderingContext.beginPath();
    renderingContext.fillStyle = '#FFFFFF30';
    renderingContext.arc(coordinates.x, coordinates.y, 5, 0, Math.PI * 2, true);
    renderingContext.fill();
    renderingContext.fillStyle = '#000';
    renderingContext.closePath();
};

export const drawUnselectedPoint = (renderingContext: CanvasRenderingContext2D, coordinates: Coordinates): void => {
    renderingContext.beginPath();
    renderingContext.strokeStyle = '#FFFFFF95';
    renderingContext.lineWidth = 2;
    renderingContext.arc(coordinates.x, coordinates.y, 7, 0, Math.PI * 2, true);
    renderingContext.stroke();
    renderingContext.strokeStyle = '#000';
    renderingContext.closePath();

    renderingContext.beginPath();
    renderingContext.fillStyle = '#0053CC30';
    renderingContext.arc(coordinates.x, coordinates.y, 5, 0, Math.PI * 2, true);
    renderingContext.fill();
    renderingContext.fillStyle = '#000';
    renderingContext.closePath();
};

export const drawSelectedLine = (
    renderingContext: CanvasRenderingContext2D,
    startCoordinates: Coordinates,
    endCoordinates: Coordinates,
): void => {
    renderingContext.beginPath();
    renderingContext.strokeStyle = '#0053CC';
    renderingContext.moveTo(startCoordinates.x, startCoordinates.y);
    renderingContext.lineWidth = 2;
    renderingContext.lineTo(endCoordinates.x, endCoordinates.y);
    renderingContext.stroke();
    renderingContext.closePath();
};

export const drawUnselectedLine = (
    renderingContext: CanvasRenderingContext2D,
    startCoordinates: Coordinates,
    endCoordinates: Coordinates,
): void => {
    renderingContext.beginPath();
    renderingContext.strokeStyle = '#FFFFFF';
    renderingContext.lineCap = 'round';
    renderingContext.moveTo(startCoordinates.x, startCoordinates.y);
    renderingContext.lineTo(endCoordinates.x, endCoordinates.y);
    renderingContext.lineWidth = 2;
    renderingContext.stroke();
    renderingContext.closePath();
};

export const drawAnnotations = (renderingContext: CanvasRenderingContext2D, annotations: Annotation[]): void => {
    annotations.forEach((annotation) => {
        let previousCoordinates: Coordinates | undefined =
            annotation.coordinates.length > 2 ? annotation.coordinates[annotation.coordinates.length - 1] : undefined;

        annotation.coordinates.forEach((coordinates: Coordinates) => {
            if (previousCoordinates) {
                drawUnselectedLine(renderingContext, previousCoordinates, coordinates);
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
            drawUnselectedPoint(renderingContext, middlePoint);
            drawLabel(renderingContext, annotation.name, firstPoint, secondPoint);
        }
        if (annotation.coordinates.length >= 2) {
            const firstPoint = annotation.coordinates[0];
            const secondPoint = annotation.coordinates[1];
            drawLabel(renderingContext, annotation.name, firstPoint, secondPoint);
        }
    });
};

export const drawCurrentAnnotation = (
    renderingContext: CanvasRenderingContext2D,
    annotationPoints: Coordinates[],
    isComplete: boolean,
): void => {
    annotationPoints.forEach((annotationPoint: Coordinates) => {
        drawSelectedPoint(renderingContext, annotationPoint);
    });

    if (annotationPoints.length > 1) {
        for (let i = 1; i < annotationPoints.length; i++) {
            drawSelectedLine(renderingContext, annotationPoints[i - 1], annotationPoints[i]);
        }
    }

    if (isComplete) {
        drawSelectedLine(renderingContext, annotationPoints[annotationPoints.length - 1], annotationPoints[0]);
    }
};
