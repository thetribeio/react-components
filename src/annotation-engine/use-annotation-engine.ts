import { useRef, useMemo, useEffect, useCallback, RefObject, useImperativeHandle, ForwardedRef } from 'react';
import { Annotation, PointAnnotationPathData, AnnotationPathDataById, AnnotationStyle, Coordinates, StyleData, StyleDataById, AnnotationPathData } from './models';
import defaultStyle from './style/defaultStyleOptions';
import { areCoordinatesInsideCircle, drawAnnotations, drawCurrentAnnotation, overloadStyle } from './utils';

interface UseAnnotationEngineArgs {
    annotations: Annotation[];
    annotationToEdit?: Annotation;
    onEvent: OnEvent;
    canvasRef: RefObject<HTMLCanvasElement>;
    ref: ForwardedRef<Handles>;
    annotationsToStyle: StyleDataById;
}

export interface Handles {
    cancelCreation: () => void;
}

export type PointId = number;
export type Events =
    | MouseDownEvent
    | MouseDownOnExistingPointEvent
    | MouseMoveOnExistingPointEvent
    | MouseDownOnLabelEvent
    | MouseMoveOnLabelEvent
    | MouseMove
    | MouseUp
    | KeyUpEvent
    | KeyDownEvent
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

export interface MouseDownOnLabelEvent {
    type: 'mouse_down_on_annotation_event';
    at: Coordinates;
    annotationsId: string[];
    event: MouseEvent;
}

export interface MouseMoveOnLabelEvent {
    type: 'mouse_move_on_annotation_event';
    at: Coordinates;
    annotationsIdsWithStyle: { id: string, style?: StyleData }[];
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

export interface KeyUpEvent {
    type: 'key_up_event';
    currentGeometry: Array<Coordinates>;
    event: KeyboardEvent;
}

export interface KeyDownEvent {
    type: 'key_down_event';
    currentGeometry: Array<Coordinates>;
    event: KeyboardEvent;
}

export interface Operations {
    addPoint(at: Coordinates): PointId;
    setStyleForAnnotationToEdit(annotationStyle: StyleData): void;
    setStyleForTempPoint(styleData?: StyleData): void;
    setStyleToPointsByIndexes(styleData: StyleData, ...pointsId: (string | number)[]): void;
    removeStyleFromPointsByStyleNames(...styleNames: string[]): void;
    movePoint(pointId: PointId, to: Coordinates): void;
    moveTempPoint(to: Coordinates): void;
    finishCurrentLine(): void;
    drawOnCanvas(draw: (context2d: CanvasRenderingContext2D) => void): void;
}

const useAnnotationEngine = ({
    annotationToEdit,
    annotations,
    onEvent,
    canvasRef,
    ref,
    annotationsToStyle,
}: UseAnnotationEngineArgs): void => {
    const renderingContextRef = useRef<CanvasRenderingContext2D | undefined>(undefined);
    const annotationToEditPointsRef = useRef<Coordinates[]>([]);
    const tempPointRef = useRef<Coordinates | undefined>(undefined);
    const tempPointStyleRef = useRef<AnnotationStyle | undefined>(undefined);
    const styledPointsRef = useRef<StyleDataById>(new Map());
    const annotationsPathsRef = useRef<AnnotationPathDataById>(new Map());
    const annotationToEditStyleRef = useRef<AnnotationStyle>(defaultStyle);
    const MOVE_ON_EXISTING_POINTS_RADIUS_DETECTION = 8;

    const canvasCoordinateOf = (canvas: HTMLCanvasElement, event: MouseEvent): Coordinates => {
        const rect = canvas.getBoundingClientRect();

        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        };
    };

