// eslint-disable-next-line max-classes-per-file
import { Story, Meta } from '@storybook/react';
import React, { useEffect, useState, useRef, RefObject } from 'react';
import styled from 'styled-components';
import Button from '../button';
import { Annotation, Coordinates } from './models';
import { clickStyle, editStyle, highlightStyle, hoverStyle } from './style/stories';
import { Events, Handles, MouseDownEvent, MouseDownOnExistingPointEvent, Operations, PointId, KeyDownEvent, KeyUpEvent } from './use-annotation-engine';
import AnnotationEngine, { AnnotationEngineProps } from '.';

export default {
    title: 'Annotation Engine/Advanced usage',
    component: AnnotationEngine,
    argTypes: {
        onAnnotationEnded: { action: 'Annotation ended' },
    },
    args: {
        width: 539,
        height: 750,
        backgroundImagePath: 'https://posterstore.fr/images/zoom/mountain-road.jpg',
        foregroundImagePath: undefined,
        annotations: [],
    },
} as Meta;

interface StyledProps extends AnnotationEngineProps {
    width: number;
    height: number;
    ref: RefObject<Handles>;
}

const StyledAnnotationEngine = styled(AnnotationEngine)<StyledProps>`
    width: ${({ width }) => width}px;
    height: ${({ height }) => height}px;
`;

const AnnotationsContainer = styled.div`
    display: flex;
    flex-direction: row;
`;

const ActionContainer = styled.div`
    display: flex;
    align-self: flex-start;
    margin: 0 0.5rem;
    gap: 0.5rem;
`;

const Label = styled.label`
    color: white;
`;

type SaveAnnotationFunction = (geometry: Array<Coordinates>, isClosed: boolean) => string;

const useSaveAnnotation = () => {
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [annotationToEdit, setAnnotationToEdit] = useState<Annotation | undefined>(undefined);

    const saveAnnotation = (geometry: Array<Coordinates>, isClosed: boolean): string => {
        let id = '';
        setAnnotations(annotations.map((annotation) => {
            if (annotation.id === annotationToEdit?.id) {
                id = annotation.id;

                return { ...annotationToEdit, coordinates: geometry, isClosed };
            }

            return annotation;
        }));
        setAnnotationToEdit(undefined);
        if (!annotationToEdit) {
            id = `${annotations.length ? Number(annotations[annotations.length - 1].id) + 1 : 1}`;
            setAnnotations([...annotations, { id, name: `Mesure ${id}`, coordinates: geometry, isClosed }]);
        }

        return id;
    };

    return {
        annotations,
        annotationToEdit, setAnnotationToEdit,
        saveAnnotation,
    }
}

/**
 * Manages all the necessary states for the Annotation Engine
 */
