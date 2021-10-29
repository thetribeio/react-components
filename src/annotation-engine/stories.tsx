// eslint-disable-next-line max-classes-per-file
import { Story, Meta } from '@storybook/react';
import React, { useEffect, useState, useRef, RefObject } from 'react';
import styled from 'styled-components';
import Button from '../button';
import { Annotation, Coordinates, ShapeType } from './models';
import { Events, Handles, MouseDownEvent, MouseDownOnExistingPointEvent, Operations, PointId, PushKeyEvent, ReleaseKeyEvent } from './use-annotation-engine';
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

type SaveAnnotationFunction = (geometry: Array<Coordinates>, type: ShapeType) => void;

const useSaveAnnotation = () => {
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [annotationToEdit, setAnnotationToEdit] = useState<Annotation | undefined>(undefined);

    const saveAnnotation = (geometry: Array<Coordinates>, type: ShapeType) => {
        setAnnotations(annotations.map((annotation) => {
            if (annotation.id === annotationToEdit?.id) {
                return { ...annotationToEdit, coordinates: geometry, type };
            }

            return annotation;
        }));
        setAnnotationToEdit(undefined);
        if (!annotationToEdit) {
            const id = `${annotations.length ? Number(annotations[annotations.length - 1].id) + 1 : 1}`;
            setAnnotations([...annotations, { id, name: `Mesure ${id}`, coordinates: geometry, type }]);
        }
    };

    return {
        annotations,
        annotationToEdit, setAnnotationToEdit,
        saveAnnotation,
    }
}

/**
 * Manages all the necessary states for the Annotation Engine
 * FIXME: This is not a real state machine, but it manages all the states mecanism from Annotation Engine
 * In Roadcare, it will make the RoadViewer component lighter!
 */
const useEngineStateMachine = (availableShapeTypes: Array<ShapeType>, annotationToEdit: Annotation | undefined, setAnnotationToEdit: React.Dispatch<React.SetStateAction<Annotation | undefined>>, saveAnnotation: SaveAnnotationFunction, refAE: RefObject<Handles>) => {
    const [numberOfPoints, setNumberOfPoints] = useState(0);
    const [shapeType, setShapeType] = useState(availableShapeTypes[0]);
    const [wasOnFirstPoint, setWasOnFirstPoint] = useState(false);

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
     * Set limit of points for the shape when we change the Annotation Engine shape type
     */
    useEffect(() => {
        switch (shapeType) {
            case 'POINT':
            default:
                setNumberOfPoints(1);
                break;
            case 'LINE':
                setNumberOfPoints(2);
                break;
        }
    }, [shapeType]);

    /**
     * Set Annotation Engine current shapeType when we edit another annotation
     */
    useEffect(() => {
        if (annotationToEdit?.type) {
            setShapeType(annotationToEdit.type);
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
     * Dedicated to line, polygon and polylines shapes, return true if shape can be manualy complete
     */
    const isGeometryReadyToBeManualyComplete = (length: number) => {
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
     * - shape is ready to be manualy finished
     * - mouse is moving on the first point of the shape
     */
    const isPolygonReadyToBeManualyCompleteByClickOnFirstPoint = (currentGeometry: Array<Coordinates>, pointIds: Array<PointId>) => {
        const { length } = currentGeometry;
        switch (shapeType) {
            case 'POLYGON':
                return isGeometryReadyToBeManualyComplete(length) && pointIds.some((id) => id === 0);
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
        operations.finishCurrentLine();
        state.current = initState();
        saveAnnotation(currentGeometry, shapeType);
    };

    const lastValidatedPoint = (currentGeometry: Coordinates[]): PointId => {
        if (state.current.tempPoint === currentGeometry.length - 1) {
            return currentGeometry.length - 2;
        }

        return currentGeometry.length - 1;
    };

    const stillOnPreviousPoint = (onPoints: Array<PointId>, currentGeometry: Array<Coordinates>) => onPoints.includes(lastValidatedPoint(currentGeometry));

    const pushKeyEvent = (event: PushKeyEvent) => {
        if (event.event.code === 'Space') {
            // avoid page scrolldown on space key up
            event.event.preventDefault();
        }
    }

    const releaseKeyEvent = (event: ReleaseKeyEvent, operations: Operations) => {
        if (shapeFinishedOnKeyCodes.includes(event.event.code) && isGeometryReadyToBeManualyComplete(event.currentGeometry.length)) {
            if (isModeCreation()) {
                event.currentGeometry.pop();
            }
            shapeFinished(event.currentGeometry, operations);
        }
    }

    const mouseDownEvent = (event: MouseDownEvent | MouseDownOnExistingPointEvent, operations: Operations) => {
        createNewPoint(event.at, event.currentGeometry, operations);
    }

    const handleEvent = (event: Events, operations: Operations): void => {
        if (isModeInactif()) {
            return;
        }
        if (isModeCreation()) {
            switch (event.type) {
                case 'mouse_move_on_existing_point_event':
                    if (isPolygonReadyToBeManualyCompleteByClickOnFirstPoint(event.currentGeometry, event.pointIds)) {
                        setWasOnFirstPoint(true);
                        operations.highlightExistingPoint(event.at);
                    }
                    break;
                case 'push_key_event':
                    pushKeyEvent(event);
                    break;
                case 'release_key_event':
                    releaseKeyEvent(event, operations);
                    break;
                case 'mouse_down_event':
                case 'mouse_down_on_existing_point_event':
                    if (event.type === 'mouse_down_on_existing_point_event'
                        && isPolygonReadyToBeManualyCompleteByClickOnFirstPoint(event.currentGeometry, event.pointIds)) {
                        event.currentGeometry.pop();
                        shapeFinished(event.currentGeometry, operations);
                        break;
                    }
                    mouseDownEvent(event, operations);
                    break;
                case 'mouse_move_event':
                    if (wasOnFirstPoint !== false && !isPolygonReadyToBeManualyCompleteByClickOnFirstPoint(event.currentGeometry, [])) {
                        setWasOnFirstPoint(false);
                        operations.removeHighlightPoint();
                    }
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
                case 'push_key_event':
                    pushKeyEvent(event);
                    break;
                case 'release_key_event':
                    releaseKeyEvent(event, operations);
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
                        saveAnnotation(event.currentGeometry, shapeType);
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
    const availableShapeTypes: Array<ShapeType> = ['POINT', 'LINE', 'POLYGON', 'POLYLINE'];
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
                <select onChange={(event) => setShapeType(event.target.value as ShapeType)} value={shapeType}>
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
