import React, { FC, useCallback, useEffect, useRef, useState } from 'react';
import Canvas from './style/canvas';
import Container from './style/container';
import Image from './style/image';
import useAnnotationEngine, { UseAnnotationEngineArgs } from './use-annotation-engine';

export { useAnnotationEngine, UseAnnotationEngineArgs };

export interface AnnotationEngineProps {
    width: number;
    height: number;
    annotations: Annotation[];
    backgroundImgPath?: string;
    foregroundImagePath?: string;
    id?: string;
    start?: Coordinates;
    end?: Coordinates;
    setStart: (start: Coordinates) => void;
    setEnd: (end: Coordinates) => void;
    onAnnotationEnd?: (start: Coordinates, end: Coordinates) => void;
    onAnnotationEdit?: (start: Coordinates, end: Coordinates) => void;
}

export type Coordinates = {
    x: number;
    y: number;
};

export type Annotation = {
    name: string;
    coordinates: Coordinates[];
};

const areCoordinatesInsideCircle = (
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

const roundRect = (
    renderingContext: CanvasRenderingContext2D,
    coordinates: Coordinates,
    width: number,
    height: number,
    radius: number,
) => {
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

const AnnotationEngine: FC<AnnotationEngineProps> = ({
    annotations,
    backgroundImgPath,
    end,
    foregroundImagePath,
    height,
    id = 'annotation-engine',
    onAnnotationEdit,
    onAnnotationEnd,
    setEnd,
    setStart,
    start,
    width,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [renderingContext, setRenderingContext] = useState<CanvasRenderingContext2D | null>(null);

    const drawAnnotations = useCallback(() => {
        if (!renderingContext) {
            return;
        }

        annotations.forEach((annotation) => {
            let previousCoordinates: Coordinates;

            annotation.coordinates.forEach((coordinates) => {
                if (previousCoordinates) {
                    renderingContext.beginPath();
                    renderingContext.strokeStyle = '#FFFFFF';
                    renderingContext.lineCap = 'round';
                    renderingContext.moveTo(previousCoordinates.x, previousCoordinates.y);
                    renderingContext.lineTo(coordinates.x, coordinates.y);
                    renderingContext.lineWidth = 5;
                    renderingContext.stroke();
                    renderingContext.closePath();
                }

                previousCoordinates = coordinates;
            });

            if (annotation.coordinates.length >= 2) {
                const firstPoint = annotation.coordinates[0];
                const secondPoint = annotation.coordinates[1];

                const distanceX = secondPoint.x - firstPoint.x;
                const distanceY = secondPoint.y - firstPoint.y;

                const textSize = renderingContext.measureText(annotation.name);

                renderingContext.save();
                renderingContext.textAlign = 'left';
                renderingContext.translate(firstPoint.x, firstPoint.y);
                renderingContext.rotate(Math.atan2(distanceY, distanceX));
                renderingContext.fillStyle = '#FFFFFF';
                roundRect(renderingContext, { x: -2, y: -20 }, textSize.width + 10, 20, 10);
                renderingContext.fillStyle = '#0053CC';
                renderingContext.fillText(annotation.name, 2, -5);
                renderingContext.restore();
            }
        });
    }, [renderingContext, annotations]);

    const drawPoint = useCallback(
        (coordinates: Coordinates) => {
            if (renderingContext) {
                renderingContext.beginPath();
                renderingContext.fillStyle = '#FFFFFF';
                renderingContext.arc(coordinates.x, coordinates.y, 7, 0, Math.PI * 2, true);
                renderingContext.fill();
                renderingContext.fillStyle = '#000';
                renderingContext.closePath();

                renderingContext.beginPath();
                renderingContext.fillStyle = '#0053CC';
                renderingContext.arc(coordinates.x, coordinates.y, 5, 0, Math.PI * 2, true);
                renderingContext.fill();
                renderingContext.fillStyle = '#000';
                renderingContext.closePath();
            }
        },
        [renderingContext],
    );

    const drawLine = useCallback(
        (startCoordinates: Coordinates, endCoordinates: Coordinates) => {
            if (!renderingContext) {
                return;
            }

            renderingContext.beginPath();
            renderingContext.strokeStyle = '#0053CC';
            renderingContext.moveTo(startCoordinates.x, startCoordinates.y);
            renderingContext.lineWidth = 3;
            renderingContext.lineTo(endCoordinates.x, endCoordinates.y);
            renderingContext.stroke();
            renderingContext.closePath();
        },
        [renderingContext],
    );

    const drawScene = useCallback(
        (startCoordinates?: Coordinates, endCoordinates?: Coordinates) => {
            if (!renderingContext) {
                return;
            }

            renderingContext.clearRect(0, 0, width, height);

            drawAnnotations();

            if (startCoordinates && endCoordinates) {
                drawLine(startCoordinates, endCoordinates);
                drawPoint(endCoordinates);
            }

            if (startCoordinates) {
                drawPoint(startCoordinates);
            }
        },
        [renderingContext, drawAnnotations, drawLine, drawPoint, height, width],
    );

    // Initialize canvas
    useEffect(() => {
        const currentCanvasRef = canvasRef.current;

        let offsetLeft = 0;
        let offsetTop = 0;
        let isDraggingStart = false;
        let isDraggingEnd = false;

        const handleMouseUp = (event: MouseEvent) => {
            const clickCoordinates: Coordinates = {
                x: event.pageX - offsetLeft,
                y: event.pageY - offsetTop,
            };

            if (!start || isDraggingStart) {
                if (isDraggingStart && end && onAnnotationEdit) {
                    onAnnotationEdit(clickCoordinates, end);
                }
                setStart(clickCoordinates);
            } else if (!end || isDraggingEnd) {
                setEnd(clickCoordinates);
                if (isDraggingEnd && onAnnotationEdit) {
                    onAnnotationEdit(start, clickCoordinates);
                } else if (!isDraggingEnd && onAnnotationEnd) {
                    onAnnotationEnd(start, clickCoordinates);
                }
            }
        };

        const handleMouseDown = (event: MouseEvent) => {
            const clickCoordinates: Coordinates = {
                x: event.pageX - offsetLeft,
                y: event.pageY - offsetTop,
            };

            if (start && areCoordinatesInsideCircle(start, clickCoordinates, 7)) {
                isDraggingStart = true;
            }

            if (end && areCoordinatesInsideCircle(end, clickCoordinates, 7)) {
                isDraggingEnd = true;
            }
        };

        const handleMouseMove = (event: MouseEvent) => {
            const mouseCoordinates: Coordinates = {
                x: event.pageX - offsetLeft,
                y: event.pageY - offsetTop,
            };

            if (isDraggingStart) {
                drawScene(mouseCoordinates, end);
            } else if (isDraggingEnd) {
                drawScene(start, mouseCoordinates);
            }
        };

        if (currentCanvasRef) {
            const canvasRenderingContext = currentCanvasRef.getContext('2d');

            if (canvasRenderingContext) {
                currentCanvasRef.addEventListener('mousedown', handleMouseDown);
                currentCanvasRef.addEventListener('mouseup', handleMouseUp);
                currentCanvasRef.addEventListener('mousemove', handleMouseMove);

                offsetLeft = currentCanvasRef.offsetLeft;
                offsetTop = currentCanvasRef.offsetTop;

                setRenderingContext(canvasRenderingContext);
            }
        }

        return () => {
            if (currentCanvasRef) {
                currentCanvasRef.removeEventListener('mouseup', handleMouseUp);
                currentCanvasRef.removeEventListener('mousedown', handleMouseDown);
                currentCanvasRef.removeEventListener('mousemove', handleMouseMove);
            }
        };
    }, [renderingContext, start, end, setStart, setEnd, drawScene, onAnnotationEnd, onAnnotationEdit]);

    // Draw points and lines when start and end coordinates change
    useEffect(() => {
        drawScene(start, end);
    }, [drawScene, start, end]);

    return (
        <Container height={height} width={width}>
            {backgroundImgPath && <Image height={height} src={backgroundImgPath} width={width} />}
            {foregroundImagePath && <Image height={height} src={foregroundImagePath} width={width} />}
            <Canvas ref={canvasRef} height={height} id={id} width={width} />
        </Container>
    );
};

export default AnnotationEngine;