const useEngineStateMachine = (availableShapeTypes: Array<string>, annotationToEdit: Annotation | undefined, setAnnotationToEdit: React.Dispatch<React.SetStateAction<Annotation | undefined>>, saveAnnotation: SaveAnnotationFunction, refAE: RefObject<Handles>) => {
    const [numberOfPoints, setNumberOfPoints] = useState(0);
    const [shapeType, setShapeType] = useState(availableShapeTypes[0]);
    const [isShapeClosed, setIsShapeClosed] = useState(true);
    const [lastHoveredAnnotationId, setLastHoveredAnnotationId] = useState('');

    const isModeEdition = () => annotationToEdit !== undefined;
    const isModeCreation = () => !isModeEdition() && numberOfPoints > 0;
    const isModeInactif = () => !isModeCreation() && !isModeEdition();
    // key codes map for shape validation (polygon and polylines)
    const shapeFinishedOnKeyCodes = ['Space'];

    const initState = () => ({
        dragPoint: undefined,
        tempPoint: undefined,
    });
    const state = useRef<{
        dragPoint: PointId | undefined,
        tempPoint: PointId | undefined,
    }>(initState());

    const cancelCreationAndEdition = () => {
        state.current = initState();
        // Cancel edition
        setAnnotationToEdit(undefined);
        // Cancel creation
        refAE.current?.cancelCreation();
    };

    /**
     * Set limit of points and is closed logic for the shape when we change the Annotation Engine shape type
     */
    useEffect(() => {
        switch (shapeType) {
            case 'INACTIVE':
                setNumberOfPoints(0);
                break;
            case 'POINT':
            default:
                setNumberOfPoints(1);
                break;
            case 'LINE':
                setNumberOfPoints(2);
                break;
        }
        switch (shapeType) {
            case 'POLYLINE':
                setIsShapeClosed(false);
                break;
            default:
                setIsShapeClosed(true);
                break;
        }
    }, [shapeType]);

    /**
     * Set current shapeType when we edit another annotation
     */
    useEffect(() => {
        if (annotationToEdit !== undefined) {
            const { length } = annotationToEdit.coordinates;
            if (length === 1) {
                setShapeType('POINT');
            } else if (length === 2) {
                setShapeType('LINE');
            } else if (length > 2) {
                if (annotationToEdit.isClosed === true) {
                    setShapeType('POLYGON');
                } else {
                    setShapeType('POLYLINE');
                }
            }
        }
    }, [annotationToEdit]);

    const isGeometryComplete = (length: number) => {
        switch (shapeType) {
            case 'POINT':
            case 'LINE':
            default:
                return length >= numberOfPoints + (state.current.tempPoint !== undefined ? 1 : 0);
            case 'POLYGON':
            case 'POLYLINE':
                return false;
        }
    }

    /**
     * Dedicated to line, polygon and polylines shapes, return true if shape can be manually complete
     */
    const isGeometryReadyToBeManuallyCompleted = (length: number) => {
        switch (shapeType) {
            case 'LINE':
                return isModeEdition();
            case 'POLYGON':
                return length - (state.current.tempPoint !== undefined ? 1 : 0) >= 3;
            case 'POLYLINE':
                return length - (state.current.tempPoint !== undefined ? 1 : 0) >= 2;
            default:
                return false;
        }
    }

    /**
     * Dedicated to polygon shapes, return true if:
     * - shape is ready to be manually finished
     * - mouse is moving on the first point of the shape
     */
    const isPolygonReadyToBeManuallyCompletedByClickOnFirstPoint = (currentGeometry: Array<Coordinates>, pointIds: Array<PointId>) => {
        const { length } = currentGeometry;
        switch (shapeType) {
            case 'POLYGON':
                return isGeometryReadyToBeManuallyCompleted(length) && pointIds.some((id) => id === 0);
            default:
                return false;
        }
    }

    const createNewPoint = (at: Coordinates, currentGeometry: Coordinates[], operations: Operations) => {
        if (state.current.tempPoint === undefined) {
            // First point
            operations.addPoint(at);
        }
        if (!isGeometryComplete(currentGeometry.length + 1)) {
            // Create next point ahead & validate current point
            state.current.tempPoint = operations.addPoint(at);
        } else {
            // just validate last point
            state.current.tempPoint = undefined;
        }
    };

    const shapeFinished = (currentGeometry: Coordinates[], operations: Operations) => {
        if (state.current.tempPoint) {
            currentGeometry.splice(state.current.tempPoint, 1);
        }
        operations.finishCurrentLine();
        state.current = initState();
        const id = saveAnnotation(currentGeometry, isShapeClosed);
        operations.removeStylesFromAnnotationsByStyleNames([clickStyle.name])
        operations.setStyleToAnnotations([id], clickStyle)
    };

    const lastValidatedPoint = (currentGeometry: Coordinates[]): PointId => {
        if (state.current.tempPoint === currentGeometry.length - 1) {
            return currentGeometry.length - 2;
        }

        return currentGeometry.length - 1;
    };

    const stillOnPreviousPoint = (onPoints: Array<PointId>, currentGeometry: Array<Coordinates>) => onPoints.includes(lastValidatedPoint(currentGeometry));

    const keyDownEvent = (event: KeyDownEvent) => {
        if (event.event.code === 'Space') {
            // avoid page scrolldown on space key up
            event.event.preventDefault();
        }
    }

    const keyUpEvent = (event: KeyUpEvent, operations: Operations) => {
        if (shapeFinishedOnKeyCodes.includes(event.event.code) && isGeometryReadyToBeManuallyCompleted(event.currentGeometry.length)) {
            shapeFinished(event.currentGeometry, operations);
        }
    }

    const mouseDownEvent = (event: MouseDownEvent | MouseDownOnExistingPointEvent, operations: Operations) => {
        createNewPoint(event.at, event.currentGeometry, operations);
    }
    
    const handleEvent = (event: Events, operations: Operations): void => {
        operations.setStyleForAnnotationToEdit(editStyle);
        if (isModeInactif()) {
            switch (event.type) {
                case 'mouse_down_on_label_event':
                    operations.removeStylesFromAnnotationsByStyleNames([clickStyle.name]);
                    // FIXME LATER : determine behavior in case of multiple ids
                    operations.setStyleToAnnotations([event.annotationsId[0]], clickStyle);
                    break;
                case 'mouse_move_on_label_event': {
                    const { annotationsIdsWithStyle } = event;

                    const hoveredAnnotationsId = annotationsIdsWithStyle
                        .filter((annotation) => annotation?.style?.name !== clickStyle.name)
                        .map((annotation) => annotation.id);
                    const newHoveredAnnotationId = hoveredAnnotationsId[0];

                    if (newHoveredAnnotationId) {
                        if (lastHoveredAnnotationId !== newHoveredAnnotationId) {
                            operations.removeStyleFromAnnotationsById([lastHoveredAnnotationId]);
                            setLastHoveredAnnotationId(newHoveredAnnotationId);
                        }
                        operations.setStyleToAnnotations([newHoveredAnnotationId], hoverStyle);
                    }

                    break;
                }
                case 'mouse_move_event':
                    setLastHoveredAnnotationId('');
                    operations.removeStylesFromAnnotationsByStyleNames([hoverStyle.name]);
                    break;
                default:
                    break;
            }
        }
        if (isModeCreation()) {
            switch (event.type) {
                case 'mouse_move_on_existing_point_event':
                    if (isPolygonReadyToBeManuallyCompletedByClickOnFirstPoint(event.currentGeometry, event.pointIds)) {
                        operations.setStyleToPoints(['0'], highlightStyle)
                    }
                    break;
                case 'key_down_event':
                    keyDownEvent(event);
                    break;
                case 'key_up_event':
                    keyUpEvent(event, operations);
                    break;
                case 'mouse_down_event':
                    mouseDownEvent(event, operations);
                    break;
                case 'mouse_down_on_existing_point_event':
                    if (event.type === 'mouse_down_on_existing_point_event'
                        && isPolygonReadyToBeManuallyCompletedByClickOnFirstPoint(event.currentGeometry, event.pointIds)) {
                        shapeFinished(event.currentGeometry, operations);
                        break;
                    }
                    mouseDownEvent(event, operations);
                    break;
                case 'mouse_move_event':
                    operations.removeStyleFromPoints();
                    if (state.current.tempPoint !== undefined) {
                        // move point under cursor
                        operations.movePoint(state.current.tempPoint, event.to);
                    }
                    break;
                case 'mouse_up_on_existing_point_event':
                    if (!stillOnPreviousPoint(event.pointIds, event.currentGeometry)) {
                        createNewPoint(event.at, event.currentGeometry, operations);
                    }
                    if (isGeometryComplete(event.currentGeometry.length)) {
                        shapeFinished(event.currentGeometry, operations);
                    }
                    break;
                case 'mouse_up_event':
                    if (isGeometryComplete(event.currentGeometry.length)) {
                        shapeFinished(event.currentGeometry, operations);
                    }
                    break;
                default:
                    // nothing to do
            }
        }
        if (isModeEdition()) {
            switch (event.type) {
                case 'key_down_event':
                    keyDownEvent(event);
                    break;
                case 'key_up_event':
                    keyUpEvent(event, operations);
                    break;
                case 'mouse_down_on_existing_point_event':
                    [state.current.dragPoint] = event.pointIds;
                    break;
                case 'mouse_move_event':
                    if (state.current.dragPoint !== undefined) {
                        operations.movePoint(state.current.dragPoint, event.to);
                    }
                    break;
                case 'mouse_up_on_existing_point_event':
                case 'mouse_up_event':
                    if (shapeType === 'POINT') {
                        saveAnnotation(event.currentGeometry, isShapeClosed);
                    }
                    state.current.dragPoint = undefined;
                    break;
                default:
                    // nothing to do
            }
        }
    }

    return {
        handleEvent,
        shapeType, setShapeType,
        cancelCreationAndEdition,
    }
}

