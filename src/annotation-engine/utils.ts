/* eslint-disable no-param-reassign */

import { Coordinates, Annotation, SelectionTypes, StyleOptions, PartialStyleOptions } from './models';
import { unselectedStyle, selectedStyle, temporaryHighlightedStyle, highlightedStyle } from './style/defaultStyleOptions';

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

const overloadStyle = (style: StyleOptions, customStyle?: PartialStyleOptions): StyleOptions => {
    if(!customStyle) {
        return style;
    }

    const isObject = (item: any) => (item && typeof item === 'object' && !Array.isArray(item))

    const mergeDeep = (target: any, source: any) => {
        const output = {...target};
        if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
            if (isObject(source[key])) {
            if (!(key in target))
                Object.assign(output, { [key]: source[key] });
            else
                output[key] = mergeDeep(target[key], source[key]);
                } else {
                Object.assign(output, { [key]: source[key] });
                }
            });
        }
        
        return output;
    }

    return mergeDeep(style, customStyle) as StyleOptions;
}

const drawLabel = (renderingContext: CanvasRenderingContext2D, label: string, from: Coordinates, to: Coordinates, customStyle?: PartialStyleOptions): Path2D => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const distanceX = to.x - from.x;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const distanceY = to.y - from.y;
    const textSize = renderingContext.measureText(label);
    renderingContext.save();
    const style = overloadStyle(unselectedStyle, customStyle);
    const {align, color, fillColor} = style.text;

    renderingContext.textAlign = align as CanvasTextAlign;
    // renderingContext.translate(from.x, from.y);
    // renderingContext.rotate(Math.atan2(distanceY, distanceX));
    renderingContext.fillStyle = fillColor;
    const path = drawRoundRect(renderingContext, { x: from.x - 2, y: from.y -20 }, textSize.width + 10, 20, 10);
    renderingContext.fillStyle = color;
    renderingContext.fillText(label, from.x + 2, from.y -5);
    renderingContext.restore();

    return path;
};


const getStyle = (type: SelectionTypes): StyleOptions => {
    let style;

    switch (type) {
        case 'SELECTED':
            style = selectedStyle;
            break;
    
        case 'TEMPORARY_HIGHLIGHTED':
            style = temporaryHighlightedStyle;
            break;
    
        case 'HIGHLIGHTED':
            style = highlightedStyle;
            break;
    
        case 'UNSELECTED':    
        default:
            style = unselectedStyle;
            break;
    }

    return style;
};

export const drawPoint = (
    type: SelectionTypes,
    renderingContext: CanvasRenderingContext2D,
    coordinates: Coordinates,
): void => {
    renderingContext.beginPath();

    const style = getStyle(type);

    const { strokeColor, width, outerRadius, innerRadius, fillColor } = style.point;
    // stroke and line
    renderingContext.strokeStyle = strokeColor;
    renderingContext.lineWidth = width;
  
    // arc

    renderingContext.arc(coordinates.x, coordinates.y, outerRadius, 0, Math.PI * 2, true);

    renderingContext.stroke();

    if (type === 'SELECTED' || type === 'UNSELECTED') {
        renderingContext.strokeStyle = '#000';
    }

    renderingContext.closePath();

    renderingContext.beginPath();

    // fill
    renderingContext.fillStyle = fillColor;
 
    // arc
    renderingContext.arc(coordinates.x, coordinates.y, innerRadius, 0, Math.PI * 2, true);

    renderingContext.fill();

    if (type === 'SELECTED' || type === 'UNSELECTED') {
        renderingContext.strokeStyle = '#000';
    }

    renderingContext.closePath();
};

export const drawLine = (
    type: SelectionTypes,
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

export const drawAnnotations = (renderingContext: CanvasRenderingContext2D, annotations: Annotation[], annotationToHighlightId: string | undefined, annotationToTemporaryHighlightId: string | undefined, annotationStyles: Map<string, PartialStyleOptions>): void => {
    annotations.forEach((annotation) => {
        let previousCoordinates: Coordinates | undefined =
            annotation.coordinates.length > 2 ? annotation.coordinates[annotation.coordinates.length - 1] : undefined;

        let selectionType: SelectionTypes = 'UNSELECTED';

        const customStyle = annotationStyles.get(annotation.id);

        switch (annotation.id) {
            case annotationToHighlightId:
                selectionType = 'SELECTED';
                
                break;
        
            case annotationToTemporaryHighlightId:
                selectionType = 'TEMPORARY_HIGHLIGHTED';
                
                break;
        
            default:
                selectionType = 'UNSELECTED';
                break;
        }

        annotation.coordinates.forEach((coordinates: Coordinates, index: number) => {
            if (previousCoordinates) {
                if (annotation.isClosed === false) {
                    if (index > 0) {
                        drawLine(selectionType, renderingContext, previousCoordinates, coordinates);
                    }
                } else {
                    drawLine(selectionType, renderingContext, previousCoordinates, coordinates);
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
            drawPoint(selectionType, renderingContext, middlePoint);
            const path = drawLabel(renderingContext, annotation.name, firstPoint, secondPoint, customStyle);
            annotation.label = {
                name: annotation.name,
                path,
            };
        }
        if (annotation.coordinates.length >= 2) {
            const firstPoint = annotation.coordinates[0];
            const secondPoint = annotation.coordinates[1];
            const path = drawLabel(renderingContext, annotation.name, firstPoint, secondPoint, customStyle);
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
