/* eslint-disable no-param-reassign */

import { Coordinates, Annotation, SelectionTypes, AnnotationStyle, PartialAnnotationStyle, StyleOptions, AnnotationPathData } from './models';
import { defaultStyle, highlightedStyle, selectedStyle } from './style/defaultStyleOptions';

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

const overloadStyle = (style: AnnotationStyle, customStyle?: PartialAnnotationStyle): AnnotationStyle => {
    if(!customStyle) {
        return style;
    }
    
    // @Dimitri ou Manu : ici, le typage est assez lâche, et je n'ai pas encore réussi à le rendre plus strict.
    // Comme on est dans un environnement contrôlé, est-ce que ça vaut le coup d'y passer plus de temps ?
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

// @Dimitri et Manu l'orientation du label est désactivée en raison de la gestion du tracé avec des Path2D
// faut-il trouver un moyen de le remettre en l'état, ou en profiter
// pour corriger le comportement : toujours garder le label horizontal, mais en décalé "intelligent"
// par rapport à la forme ?
const drawLabel = (renderingContext: CanvasRenderingContext2D, label: string, from: Coordinates, to: Coordinates, customStyle?: PartialAnnotationStyle): Path2D => {
    const distanceX = to.x - from.x;
    const distanceY = to.y - from.y;
    const textSize = renderingContext.measureText(label);
    renderingContext.save();
    const style = overloadStyle(defaultStyle, customStyle);
    const { textAlign, textColor, fillColor, shadow } = style.label;
    const { offsetX, offsetY, color, blur } = shadow;

    renderingContext.textAlign = textAlign;
    // renderingContext.translate(from.x, from.y);
    // renderingContext.rotate(Math.atan2(distanceY, distanceX));
    renderingContext.shadowOffsetX = offsetX;
    renderingContext.shadowOffsetY = offsetY;
    renderingContext.shadowColor = color;
    renderingContext.shadowBlur = blur;
    renderingContext.fillStyle = fillColor;
    const path = drawRoundRect(renderingContext, { x: from.x - 2, y: from.y -20 }, textSize.width + 10, 20, 10);
    renderingContext.restore();
    renderingContext.save();
    renderingContext.fillStyle = textColor;
    renderingContext.fillText(label, from.x + 2, from.y -5);
    renderingContext.restore();

    return path;
};

const getStyle = (annotationId: string, styledAnnotations?: Map<string, StyleOptions>): AnnotationStyle => {
    const stylingStatusDatas: StyleOptions[] = [];
    
    if (!styledAnnotations) {
        return defaultStyle;
    }
    styledAnnotations.forEach((stylingStatus) => {
        if (stylingStatus.annotationsId.includes(annotationId)) {
            stylingStatusDatas.push(stylingStatus)
        }
    })
    if (!stylingStatusDatas.length) {
        return defaultStyle;
    }

    const { style } = stylingStatusDatas.sort((style1, style2) => style1.priority - style2.priority)[stylingStatusDatas.length - 1];

    return overloadStyle(defaultStyle, style);

}

// @Dimitri ou Manu
// on a à mon sens des cas métier de roadcare écrits en dur dans l'AE :
// - highlighted du premier point d'un polygone au survol (devient + gros)
// - couleur différente des points et des lignes selon que l'on est 
// sélectionné ou en cours d'édition
// est-ce voulu, ou faut-il tout extraire et le gérer uniquement 
// via l'objet operations selon des règles définies par userland ?
export const drawPoint = (
    type: SelectionTypes,
    renderingContext: CanvasRenderingContext2D,
    coordinates: Coordinates,
    style: AnnotationStyle = defaultStyle,
): void => {
    renderingContext.beginPath();

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

// @Dimitri ou Manu :
// pour le moment, je n'ai stylisé (et rendu cliquables) que les labels, au survol et à la sélection
// Prévoit-on dès à présent d'étendre le comportement au clic / survol des formes elles-mêmes
// ainsi qu'étendre la stylisation aux formes ?
export const drawAnnotations = (renderingContext: CanvasRenderingContext2D, annotations: Annotation[], styledAnnotations: Map<string, StyleOptions>, annotationsPaths: Map<string, AnnotationPathData>): void => {
    annotations.forEach((annotation) => {
        let previousCoordinates: Coordinates | undefined =
            annotation.coordinates.length > 2 ? annotation.coordinates[annotation.coordinates.length - 1] : undefined;

        const style = getStyle(annotation.id, styledAnnotations);

        annotation.coordinates.forEach((coordinates: Coordinates, index: number) => {
            if (previousCoordinates) {
                if (annotation.isClosed === false) {
                    if (index > 0) {
                        drawLine('UNSELECTED', renderingContext, previousCoordinates, coordinates);
                    }
                } else {
                    drawLine('UNSELECTED', renderingContext, previousCoordinates, coordinates);
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
            drawPoint('UNSELECTED', renderingContext, middlePoint, style);
            const path = drawLabel(renderingContext, annotation.name, firstPoint, secondPoint, style);
            annotationsPaths.set(annotation.id, {label: path});
        }
        if (annotation.coordinates.length >= 2) {
            const firstPoint = annotation.coordinates[0];
            const secondPoint = annotation.coordinates[1];
            const path = drawLabel(renderingContext, annotation.name, firstPoint, secondPoint, style);
            annotationsPaths.set(annotation.id, {label: path});
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
            drawPoint('HIGHLIGHTED', renderingContext, annotationPoint, highlightedStyle);
        } else {
            drawPoint('SELECTED', renderingContext, annotationPoint, selectedStyle);
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
