/* eslint-disable no-param-reassign */

import { Coordinates, Annotation, AnnotationStyle, PartialAnnotationStyle, AnnotationPathData, StyleDataById, ShadowStyle } from './models';
import defaultStyle from './style/defaultStyleOptions';

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
    path.lineTo(coordinates.x + width, coordinates.y + height - radius);
    path.quadraticCurveTo(
        coordinates.x + width,
        coordinates.y + height,
        coordinates.x + width - radius,
        coordinates.y + height,
    );
    path.lineTo(coordinates.x + radius, coordinates.y + height);
    path.quadraticCurveTo(coordinates.x, coordinates.y + height, coordinates.x, coordinates.y + height - radius);
    path.lineTo(coordinates.x, coordinates.y + radius);
    path.quadraticCurveTo(coordinates.x, coordinates.y, coordinates.x + radius, coordinates.y);
    renderingContext.fill(path);

    return path;
};

export const overloadStyle = (style: AnnotationStyle, customStyle?: PartialAnnotationStyle): AnnotationStyle => {
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
                    else {
                        output[key] = mergeDeep(target[key], source[key]);
                    }
                } else {
                    Object.assign(output, { [key]: source[key] });
                }
            });
        }
        
        return output;
    }

    return mergeDeep(style, customStyle) as AnnotationStyle;
}

const applyShadow = (renderingContext: CanvasRenderingContext2D, {blur, color, offsetX, offsetY}: ShadowStyle) => {
    renderingContext.shadowOffsetX = offsetX;
    renderingContext.shadowOffsetY = offsetY;
    renderingContext.shadowColor = color;
    renderingContext.shadowBlur = blur;
};

const drawLabel = (renderingContext: CanvasRenderingContext2D, label: string, from: Coordinates, style: AnnotationStyle): Path2D => {
    const textSize = renderingContext.measureText(label);
    renderingContext.save();
    const { textAlign, textColor, fillColor, shadow } = style.label;


    renderingContext.textAlign = textAlign;
    applyShadow(renderingContext, shadow);
    renderingContext.fillStyle = fillColor;
    const path = drawRoundRect(renderingContext, { x: from.x - 2, y: from.y -20 }, textSize.width + 10, 20, 5);
    renderingContext.restore();
    renderingContext.save();
    renderingContext.fillStyle = textColor;
    renderingContext.fillText(label, from.x + 2, from.y -5);
    renderingContext.restore();

    return path;
};

const getStyle = (annotationId: string, styledAnnotations?: StyleDataById): AnnotationStyle => {
    const customStyle = styledAnnotations?.get(annotationId)?.style;
    
    if (!styledAnnotations || !customStyle) {
        return defaultStyle;
    }
    
    return overloadStyle(defaultStyle, customStyle);

};

export const drawPoint = (
    renderingContext: CanvasRenderingContext2D,
    coordinates: Coordinates,
    style: AnnotationStyle = defaultStyle,
): Path2D => {

    const pointPath = new Path2D();
    pointPath.addPath(pointPath);
    const { strokeColor, width, outerRadius, innerRadius, fillColor } = style.point;
    const { shadow } = style.label;
    // stroke and line
    renderingContext.strokeStyle = strokeColor;
    renderingContext.lineWidth = width;
  
    // arc
    renderingContext.save();
    applyShadow(renderingContext, shadow);

    pointPath.arc(coordinates.x, coordinates.y, outerRadius, 0, Math.PI * 2, true);

    renderingContext.stroke(pointPath);
    pointPath.closePath();
    renderingContext.restore();
  

    // fill
    pointPath.addPath(pointPath);
    renderingContext.fillStyle = fillColor;
 
    // arc
    pointPath.arc(coordinates.x, coordinates.y, innerRadius, 0, Math.PI * 2, true);

    renderingContext.fill(pointPath);
    pointPath.closePath();

    return pointPath;
};

