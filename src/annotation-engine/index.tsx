import React, { FC, useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Annotation, Coordinates } from './models';
import Canvas from './style/canvas';
import Container from './style/container';
import Image from './style/image';
import { areCoordinatesInsideCircle, drawAnnotations, drawCurrentAnnotation } from './utils';

export interface AnnotationEngineProps {
    className?: string;
    annotations: Annotation[];
    annotationToEdit?: Annotation;
    backgroundImagePath: string;
    foregroundImagePath?: string;
    id?: string;
    numberOfPoints?: number;
    onAnnotationEnded?: (annotationPoints: Coordinates[]) => void;
}

const AnnotationEngine: FC<AnnotationEngineProps> = ({
    annotationToEdit,
    annotations = [],
    backgroundImagePath,
    className,
    foregroundImagePath,
    id = 'annotation-engine',
    numberOfPoints = 2,
    onAnnotationEnded,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [renderingContext, setRenderingContext] = useState<CanvasRenderingContext2D | null>(null);
    const annotationPointsRef = useRef<Coordinates[]>([]);
    const annotationPointDraggedIndexRef = useRef<number | undefined>();

    useEffect(() => {
        if (annotationToEdit) {
            annotationPointsRef.current = annotationToEdit.coordinates;
        }
    }, [annotationToEdit]);

    const annotationsToDraw = useMemo<Annotation[]>(() => {
        if (annotationToEdit) {
            const annotationToEditIndex = annotations.findIndex(
                (annotation: Annotation) => annotation.id === annotationToEdit.id,
            );

            if (annotationToEditIndex >= 0) {
                return [
                    ...annotations.slice(0, annotationToEditIndex),
                    ...annotations.slice(annotationToEditIndex + 1),
                ];
            }
        }

        return [...annotations];
    }, [annotations, annotationToEdit]);

    const drawScene = useCallback(() => {
        const currentCanvasRef = canvasRef.current;

        if (!renderingContext || !currentCanvasRef) {
            return;
        }

        renderingContext.clearRect(0, 0, currentCanvasRef.width, currentCanvasRef.height);

        drawAnnotations(renderingContext, annotationsToDraw);

        drawCurrentAnnotation(renderingContext, annotationPointsRef.current, numberOfPoints);
    }, [renderingContext, annotationsToDraw, numberOfPoints]);

    // Initialize canvas
    useEffect(() => {
        const currentCanvasRef = canvasRef.current;

        const handleMouseUp = (event: MouseEvent) => {
            if (!currentCanvasRef) {
                return;
            }

            const rect = currentCanvasRef.getBoundingClientRect();
            const clickCoordinates: Coordinates = {
                x: event.clientX - rect.left,
                y: event.clientY - rect.top,
            };

            if (
                annotationPointsRef.current.length < numberOfPoints &&
                annotationPointDraggedIndexRef.current === undefined
            ) {
                annotationPointsRef.current.push(clickCoordinates);

                if (annotationPointsRef.current.length === numberOfPoints && onAnnotationEnded) {
                    onAnnotationEnded(annotationPointsRef.current);
                    annotationPointsRef.current = [];
                }

                drawScene();
            } else if (annotationPointDraggedIndexRef.current !== undefined) {
                annotationPointsRef.current[annotationPointDraggedIndexRef.current] = clickCoordinates;

                if (annotationPointsRef.current.length === numberOfPoints && onAnnotationEnded) {
                    onAnnotationEnded(annotationPointsRef.current);
                    annotationPointsRef.current = [];
                }

                drawScene();

                annotationPointDraggedIndexRef.current = undefined;
            }
        };

        const handleMouseDown = (event: MouseEvent) => {
            if (!currentCanvasRef) {
                return;
            }

            const rect = currentCanvasRef.getBoundingClientRect();
            const clickCoordinates: Coordinates = {
                x: event.clientX - rect.left,
                y: event.clientY - rect.top,
            };

            for (let i = 0; i < annotationPointsRef.current.length; i++) {
                const annotationPoint = annotationPointsRef.current[i];

                if (areCoordinatesInsideCircle(annotationPoint, clickCoordinates, 7)) {
                    annotationPointDraggedIndexRef.current = i;
                    break;
                }
            }
        };

        const handleMouseMove = (event: MouseEvent) => {
            if (!currentCanvasRef) {
                return;
            }

            const rect = currentCanvasRef.getBoundingClientRect();
            const mouseCoordinates: Coordinates = {
                x: event.clientX - rect.left,
                y: event.clientY - rect.top,
            };

            if (annotationPointDraggedIndexRef.current !== undefined) {
                annotationPointsRef.current[annotationPointDraggedIndexRef.current] = mouseCoordinates;
                drawScene();
            }
        };

        if (currentCanvasRef) {
            const canvasRenderingContext = currentCanvasRef.getContext('2d');

            if (canvasRenderingContext) {
                currentCanvasRef.addEventListener('mousedown', handleMouseDown);
                currentCanvasRef.addEventListener('mouseup', handleMouseUp);
                currentCanvasRef.addEventListener('mousemove', handleMouseMove);

                currentCanvasRef.width = currentCanvasRef.offsetWidth;
                currentCanvasRef.height = currentCanvasRef.offsetHeight;

                setRenderingContext(canvasRenderingContext);

                drawScene();
            }
        }

        return () => {
            if (currentCanvasRef) {
                currentCanvasRef.removeEventListener('mouseup', handleMouseUp);
                currentCanvasRef.removeEventListener('mousedown', handleMouseDown);
                currentCanvasRef.removeEventListener('mousemove', handleMouseMove);
            }
        };
    }, [renderingContext, drawScene, numberOfPoints, onAnnotationEnded]);

    return (
        <Container className={className}>
            <Image src={backgroundImagePath} />
            {foregroundImagePath && <Image src={foregroundImagePath} />}
            <Canvas ref={canvasRef} id={id} />
        </Container>
    );
};

export default AnnotationEngine;
