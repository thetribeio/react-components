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
export type Events =
    | MouseDownEvent
    | MouseDownOnExistingPointEvent
    | MouseMoveOnExistingPointEvent
    | MouseMove
    | MouseUp
    | ReleaseKeyEvent
    | PushKeyEvent
    | MouseUpOnExistingPointEvent
    | MouseWheelEvent;
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

export interface MouseMoveOnExistingPointEvent {
    type: 'mouse_move_on_existing_point_event';
    at: Coordinates;
    pointIds: Array<PointId>;
    currentGeometry: Array<Coordinates>;
    event: MouseEvent;
}

export interface MouseWheelEvent {
    type: 'mouse_wheel_event';
    deltaX: number;
    deltaY: number;
    event: WheelEvent;
}

export interface ReleaseKeyEvent {
    type: 'release_key_event';
    currentGeometry: Array<Coordinates>;
    event: KeyboardEvent;
}

export interface PushKeyEvent {
    type: 'push_key_event';
    currentGeometry: Array<Coordinates>;
    event: KeyboardEvent;
}

export interface Operations {
    addPoint(at: Coordinates): PointId;
    highlightExistingPoint(at: Coordinates): void;
    removeHighlightPoint(): void;
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
    const annotationHighlightPointIndexRef = useRef<number>(-1);
    const MOVE_ON_EXISTING_POINTS_RADIUS_DETECTION = 4;

