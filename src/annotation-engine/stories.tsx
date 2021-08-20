import { Story, Meta } from '@storybook/react';
import React, { useState, useRef, RefObject } from 'react';
import styled from 'styled-components';
import Button from '../button';
import { Annotation, Coordinates } from './models';
import { Events, Handles, Operations, PointId } from './use-annotation-engine';
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

const RoadcareBehaviorTemplate: Story<StyledProps> = ({ width, height, ...args }) => {
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [annotationToEdit, setAnnotationToEdit] = useState<Annotation | undefined>(undefined);
    const refAE = useRef<Handles>(null);
    const [numberOfPoints, setNumberOfPoints] = useState(2);

    const isModeEdition = () => annotationToEdit !== undefined;
    const isModeCreation = () => !isModeEdition() && numberOfPoints > 0;
    const isModeInactif = () => !isModeCreation() && !isModeEdition();

    const initState = () => ({
        dragPoint: undefined,
        tempPoint: undefined,
    });
    const state = useRef<{
        dragPoint: PointId | undefined,
        tempPoint: PointId | undefined,
    }>(initState());
    const saveAnnotation = (geometry: Array<Coordinates>) => {
        setAnnotations(annotations.map((annotation) => {
            if (annotation.id === annotationToEdit?.id) {
                return { ...annotationToEdit, coordinates: geometry };
            }

            return annotation;
        }));
        setAnnotationToEdit(undefined);
        if (!annotationToEdit) {
            const id = `${annotations.length ? Number(annotations[annotations.length - 1].id) + 1 : 1}`;
            setAnnotations([...annotations, { id, name: `Mesure ${id}`, coordinates: geometry }]);
        }
    };
    const isGeometryComplete = (length: number) => length >= numberOfPoints + (state.current.tempPoint !== undefined ? 1 : 0);
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
        saveAnnotation(currentGeometry);
    };
    const lastValidatedPoint = (currentGeometry: Coordinates[]): PointId => {
        if (state.current.tempPoint === currentGeometry.length - 1) {
            return currentGeometry.length - 2;
        }

        return currentGeometry.length - 1;
    };
    const stillOnPreviousPoint = (onPoints: Array<PointId>, currentGeometry: Array<Coordinates>) => onPoints.includes(lastValidatedPoint(currentGeometry));

    const onEvent = (event: Events, operations: Operations) => {
        if (isModeInactif()) {
            return;
        }
        if (isModeCreation()) {
            switch (event.type) {
                case 'mouse_down_event':
                case 'mouse_down_on_existing_point_event':
                    createNewPoint(event.at, event.currentGeometry, operations);
                    break;
                case 'mouse_move_event':
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
                    createNewPoint(event.at, event.currentGeometry, operations);
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
                case 'mouse_down_event':
                    saveAnnotation(event.currentGeometry);
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
                    state.current.dragPoint = undefined;
                    break;
                default:
                    // nothing to do
            }
        }
    };
    const cancelCreationAndEdition = () => {
        state.current = initState();
        // Cancel edition
        setAnnotationToEdit(undefined);
        // Cancel creation
        refAE.current?.cancelCreation();
    };

    return (
        <AnnotationsContainer>
            <StyledAnnotationEngine
                height={height}
                width={width}
                {...args}
                ref={refAE}
                annotationToEdit={annotationToEdit}
                annotations={annotations}
                onEvent={onEvent}
            />
            <ActionContainer>
                <Label>Nombre de points</Label>
                <input onChange={(event) => setNumberOfPoints(parseInt(event.target.value, 10))} type="number" value={numberOfPoints}/>
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
