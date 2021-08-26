import { useRef, useMemo, useEffect, useCallback, RefObject, useImperativeHandle, ForwardedRef } from 'react';
import { Annotation, Coordinates } from './models';
import { areCoordinatesInsideCircle, drawAnnotations, drawCurrentAnnotation } from './utils';

interface UseAnnotationEngineArgs {
    annotations: Annotation[];
    annotationToEdit?: Annotation;
    onEvent: OnEvent;
    canvasRef: RefObject<HTMLCanvasElement>;
    ref: ForwardedRef<Handles>;
}

export interface Handles {
    cancelCreation: () => void;
}

export type PointId = number;
export type Events = MouseDownEvent | MouseDownOnExistingPointEvent | MouseMove | MouseUp | MouseUpOnExistingPointEvent | MouseWheelEvent;
export type OnEvent = (event: Events, operations: Operations) => void;

export interface MouseDownEvent {
    type: 'mouse_down_event';
    at: Coordinates;
    currentGeometry: Array<Coordinates>;
    event: MouseEvent;
}

export interface MouseDownOnExistingPointEvent {
    type: 'mouse_down_on_existing_point_event';
    at: Coordinates;
    pointIds: Array<PointId>;
    currentGeometry: Array<Coordinates>;
    event: MouseEvent;
}

export interface MouseMove {
    type: 'mouse_move_event';
    to: Coordinates;
    currentGeometry: Array<Coordinates>;
    event: MouseEvent;
}

export interface MouseUp {
    type: 'mouse_up_event';
    at: Coordinates;
    currentGeometry: Array<Coordinates>;
    event: MouseEvent;
}

export interface MouseUpOnExistingPointEvent {
    type: 'mouse_up_on_existing_point_event';
    at: Coordinates;
    pointIds: Array<PointId>;
    currentGeometry: Array<Coordinates>;
    event: MouseEvent;
}

export interface MouseWheelEvent {
    type: 'mouse_wheel_event';
    deltaX: number;
    deltaY: number;
    event: WheelEvent
}

export interface Operations {
    addPoint(at: Coordinates): PointId;
    movePoint(pointId: PointId, to: Coordinates): void;
    finishCurrentLine(): void;
    drawOnCanvas(draw: (context2d: CanvasRenderingContext2D) => void): void;
}

const useAnnotationEngine = ({
    annotationToEdit,
    annotations,
    onEvent,
    canvasRef,
    ref,
}: UseAnnotationEngineArgs): void => {
    const renderingContextRef = useRef<CanvasRenderingContext2D | undefined>(undefined);
    const annotationPointsRef = useRef<Coordinates[]>([]);

    const canvasCoordinateOf = (canvas: HTMLCanvasElement, event: MouseEvent): Coordinates => {
        const rect = canvas.getBoundingClientRect();

        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        };
    };
    
    const detectClickOnExistingPoints = (coordinates: Array<Coordinates>, clickAt: Coordinates): Array<PointId> => coordinates
            .map((coordinate, idx) => ({coordinate, idx}))
            .filter(({coordinate}) => areCoordinatesInsideCircle(coordinate, clickAt, 7))
            .map(({idx}) => idx)

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

        drawCurrentAnnotation(renderingContextRef.current, annotationPointsRef.current, annotationPointsRef.current === annotationToEdit?.coordinates);
    }, [annotationsToDraw, canvasRef, annotationToEdit]);

    useImperativeHandle(ref, () => ({
        cancelCreation() {
            if (annotationToEdit === undefined) {
                annotationPointsRef.current = [];
                drawScene();
            }
        }
    }));

    // Initialize canvas
    useEffect(() => {
        const currentCanvasRef = canvasRef.current;

        let delayDraw: Array<(context2d: CanvasRenderingContext2D) => void> = [];
        const operations: Operations = {
            addPoint: (at: Coordinates) => annotationPointsRef.current.push(at) - 1,
            movePoint: (pointId: PointId, to: Coordinates) => {
                annotationPointsRef.current[pointId] = to;
            },
            finishCurrentLine: () => {
                annotationPointsRef.current = [];
            },
            drawOnCanvas: (draw: (context2d: CanvasRenderingContext2D) => void) => {
                delayDraw.push(draw);
            }
        };

        const handleEvent = (handler: (canvas: HTMLCanvasElement) => void) => {
            if (currentCanvasRef) {
                handler(currentCanvasRef);
                drawScene();
                const context2d = currentCanvasRef.getContext('2d');
                if (context2d) {
                    delayDraw.forEach(draw => draw(context2d));
                }
                delayDraw = [];
            }
        };
        
        const handleMouseUp = (event: MouseEvent) => handleEvent((canvas) => {
            const eventCoords = canvasCoordinateOf(canvas, event);
            const isClickOnExistingPointsIdx = detectClickOnExistingPoints(annotationPointsRef.current, eventCoords);
            
            if (isClickOnExistingPointsIdx.length > 0) {
                onEvent({
                    type: 'mouse_up_on_existing_point_event',
                    at: eventCoords,
                    pointIds: isClickOnExistingPointsIdx,
                    currentGeometry: [...annotationPointsRef.current],
                    event,
                }, operations);
            } else {
                onEvent({
                    type: 'mouse_up_event',
                    at: eventCoords,
                    currentGeometry: [...annotationPointsRef.current],
                    event,
                }, operations);
            }
        });

        const handleMouseDown = (event: MouseEvent) => handleEvent((canvas) => {
            const eventCoords = canvasCoordinateOf(canvas, event);
            const isClickOnExistingPointsIdx = detectClickOnExistingPoints(annotationPointsRef.current, eventCoords);
            
            if (isClickOnExistingPointsIdx.length > 0) {
                onEvent({
                    type: 'mouse_down_on_existing_point_event',
                    at: eventCoords,
                    pointIds: isClickOnExistingPointsIdx,
                    currentGeometry: [...annotationPointsRef.current],
                    event,
                }, operations);
            } else {
                onEvent({
                    type: 'mouse_down_event',
                    at: eventCoords,
                    currentGeometry: [...annotationPointsRef.current],
                    event,
                }, operations);
            }
        });

        const handleMouseMove = (event: MouseEvent) => handleEvent((canvas) => {
            onEvent({
                type: 'mouse_move_event',
                to: canvasCoordinateOf(canvas, event),
                currentGeometry: [...annotationPointsRef.current],
                event,
            }, operations);
        });

        const handleMouseWheel = (event: WheelEvent) => handleEvent(() => {
            onEvent({
                type: 'mouse_wheel_event',
                deltaX: event.deltaX,
                deltaY: event.deltaY,
                event,
            }, operations);
        });

        if (currentCanvasRef) {
            const canvasRenderingContext = currentCanvasRef.getContext('2d');

            if (canvasRenderingContext) {
                currentCanvasRef.addEventListener('mousedown', handleMouseDown);
                currentCanvasRef.addEventListener('mouseup', handleMouseUp);
                currentCanvasRef.addEventListener('mousemove', handleMouseMove);
                currentCanvasRef.addEventListener('wheel', handleMouseWheel);

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
                currentCanvasRef.removeEventListener('wheel', handleMouseWheel);
            }
        };
    }, [drawScene, canvasRef, onEvent]);
};

export default useAnnotationEngine;