    const canvasCoordinateOf = (canvas: HTMLCanvasElement, event: MouseEvent): Coordinates => {
        const rect = canvas.getBoundingClientRect();

        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        };
    };

    const detectClickOnExistingPoints = (coordinates: Array<Coordinates>, clickAt: Coordinates): Array<PointId> =>
        coordinates
            .map((coordinate, idx) => ({ coordinate, idx }))
            .filter(({ coordinate }) => areCoordinatesInsideCircle(coordinate, clickAt, 7))
            .map(({ idx }) => idx);

    const detectMoveOnExistingPoints = (coordinates: Array<Coordinates>, moveOn: Coordinates): Array<PointId> => {
        const coords = [...coordinates];
        coords.pop();

        return coords
            .map((coordinate, idx) => ({ coordinate, idx }))
            .filter(({ coordinate }) =>
                areCoordinatesInsideCircle(coordinate, moveOn, MOVE_ON_EXISTING_POINTS_RADIUS_DETECTION),
            )
            .map(({ idx }) => idx);
    };

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

        // FIXME: ici on dessine les points de annotationPointsRef.current
        drawCurrentAnnotation(
            renderingContextRef.current,
            annotationPointsRef.current,
            annotationHighlightPointIndexRef.current,
            annotationPointsRef.current === annotationToEdit?.coordinates,
            annotationToEdit,
        );
    }, [annotationsToDraw, canvasRef, annotationToEdit]);

    useImperativeHandle(ref, () => ({
        cancelCreation() {
            if (annotationToEdit === undefined) {
                annotationPointsRef.current = [];
                drawScene();
            }
        },
    }));

    // Initialize canvas
    useEffect(() => {
        const currentCanvasRef = canvasRef.current;

        let delayDraw: Array<(context2d: CanvasRenderingContext2D) => void> = [];
        const operations: Operations = {
            addPoint: (at: Coordinates) => annotationPointsRef.current.push(at) - 1,
            highlightExistingPoint: (at: Coordinates) => {
                const index = annotationPointsRef.current.findIndex((point) =>
                    areCoordinatesInsideCircle(point, at, MOVE_ON_EXISTING_POINTS_RADIUS_DETECTION),
                );
                if (index === -1) {
                    return;
                }
                annotationHighlightPointIndexRef.current = index;
            },
            removeHighlightPoint: () => {
                annotationHighlightPointIndexRef.current = -1;
            },
            movePoint: (pointId: PointId, to: Coordinates) => {
                // FIXME: juste le curseur pendant que ça bouge...
                annotationPointsRef.current[pointId] = to;
            },
            finishCurrentLine: () => {
                annotationPointsRef.current = [];
            },
            drawOnCanvas: (draw: (context2d: CanvasRenderingContext2D) => void) => {
                delayDraw.push(draw);
            },
        };

        const handleEvent = (handler: (canvas: HTMLCanvasElement) => void) => {
            if (currentCanvasRef) {
                handler(currentCanvasRef);
                drawScene();
                const context2d = currentCanvasRef.getContext('2d');
                if (context2d) {
                    delayDraw.forEach((draw) => draw(context2d));
                }
                delayDraw = [];
            }
        };

        const handleMouseUp = (event: MouseEvent) =>
            handleEvent((canvas) => {
                const eventCoords = canvasCoordinateOf(canvas, event);
                const isClickOnExistingPointsIdx = detectClickOnExistingPoints(
                    annotationPointsRef.current,
                    eventCoords,
                );

                if (isClickOnExistingPointsIdx.length > 0) {
                    onEvent(
                        {
                            type: 'mouse_up_on_existing_point_event',
                            at: eventCoords,
                            pointIds: isClickOnExistingPointsIdx,
                            currentGeometry: [...annotationPointsRef.current],
                            event,
                        },
                        operations,
                    );
                } else {
                    onEvent(
                        {
                            type: 'mouse_up_event',
                            at: eventCoords,
                            currentGeometry: [...annotationPointsRef.current],
                            event,
                        },
                        operations,
                    );
                }
            });

        const handleMouseDown = (event: MouseEvent) =>
            handleEvent((canvas) => {
                const eventCoords = canvasCoordinateOf(canvas, event);
                const isClickOnExistingPointsIdx = detectClickOnExistingPoints(
                    annotationPointsRef.current,
                    eventCoords,
                );

                if (isClickOnExistingPointsIdx.length > 0) {
                    onEvent(
                        {
                            type: 'mouse_down_on_existing_point_event',
                            at: eventCoords,
                            pointIds: isClickOnExistingPointsIdx,
                            currentGeometry: [...annotationPointsRef.current],
                            event,
                        },
                        operations,
                    );
                } else {
                    onEvent(
                        {
                            type: 'mouse_down_event',
                            at: eventCoords,
                            currentGeometry: [...annotationPointsRef.current],
                            event,
                        },
                        operations,
                    );
                }
            });

        const handleMouseMove = (event: MouseEvent) =>
            handleEvent((canvas) => {
                const eventCoords = canvasCoordinateOf(canvas, event);
                const isMoveOnExistingPointsIdx = detectMoveOnExistingPoints(annotationPointsRef.current, eventCoords);

                if (isMoveOnExistingPointsIdx.length > 0) {
                    onEvent(
                        {
                            type: 'mouse_move_on_existing_point_event',
                            at: eventCoords,
                            pointIds: isMoveOnExistingPointsIdx,
                            currentGeometry: [...annotationPointsRef.current],
                            event,
                        },
                        operations,
                    );
                } else {
                    onEvent(
                        {
                            type: 'mouse_move_event',
                            to: canvasCoordinateOf(canvas, event),
                            currentGeometry: [...annotationPointsRef.current],
                            event,
                        },
                        operations,
                    );
                }
            });

        const handleMouseWheel = (event: WheelEvent) =>
            handleEvent(() => {
                onEvent(
                    {
                        type: 'mouse_wheel_event',
                        deltaX: event.deltaX,
                        deltaY: event.deltaY,
                        event,
                    },
                    operations,
                );
            });

        const handleReleaseKey = (event: KeyboardEvent) =>
            handleEvent(() => {
                onEvent(
                    {
                        type: 'release_key_event',
                        currentGeometry: [...annotationPointsRef.current],
                        event,
                    },
                    operations,
                );
            });

        const handlePushKey = (event: KeyboardEvent) =>
            handleEvent(() => {
                onEvent(
                    {
                        type: 'push_key_event',
                        currentGeometry: [...annotationPointsRef.current],
                        event,
                    },
                    operations,
                );
            });

        if (currentCanvasRef) {
            const canvasRenderingContext = currentCanvasRef.getContext('2d');

            if (canvasRenderingContext) {
                currentCanvasRef.addEventListener('mousedown', handleMouseDown);
                currentCanvasRef.addEventListener('mouseup', handleMouseUp);
                currentCanvasRef.addEventListener('mousemove', handleMouseMove);
                currentCanvasRef.addEventListener('wheel', handleMouseWheel);
                // FIXME: can not catch key events on canvas :(
                document.addEventListener('keyup', handleReleaseKey);
                document.addEventListener('keydown', handlePushKey);

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
                // FIXME: can not catch key events on canvas :(
                document.removeEventListener('keyup', handleReleaseKey);
                document.removeEventListener('keydown', handlePushKey);
            }
        };
    }, [drawScene, canvasRef, onEvent]);
};

export default useAnnotationEngine;