    const getMatchingAnnotationsId = (annotationsPathsMap: AnnotationPathDataById, { x, y }: Coordinates, renderingContext?: CanvasRenderingContext2D,): string[] => {
        const matchingAnnotationsId: string[] = [];
        const isPointInPath = (path: Path2D) => renderingContext?.isPointInPath(path, x, y);
        const isPointAnnotation = (pathData: AnnotationPathData): pathData is PointAnnotationPathData => (pathData as PointAnnotationPathData).point !== undefined;
        const isPointInShapeOrLabel = (pathData: AnnotationPathData): boolean => {

            if (isPointInPath(pathData.label)) {
                return true;
            }

            if (isPointAnnotation(pathData) && isPointInPath(pathData.point)) {
                return true;
            }

            if (!isPointAnnotation(pathData)) {
                return pathData.lines.some((line) => renderingContext?.isPointInStroke(line, x, y))
            } 

            return false;
        }

        annotationsPathsMap.forEach((annotationPaths, annotationId) => {
            if (isPointInShapeOrLabel(annotationPaths)) {
                matchingAnnotationsId.push(annotationId)
            }
        })

        return matchingAnnotationsId;
    }

    const clickedExistingPointsIds = (coordinates: Array<Coordinates>, clickAt: Coordinates): Array<PointId> =>
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
        tempPointRef.current = undefined;
        tempPointStyleRef.current = undefined;
        annotationsPathsRef.current.forEach((_annotationPath: AnnotationPathData, id: string) => {
            if (!annotations.map((anno) => anno.id).includes(id)) {
                annotationsPathsRef.current.delete(id);
            }
        })