export const drawLine = (
    renderingContext: CanvasRenderingContext2D,
    startCoordinates: Coordinates,
    endCoordinates: Coordinates,
    style: AnnotationStyle = defaultStyle,
    shapePath: Path2D = new Path2D()
): Path2D => {

    const { strokeColor, cap, width } = style.line;
    const { shadow } = style.label;
    renderingContext.strokeStyle = strokeColor;
    renderingContext.lineCap = cap;
    renderingContext.save()
    applyShadow(renderingContext, shadow);

    shapePath.moveTo(startCoordinates.x, startCoordinates.y);
    shapePath.lineTo(endCoordinates.x, endCoordinates.y);
    renderingContext.lineWidth = width;
    renderingContext.stroke(shapePath);
    renderingContext.restore();

    return shapePath;
};

export const drawAnnotations = (renderingContext: CanvasRenderingContext2D, annotations: Annotation[], styledAnnotations: StyleDataById, annotationsPaths: Map<string, AnnotationPathData>): void => {
    annotations.forEach((annotation) => {
        const getHighestPoint = (coordinates: Coordinates[]): Coordinates => coordinates.reduce((coord1, coord2) => {
            if (coord1.y < coord2.y) {
                return coord1;
            }

            return coord2;
        });

        const highestPoint = getHighestPoint(annotation.coordinates)
        const style = getStyle(annotation.id, styledAnnotations);

        const getLabelCoordinates = (middlePoint: Coordinates): {firstPoint: Coordinates, secondPoint: Coordinates} => {
            const textSize = renderingContext.measureText(annotation.name);

            return ({
                firstPoint: {
                    x: middlePoint.x - textSize.width / 2,
                    y: middlePoint.y - 10,
                },
                secondPoint: {
                    x: middlePoint.x + textSize.width / 2,
                    y: middlePoint.y - 10,
                }
            });
        };

        const { firstPoint } = getLabelCoordinates(highestPoint);

        let pointPath: Path2D;

        if (annotation.coordinates.length === 1) {
            pointPath = drawPoint(renderingContext, highestPoint, style);

            const labelPath = drawLabel(renderingContext, annotation.name, firstPoint, style);

            return annotationsPaths.set(annotation.id, {
                label: labelPath,
                point: pointPath,
            });
        }

        const linesPath: Path2D[] = [];

        let previousCoordinates: Coordinates | undefined =
            annotation.coordinates.length > 2 ? annotation.coordinates[annotation.coordinates.length - 1] : undefined;

        annotation.coordinates.forEach((coordinates: Coordinates, index: number) => {
            if (previousCoordinates) {
                if (annotation.isClosed === false) {
                    if (index > 0) {
                        linesPath.push(drawLine(renderingContext, previousCoordinates, coordinates, style));
                    }
                } else {
                    linesPath.push(drawLine(renderingContext, previousCoordinates, coordinates, style));
                }
            }
            previousCoordinates = coordinates;
        });

        const labelPath = drawLabel(renderingContext, annotation.name, firstPoint, style);

        return annotationsPaths.set(annotation.id, {
            label: labelPath,
            lines: linesPath,
        });
    });
};

export const drawCurrentAnnotation = (
    renderingContext: CanvasRenderingContext2D,
    annotationPoints: Coordinates[],
    isComplete: boolean,
    styledPoints: StyleDataById,
    editStyle: AnnotationStyle,
    currentAnnotation?: Annotation,
): void => {
    annotationPoints.forEach((annotationPoint: Coordinates, index: number) => {

        const style = overloadStyle(editStyle, styledPoints.get(`${index}`)?.style)
        drawPoint(renderingContext, annotationPoint, style);
    });

    if (annotationPoints.length > 1) {
        for (let i = 1; i < annotationPoints.length; i++) {
            drawLine(renderingContext, annotationPoints[i - 1], annotationPoints[i], editStyle);
        }
    }

    if (isComplete) {
        if (currentAnnotation?.isClosed === true) {
            drawLine(renderingContext, annotationPoints[annotationPoints.length - 1], annotationPoints[0], editStyle);
        }
    }
};
