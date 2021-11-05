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
    | MouseMoveOnLabelAreaEvent // @laurent
    | MouseDownOnAnnotationLabelEvent // @laurent
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

// @laurent
export interface MouseMoveOnLabelAreaEvent {
    type: 'mouse_move_on_label_area_event';
    at: Coordinates;
    pointIds: Array<PointId>;
    currentGeometry: Array<Coordinates>;
    event: MouseEvent;
}

export interface MouseDownOnAnnotationLabelEvent {
    type: 'mouse_down_on_annotation_label_event';
    at: Coordinates;
    clickedAnnotation: Annotation;
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

    /** @laurent
     * Returns the coordinates of a mouse event in the canvas referential
     * @param canvas 
     * @param event 
     * @returns 
     */
    const canvasCoordinateOf = (canvas: HTMLCanvasElement, event: MouseEvent): Coordinates => {
        const rect = canvas.getBoundingClientRect();

        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        };
    };

    /** @laurent
     * Returns an array of points ids from a given list: these points are in a small circle around the click
     * @param coordinates 
     * @param clickAt 
     * @returns 
     */
    const detectClickOnExistingPoints = (coordinates: Array<Coordinates>, clickAt: Coordinates): Array<PointId> =>
        coordinates
            .map((coordinate, idx) => ({ coordinate, idx }))
            .filter(({ coordinate }) => areCoordinatesInsideCircle(coordinate, clickAt, 7))
            .map(({ idx }) => idx);

    /** @laurent
     * Returns an array of points ids from a given list: these points are in a small circle around the mouse position
     * @param coordinates 
     * @param moveOn 
     * @returns 
     */
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

    /** @laurent
     * fills annotationPointsRef.current with the coordinates of the annotation to edit (clear it if none)
     */
    useEffect(() => {
        if (annotationToEdit) {
            annotationPointsRef.current = annotationToEdit.coordinates;
        } else {
            annotationPointsRef.current = [];
        }
    }, [annotationToEdit]);

    /** @laurent
     * Removes the annotation to edit from an array of annotations (?)
     */
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

    /** @laurent
     * clears the canvas and then paints:
     * - the previously drawn annotations
     * - the annotation to edit
     */
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

    /** @laurent
     * creates a new event handler and links it to some instance of Annotation Engine ??
     * => cancelCreation: clears annotationToEdit and repaints everything
     */
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
            // @laurent "existing point" = from the annotation to edit!
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
            // @laurent add something to draw later
            drawOnCanvas: (draw: (context2d: CanvasRenderingContext2D) => void) => {
                delayDraw.push(draw);
            },
        };

        /** @laurent when an event occurs, repaints all the canvas
         * and executes a list of drawings stored in "delayDraw"
         * 
         * @param handler 
         */
        const handleEvent = (handler: (canvas: HTMLCanvasElement) => void) => {
            if (currentCanvasRef) {
                handler(currentCanvasRef);
                drawScene();
                const context2d = currentCanvasRef.getContext('2d');
                if (context2d) {
                    delayDraw.forEach((draw) => draw(context2d));
                }
                // @laurent contains a succession of function declarations that will be executed 
                // each one after the other?
                delayDraw = [];
            }
        };

        // @laurent
        /**
         * lists all event behaviors
         * with onEvent, fires objects events along with operations object
         * @param event 
         * @returns 
         */
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
                // @laurent
                const renderingContext = renderingContextRef.current;
                // FIXME remove the !
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const annotationLabelWasClicked = (annotation: Annotation, coordinates: Coordinates): boolean => !!renderingContext?.isPointInPath(annotation!.label!.path, coordinates.x, coordinates.y);

                const clickedLabelAnnotation = annotations.find((annotation) => annotationLabelWasClicked(annotation, eventCoords));

                if (clickedLabelAnnotation) {
                    onEvent(
                        {
                            type: 'mouse_down_on_annotation_label_event',
                            at: eventCoords,
                            event,
                            clickedAnnotation: clickedLabelAnnotation,
                        },
                        operations,
                    )
                }

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

               
                // if (isInLabel) {
                //     onEvent(
                //         {
                //             type: 'mouse_move_on_label_area_event',
                //             at: eventCoords,
                //             pointIds: isMoveOnExistingPointsIdx,
                //             currentGeometry: [...annotationPointsRef.current],
                //             event,
                //         },
                //         operations,
                //     );
                // } else {
                //     console.info('no')
                // }

                // endLaurent
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
    }, [drawScene, canvasRef, onEvent, annotations]);
};

export default useAnnotationEngine;