        if (annotationToEdit) {
            annotationToEditPointsRef.current = annotationToEdit.coordinates;
        } else {
            annotationToEditPointsRef.current = [];
        }
    }, [annotationToEdit, annotations]);

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

        drawAnnotations(renderingContextRef.current, annotationsToDraw, annotationsToStyle, annotationsPathsRef.current);

        drawCurrentAnnotation(
            renderingContextRef.current,
            annotationToEditPointsRef.current,
            annotationToEditPointsRef.current === annotationToEdit?.coordinates,
            styledPointsRef.current,
            annotationToEditStyleRef.current,
            tempPointStyleRef.current,
            tempPointRef.current,
            annotationToEdit,
        );
    }, [annotationsToDraw, canvasRef, annotationToEdit, annotationsToStyle]);

    useImperativeHandle(ref, () => ({
        cancelCreation() {
            if (annotationToEdit === undefined) {
                annotationToEditPointsRef.current = [];
                drawScene();
            }
        },
    }));

    // Initialize canvas
    useEffect(() => {
        const currentCanvasRef = canvasRef.current;
        let delayDraw: Array<(context2d: CanvasRenderingContext2D) => void> = [];
        const operations: Operations = {
            addPoint: (at: Coordinates) => annotationToEditPointsRef.current.push(at) - 1,
 
            setStyleForAnnotationToEdit: (styleData: StyleData) => {
                annotationToEditStyleRef.current = overloadStyle(defaultStyle, styleData.style);
            },
            setStyleForTempPoint: (styleData?: StyleData) => {
                if (styleData) {
                    tempPointStyleRef.current = overloadStyle(defaultStyle, styleData.style);
                } else {
                    tempPointStyleRef.current = undefined;
                }

            },
            setStyleToPointsByIndexes: (styleData: StyleData, ...pointsId: (string | number)[]) => {
                pointsId.forEach((id) => {
                    styledPointsRef.current.set(`${id}`, styleData)
                })
            },
            removeStyleFromPointsByStyleNames: (...styleNames: string[]): void => {
                const newStyledPoints = new Map(styledPointsRef.current);
                newStyledPoints.forEach((style, pointId) => {
                    if (styleNames.includes(style.name)) {
                        newStyledPoints.delete(pointId);
                    }
                })
                styledPointsRef.current = newStyledPoints;
            },
            movePoint: (pointId: PointId, to: Coordinates): void => {
                annotationToEditPointsRef.current[pointId] = to;
            },
            moveTempPoint: (to: Coordinates): void => {
                tempPointRef.current = to;
            },
            finishCurrentLine: () => {
                annotationToEditPointsRef.current = [];
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
                const clickedPointIds = clickedExistingPointsIds(
                    annotationToEditPointsRef.current,
                    eventCoords,
                );
                if (clickedPointIds.length > 0) {
                    onEvent(
                        {
                            type: 'mouse_up_on_existing_point_event',
                            at: eventCoords,
                            pointIds: clickedPointIds,
                            currentGeometry: [...annotationToEditPointsRef.current],
                            event,
                        },
                        operations,
                        );
                    } else {
                    const currentGeometry = [...annotationToEditPointsRef.current];
                    if (tempPointRef.current) {
                        currentGeometry.push(tempPointRef.current);
                    }
                    onEvent(
                        {
                            type: 'mouse_up_event',
                            at: eventCoords,
                            currentGeometry,
                            event,
                        },
                        operations,
                    );
                }
            });

        const handleMouseDown = (event: MouseEvent) =>
            handleEvent((canvas) => {
                const eventCoords = canvasCoordinateOf(canvas, event);
                const renderingContext = renderingContextRef.current;

                const matchingAnnotationsId = getMatchingAnnotationsId(annotationsPathsRef.current, eventCoords, renderingContext);

                if (matchingAnnotationsId.length && !annotationToEdit) {
                    return onEvent(
                        {
                            type: 'mouse_down_on_annotation_event',
                            at: eventCoords,
                            event,
                            annotationsId: matchingAnnotationsId,
                        },
                        operations,
                    )
                }                
                const clickedPointIds = clickedExistingPointsIds(
                    annotationToEditPointsRef.current,
                    eventCoords,
                );

                if (clickedPointIds.length > 0) {
                    return onEvent(
                        {
                            type: 'mouse_down_on_existing_point_event',
                            at: eventCoords,
                            pointIds: clickedPointIds,
                            currentGeometry: [...annotationToEditPointsRef.current],
                            event,
                        },
                        operations,
                    );
                } 
                
                return onEvent(
                    {
                        type: 'mouse_down_event',
                        at: eventCoords,
                        currentGeometry: [...annotationToEditPointsRef.current],
                        event,
                    },
                    operations,
                );
                
            });

        const handleMouseMove = (event: MouseEvent) =>
            handleEvent((canvas) => {
                const eventCoords = canvasCoordinateOf(canvas, event);
                const renderingContext = renderingContextRef.current;
                const matchingAnnotationsId = getMatchingAnnotationsId(annotationsPathsRef.current, eventCoords, renderingContext);
              
                if (matchingAnnotationsId.length) {
                    const annotationsIdsWithStyle = matchingAnnotationsId.map((id) => {
                        const style = annotationsToStyle.get(id);

                        return ({ id, style });
                    })
                    
                    return onEvent(
                        {
                            type: 'mouse_move_on_annotation_event',
                            at: eventCoords,
                            event,
                            annotationsIdsWithStyle,
                        },
                        operations,
                    )

                }

                const isMoveOnExistingPointsIdx = detectMoveOnExistingPoints(annotationToEditPointsRef.current, eventCoords);

                if (isMoveOnExistingPointsIdx.length > 0) {
                    return onEvent(
                        {
                            type: 'mouse_move_on_existing_point_event',
                            at: eventCoords,
                            pointIds: isMoveOnExistingPointsIdx,
                            currentGeometry: [...annotationToEditPointsRef.current],
                            event,
                        },
                        operations,
                    );
                } 

                return onEvent(
                    {
                        type: 'mouse_move_event',
                        to: canvasCoordinateOf(canvas, event),
                        currentGeometry: [...annotationToEditPointsRef.current],
                        event,
                    },
                    operations,
                );
                
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

        const handleKeyUp = (event: KeyboardEvent) =>
            handleEvent(() => {
                onEvent(
                    {
                        type: 'key_up_event',
                        currentGeometry: [...annotationToEditPointsRef.current],
                        event,
                    },
                    operations,
                );
            });

        const handleKeyDown = (event: KeyboardEvent) =>
            handleEvent(() => {
                onEvent(
                    {
                        type: 'key_down_event',
                        currentGeometry: [...annotationToEditPointsRef.current],
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
                document.addEventListener('keyup', handleKeyUp);
                document.addEventListener('keydown', handleKeyDown);

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
                document.removeEventListener('keyup', handleKeyUp);
                document.removeEventListener('keydown', handleKeyDown);
            }
        };
    }, [drawScene, canvasRef, onEvent, annotations, annotationsToStyle, annotationToEdit]);
};

export default useAnnotationEngine;
