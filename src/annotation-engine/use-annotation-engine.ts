import { useRef, useMemo, useEffect, useCallback, RefObject } from 'react';
import { Annotation, Coordinates } from './models';
import { areCoordinatesInsideCircle, drawAnnotations, drawCurrentAnnotation, drawLine, drawPoint } from './utils';

interface UseAnnotationEngineArgs {
    annotations: Annotation[];
    annotationToEdit?: Annotation;
    numberOfPoints: number;
    onAnnotationEnded?: (annotationPoints: Coordinates[]) => void;
    onAnnotationDragged?: (annotationPoints: Coordinates[]) => void;
    ref: RefObject<HTMLCanvasElement>;
}

interface UseAnnotationEngineReturnType {
    canvasRef: RefObject<HTMLCanvasElement>;
}

const useAnnotationEngine = ({
    annotationToEdit,
    annotations,
    numberOfPoints,
    onAnnotationEnded,
    onAnnotationDragged,
    ref,
}: UseAnnotationEngineArgs): UseAnnotationEngineReturnType => {
    const canvasRef = ref;
    const renderingContextRef = useRef<CanvasRenderingContext2D | undefined>(undefined);
    const annotationPointsRef = useRef<Coordinates[]>([]);
    const annotationPointDraggedIndexRef = useRef<number | undefined>();

    useEffect(() => {
        if (annotationToEdit) {
            annotationPointsRef.current = annotationToEdit.coordinates;
        } else {
            annotationPointsRef.current = [];
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

        if (!renderingContextRef.current || !currentCanvasRef) {
            return;
        }

        renderingContextRef.current.clearRect(0, 0, currentCanvasRef.width, currentCanvasRef.height);

        drawAnnotations(renderingContextRef.current, annotationsToDraw);

        drawCurrentAnnotation(renderingContextRef.current, annotationPointsRef.current, numberOfPoints);
    }, [annotationsToDraw, numberOfPoints, canvasRef]);

    // Initialize canvas
    useEffect(() => {
        const currentCanvasRef = canvasRef.current;

        let dragStart = false;
        let startCoordinates: Coordinates;
        let endCoordinates: Coordinates;

        const handleMouseUp = (event: MouseEvent) => {
            if (!currentCanvasRef) {
                return;
            }

            const rect = currentCanvasRef.getBoundingClientRect();
            const draggedCoordinates: Coordinates = {
                x: event.clientX - rect.left,
                y: event.clientY - rect.top,
            };
            dragStart = false;
            startCoordinates = draggedCoordinates;

            if (
                annotationPointsRef.current.length < numberOfPoints &&
                annotationPointDraggedIndexRef.current === undefined
            ) {
                annotationPointsRef.current.push(draggedCoordinates);

                if (annotationPointsRef.current.length === numberOfPoints && onAnnotationEnded) {
                    onAnnotationEnded(annotationPointsRef.current);
                    annotationPointsRef.current = [];
                }

                drawScene();
            } else if (annotationPointDraggedIndexRef.current !== undefined) {
                annotationPointsRef.current[annotationPointDraggedIndexRef.current] = draggedCoordinates;

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
            const draggedCoordinates: Coordinates = {
                x: event.clientX - rect.left,
                y: event.clientY - rect.top,
            };
            dragStart = true;

            for (let i = 0; i < annotationPointsRef.current.length; i++) {
                const annotationPoint = annotationPointsRef.current[i];

                if (areCoordinatesInsideCircle(annotationPoint, draggedCoordinates, 7)) {
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
            const draggedCoordinates: Coordinates = {
                x: event.clientX - rect.left,
                y: event.clientY - rect.top,
            };
            endCoordinates = draggedCoordinates;

            drawScene();
            if (dragStart) {
                if (annotationPointDraggedIndexRef.current === undefined) {
                    if (startCoordinates && endCoordinates) {
                        drawLine(
                            renderingContextRef.current as CanvasRenderingContext2D,
                            startCoordinates,
                            endCoordinates,
                        );
                        drawPoint(renderingContextRef.current as CanvasRenderingContext2D, endCoordinates);
                        if (onAnnotationDragged) {
                            onAnnotationDragged([startCoordinates, endCoordinates]);
                        }
                    } else {
                        drawPoint(
                            renderingContextRef.current as CanvasRenderingContext2D,
                            startCoordinates || endCoordinates,
                        );
                        if (onAnnotationDragged) {
                            onAnnotationDragged([startCoordinates || endCoordinates]);
                        }
                    }
                } else {
                    startCoordinates = {
                        x: annotationPointsRef.current[annotationPointDraggedIndexRef.current].x,
                        y: annotationPointsRef.current[annotationPointDraggedIndexRef.current].y,
                    };
                    annotationPointsRef.current[annotationPointDraggedIndexRef.current] = draggedCoordinates;
                    drawLine(renderingContextRef.current as CanvasRenderingContext2D, startCoordinates, endCoordinates);
                    drawPoint(renderingContextRef.current as CanvasRenderingContext2D, endCoordinates);
                    if (onAnnotationDragged) {
                        onAnnotationDragged(annotationPointsRef.current);
                    }
                }
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

                renderingContextRef.current = canvasRenderingContext;

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
    }, [drawScene, numberOfPoints, onAnnotationEnded, onAnnotationDragged]);

    return { canvasRef };
};

export default useAnnotationEngine;
