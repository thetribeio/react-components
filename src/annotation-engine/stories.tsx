import { Story, Meta } from '@storybook/react';
import React, { useEffect, useState, useRef, RefObject } from 'react';
import styled from 'styled-components';
import Button from '../button';
import { Annotation, Coordinates, StyleData, StyleDataById } from './models';
import { clickStyle, editStyle, highlightStyle, hoverStyle } from './style/stories';
import { Events, Handles, Operations, PointId, KeyDownEvent, KeyUpEvent, MouseUp } from './use-annotation-engine';
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
    const [selectedAnnotationId, setSelectedAnnotationId] = useState('');

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

        setSelectedAnnotationId(id);

        return id;
    };

    return {
        annotations,
        annotationToEdit, setAnnotationToEdit,
        saveAnnotation,
        selectedAnnotationId,
        setSelectedAnnotationId,
    }
}

/**
 * Manages all the necessary states for the Annotation Engine
 */
const useEngineStateMachine = (
    availableShapeTypes: Array<string>,
    annotationToEdit: Annotation | undefined,
    setAnnotationToEdit: React.Dispatch<React.SetStateAction<Annotation | undefined>>,
    saveAnnotation: SaveAnnotationFunction,
    refAE: RefObject<Handles>,
    setSelectedAnnotationId: React.Dispatch<React.SetStateAction<string>>,
    styleOps: StyleOperations,
) => {
    const [numberOfPoints, setNumberOfPoints] = useState(0);
    const [shapeType, setShapeType] = useState(availableShapeTypes[0]);
    const [isShapeClosed, setIsShapeClosed] = useState(true);
    const [currentlyHoveredAnnotationId, setCurrentlyHoveredAnnotationId] = useState('');
    const {
        setStyleToAnnotationsByIndexes,
        removeStyleFromAnnotationsByIndexes,
        setStyleExclusivelyToId,
    } = styleOps;

    
    const isModeEdition = () => annotationToEdit !== undefined;
    const isModeCreation = () => !isModeEdition() && numberOfPoints > 0;
    const isModeInactif = () => !isModeCreation() && !isModeEdition();
    // key codes map for shape validation (polygon and polylines)
    const shapeFinishedOnKeyCodes = ['Space'];

    const initState = () => ({
        dragPoint: undefined,
        tempPointIndex: 0,
    });
    const state = useRef<{
        dragPoint: PointId | undefined,
        tempPointIndex: PointId,
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
                return length === 1;
            case 'LINE':
                return length === 2;
            default:
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
                return length  >= 3;
            case 'POLYLINE':
                return length >= 2;
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

    const createNewPoint = (at: Coordinates, operations: Operations) => {
        state.current.tempPointIndex = operations.addPoint(at);
    };

    const shapeFinished = (currentGeometry: Coordinates[]) => {
        state.current = initState();
        const id = saveAnnotation(currentGeometry, isShapeClosed);
        setStyleExclusivelyToId(clickStyle, id)
    };

    const keyDownEvent = (event: KeyDownEvent) => {
        if (event.event.code === 'Space') {
            // avoid page scrolldown on space key up
            event.event.preventDefault();
        }
    }

    const keyUpEvent = (event: KeyUpEvent) => {
        if (shapeFinishedOnKeyCodes.includes(event.event.code) && isGeometryReadyToBeManuallyCompleted(event.currentGeometry.length)) {
            shapeFinished(event.currentGeometry);
        }
    }
    
    const mouseUpEvent = (event: MouseUp, operations: Operations) => {
        if (isGeometryComplete(event.currentGeometry.length)) {
            return shapeFinished(event.currentGeometry);
        }
        
        return createNewPoint(event.at, operations);
    }
    
    const handleEvent = (event: Events, operations: Operations): void => {
        operations.setStyleForAnnotationToEdit(editStyle);
        if (isModeInactif()) {
            switch (event.type) {
                // TODO mettre annotation cliquée à la fin dans le tableau
                // pour que son label soit au-dessus, si collision
                case 'mouse_down_on_annotation_event':
                    setCurrentlyHoveredAnnotationId('');
                    setSelectedAnnotationId(event.annotationsId[0]);
                    // FIXME LATER : determine behavior in case of multiple ids
                    setStyleExclusivelyToId(clickStyle, event.annotationsId[0]);
                    
                    break;
                case 'mouse_move_on_annotation_event': {
                    const { annotationsIdsWithStyle } = event;
                    const hoveredAnnotationsId = annotationsIdsWithStyle
                        .filter((annotation) => annotation?.style?.name !== clickStyle.name)
                        .map((annotation) => annotation.id);
                    const newHoveredAnnotationId = hoveredAnnotationsId[0];

                    if (newHoveredAnnotationId) {
                        if (currentlyHoveredAnnotationId !== newHoveredAnnotationId) {
                            removeStyleFromAnnotationsByIndexes(currentlyHoveredAnnotationId);
                            setCurrentlyHoveredAnnotationId(newHoveredAnnotationId);
                        }
                        setStyleToAnnotationsByIndexes(hoverStyle, newHoveredAnnotationId);
                    }
                    break;
                }
                case 'mouse_move_event':
                    setCurrentlyHoveredAnnotationId('');
                    break;
                default:
                    break;
            }
        }
        if (isModeCreation()) {
            switch (event.type) {
                case 'mouse_move_on_existing_point_event':
                    if (isPolygonReadyToBeManuallyCompletedByClickOnFirstPoint(event.currentGeometry, event.pointIds)) {
                        operations.setStyleToPointsByIndexes(highlightStyle, 0)
                    }
                    break;
                case 'key_down_event':
                    keyDownEvent(event);
                    break;
                case 'key_up_event':
                    keyUpEvent(event);
                    break;
                case 'mouse_down_on_existing_point_event':
                case 'mouse_down_event':
                    operations.setStyleForTempPoint(editStyle);
                    break;
                case 'mouse_move_event':
                    operations.removeStyleFromPointsByStyleNames(highlightStyle.name);
                    // move point under cursor
                    operations.movePoint(state.current.tempPointIndex, event.to);
                    break;
                case 'mouse_up_on_existing_point_event':
                    if (isPolygonReadyToBeManuallyCompletedByClickOnFirstPoint(event.currentGeometry, event.pointIds)) {
                        shapeFinished(event.currentGeometry);
                        break;
                    }
                    break;
                case 'mouse_up_event':
                    operations.setStyleForTempPoint();
                    mouseUpEvent(event, operations);
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
                    keyUpEvent(event);
                    break;
                case 'mouse_down_on_existing_point_event':
                    [state.current.dragPoint] = event.pointIds;
                    break;
                case 'mouse_move_event':
                    if (state.current.dragPoint !== undefined) {
                        operations.movePoint(state.current.dragPoint, event.to, isModeEdition());
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
  
interface StyleOperations {
    styledAnnotations: StyleDataById;
    annotationHasStyle(id: string, styleName: string): boolean;
    setStyleExclusivelyToId(style: StyleData, id: string): void;
    setStyleToAnnotationsByIndexes(styleData: StyleData, ...annotationsId: string[]): void;
    removeStyleFromAnnotationsByIndexes(...annotationsId: string[]): void;
    removeStylesFromAnnotationsByStyleNames(...styleNames: string[]): void;
}

/**
 * Allows to manage canvas drawing styles from outside the canvas 
 */
const useStyleOperations = (): StyleOperations => {
    const [styledAnnotations, setStyledAnnotations] = useState<StyleDataById>(new Map());

    const annotationHasStyle = (id: string, styleName: string): boolean => Boolean(styledAnnotations.get(id)?.name === styleName);

    const setStyleToAnnotationsByIndexes = (style: StyleData, ...annotationsId: string[]): void => {
        const newStyledAnnotations = new Map(styledAnnotations);
        annotationsId.forEach((id) => {
            newStyledAnnotations.set(id, style);
        })
        setStyledAnnotations(newStyledAnnotations);
    };

    const removeStyleFromAnnotationsByIndexes = (...annotationsId: string[]): void => {
        const newStyledAnnotations = new Map(styledAnnotations);
        annotationsId.forEach((id) => {
            newStyledAnnotations.delete(id);
        })
        setStyledAnnotations(newStyledAnnotations);
    };

    const setStyleExclusivelyToId = (exclusiveStyle: StyleData, annotationId: string): void => {
        const newStyledAnnotations = new Map(styledAnnotations);
        newStyledAnnotations.forEach((style, id) => {
            if (style.name === exclusiveStyle.name) {
                newStyledAnnotations.delete(id);
            }
        })
        newStyledAnnotations.set(annotationId, exclusiveStyle);
        setStyledAnnotations(newStyledAnnotations);
    }

    const removeStylesFromAnnotationsByStyleNames = (...styleNames: string[]): void => {
        const newStyledAnnotations = new Map(styledAnnotations);
        newStyledAnnotations.forEach((styleData, annotationId) => {
            if (styleNames.includes(styleData.name)) {
                newStyledAnnotations.delete(annotationId);
            }
        })
        setStyledAnnotations(newStyledAnnotations);
    };

    return {
        setStyleToAnnotationsByIndexes,
        removeStyleFromAnnotationsByIndexes,
        annotationHasStyle,
        styledAnnotations,
        setStyleExclusivelyToId,
        removeStylesFromAnnotationsByStyleNames,
    }
};

const RoadcareBehaviorTemplate: Story<StyledProps> = ({ width, height, ...args }) => {
    const availableShapeTypes: Array<string> = ['INACTIVE', 'POINT', 'LINE', 'POLYGON', 'POLYLINE'];
    const refAE = useRef<Handles>(null);
    const styleOps = useStyleOperations();

    const {
        annotations,
        annotationToEdit, setAnnotationToEdit,
        saveAnnotation,
        selectedAnnotationId,
        setSelectedAnnotationId,
    } = useSaveAnnotation();


    const {
        handleEvent,
        shapeType, setShapeType,
        cancelCreationAndEdition,
    } = useEngineStateMachine(
            availableShapeTypes,
            annotationToEdit,
            setAnnotationToEdit,
            saveAnnotation, 
            refAE,
            setSelectedAnnotationId,
            styleOps
        );

    const { 
        styledAnnotations,
        setStyleExclusivelyToId,
        annotationHasStyle,
        removeStyleFromAnnotationsByIndexes,
        setStyleToAnnotationsByIndexes,
        removeStylesFromAnnotationsByStyleNames,
    } = styleOps;

    const handleMouseEnter = (id: string): void => {
        if (!annotationHasStyle(id, clickStyle.name)) {
            setStyleToAnnotationsByIndexes(hoverStyle, id);
        }
    };
    
    const handleMouseLeave = (id: string): void => {
        if (!annotationHasStyle(id, clickStyle.name)) {
            removeStyleFromAnnotationsByIndexes(id);
        }
    };

    const handleClick = (id: string): void => {
        setStyleExclusivelyToId(clickStyle, id);
        setSelectedAnnotationId(id);
    };

    const handleKeyDown = (event: React.KeyboardEvent, id: string) => {
        if (event.code === 'Space') {
            setStyleExclusivelyToId(clickStyle, id)
            setSelectedAnnotationId(id);
        }
    }
 
    return (
        <AnnotationsContainer>
            <StyledAnnotationEngine
                height={height}
                width={width}
                {...args}
                ref={refAE}
                annotationToEdit={annotationToEdit}
                annotations={annotations}
                annotationsToStyle={styledAnnotations}
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
                        <span 
                            onClick={() => handleClick(annotation.id)}
                            onKeyDown={(event) => handleKeyDown(event, annotation.id)}
                            onMouseEnter={() => handleMouseEnter(annotation.id)}
                            onMouseLeave={() => handleMouseLeave(annotation.id)}
                            role="button"
                            style={{color: `${annotation.id === selectedAnnotationId ? 'red' : ''}`}}
                            tabIndex={0}
                        >{annotation.name}{' '}</span>
                        <button onClick={() => {
                            setAnnotationToEdit(annotation);
                            setSelectedAnnotationId('');
                            removeStylesFromAnnotationsByStyleNames(clickStyle.name)
                        }} type="button">
                            EDIT
                        </button>
                    </div>
                ))}
            </div>
        </AnnotationsContainer>
    );
};

export const RoadcareBehavior = RoadcareBehaviorTemplate.bind({});