const RoadcareBehaviorTemplate: Story<StyledProps> = ({ width, height, ...args }) => {
    const availableShapeTypes: Array<string> = ['INACTIVE', 'POINT', 'LINE', 'POLYGON', 'POLYLINE'];
    const refAE = useRef<Handles>(null);

    const {
        annotations,
        annotationToEdit, setAnnotationToEdit,
        saveAnnotation,
    } = useSaveAnnotation();

    const {
        handleEvent,
        shapeType, setShapeType,
        cancelCreationAndEdition,
    } = useEngineStateMachine(availableShapeTypes, annotationToEdit, setAnnotationToEdit, saveAnnotation, refAE);

    return (
        <AnnotationsContainer>
            <StyledAnnotationEngine
                height={height}
                width={width}
                {...args}
                ref={refAE}
                annotationToEdit={annotationToEdit}
                annotations={annotations}
                onEvent={handleEvent}
            />
            <ActionContainer>
                <Label>Type de forme</Label>
                <select onChange={(event) => setShapeType(event.target.value)} value={shapeType}>
                    {
                        availableShapeTypes.map((sType) => (<option key={sType} value={sType}>{sType}</option>))
                    }
                </select>
                <Button label="Cancel edition" onClick={cancelCreationAndEdition} type="button" />
            </ActionContainer>
            <div style={{ color: 'white' }}>
                {annotations.map((annotation: Annotation) => (
                    <div key={annotation.id}>
                        {annotation.name}{' '}
                        <button onClick={() => setAnnotationToEdit(annotation)} type="button">
                            EDIT
                        </button>
                    </div>
                ))}
            </div>
        </AnnotationsContainer>
    );
};

export const RoadcareBehavior = RoadcareBehaviorTemplate.bind({});
