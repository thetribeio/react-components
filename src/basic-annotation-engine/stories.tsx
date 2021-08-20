import { Story, Meta } from '@storybook/react';
import React, { useState } from 'react';
import styled from 'styled-components';
import { Annotation, Coordinates } from '../annotation-engine/models';
import BasicAnnotationEngine, { AnnotationEngineProps } from '.';

export default {
    title: 'Annotation Engine/Basic usage',
    component: BasicAnnotationEngine,
    argTypes: {
        onAnnotationEnded: { action: 'Annotation ended' },
    },
    args: {
        width: 539,
        height: 750,
        numberOfPoints: 2,
        backgroundImagePath: 'https://posterstore.fr/images/zoom/mountain-road.jpg',
        foregroundImagePath: undefined,
        annotations: [],
    },
} as Meta;

interface StyledProps extends AnnotationEngineProps {
    width: number;
    height: number;
}

const StyledAnnotationEngine = styled(BasicAnnotationEngine)<StyledProps>`
    width: ${({ width }) => width}px;
    height: ${({ height }) => height}px;
`;

const Template: Story<StyledProps> = ({ width, height, ...args }) => (
    <StyledAnnotationEngine height={height} width={width} {...args} />
);

export const WithBackgroundImage = Template.bind({});

export const WithForegroundImage = Template.bind({});
WithForegroundImage.args = {
    foregroundImagePath: 'https://www.dataplusscience.com/images/5x5grid.png',
};

export const WithAnnotations = Template.bind({});
WithAnnotations.args = {
    annotations: [
        {
            id: '1',
            name: 'Mesure 1',
            coordinates: [
                { x: 100, y: 200 },
                { x: 300, y: 200 },
            ],
        },
        {
            id: '2',
            name: 'Mesure 2',
            coordinates: [
                { x: 200, y: 300 },
                { x: 300, y: 500 },
            ],
        },
        {
            id: '3',
            name: 'Mesure 3',
            coordinates: [
                { x: 300, y: 250 },
                { x: 450, y: 300 },
                { x: 440, y: 350 },
                { x: 290, y: 400 },
            ],
        },
    ],
};

export const WithMorePoints = Template.bind({});
WithMorePoints.args = {
    numberOfPoints: 4,
};

const AnnotationsContainer = styled.div`
    display: flex;
    flex-direction: row;
`;

const WithAnnotationsContainerTemplate: Story<StyledProps> = ({ width, height, ...args }) => {
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [annotationToEdit, setAnnotationToEdit] = useState<Annotation | undefined>(undefined);

    const handleAnnotationDragged = (annotationPoints: Coordinates[], context2d: CanvasRenderingContext2D) => {
        if (annotationPoints.length === 2) {
            const context = context2d;
            const [startCoordinates, endCoordinates] = annotationPoints;
            context.beginPath();
            context.strokeStyle = '#0053CC';
            context.moveTo(startCoordinates.x + 100, startCoordinates.y + 100);
            context.lineWidth = 2;
            context.lineTo(endCoordinates.x + 100, endCoordinates.y + 100);
            context.stroke();
            context.closePath();
        }
    };

    const handleAnnotationEnded = (annotationPoints: Coordinates[]) => {
        if (annotationToEdit) {
            const index = annotations.findIndex((annotation) => annotation.id === annotationToEdit.id);

            if (index >= 0) {
                setAnnotations([
                    ...annotations.slice(0, index),
                    { ...annotationToEdit, coordinates: annotationPoints },
                    ...annotations.slice(index + 1),
                ]);

                setAnnotationToEdit(undefined);
            }
        } else {
            const id = `${annotations.length ? Number(annotations[annotations.length - 1].id) + 1 : 1}`;

            setAnnotations([...annotations, { id, name: `Mesure ${id}`, coordinates: annotationPoints }]);
        }
    };

    return (
        <AnnotationsContainer>
            <StyledAnnotationEngine
                height={height}
                width={width}
                {...args}
                annotationToEdit={annotationToEdit}
                annotations={annotations}
                onAnnotationDragged={handleAnnotationDragged}
                onAnnotationEnded={handleAnnotationEnded}
            />
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

export const WithAnnotationsContainer = WithAnnotationsContainerTemplate.bind({});
WithAnnotationsContainer.args = {
    numberOfPoints: 2,
};
