import { Story, Meta } from '@storybook/react';
import React from 'react';
import AnnotationEngine, { UseAnnotationEngineArgs, useAnnotationEngine } from '.';

export default {
    title: 'Components/Annotation Engine',
    component: AnnotationEngine,
    argTypes: {
        onAnnotationEnd: { action: 'Annotation end' },
        onAnnotationEdit: { action: 'Annotation edit' },
    },
    args: {
        width: 539,
        height: 750,
        backgroundImgPath: 'https://posterstore.fr/images/zoom/mountain-road.jpg',
        annotations: [],
    },
} as Meta;

const Template: Story<UseAnnotationEngineArgs> = (args) => {
    const props = useAnnotationEngine(args);

    return <AnnotationEngine {...props} />;
};

export const WithBackgroundImage = Template.bind({});

export const WithForegroundImage = Template.bind({});
WithForegroundImage.args = {
    foregroundImagePath: 'https://www.dataplusscience.com/images/5x5grid.png',
};

export const WithAnnotations = Template.bind({});
WithAnnotations.args = {
    annotations: [
        {
            name: 'Mesure TEST TEST 1',
            coordinates: [
                { x: 100, y: 200 },
                { x: 300, y: 200 },
            ],
        },
        {
            name: 'Mesure 2',
            coordinates: [
                { x: 200, y: 300 },
                { x: 300, y: 500 },
            ],
        },
        {
            name: 'Mesure 3',
            coordinates: [
                { x: 300, y: 250 },
                { x: 450, y: 300 },
                { x: 440, y: 350 },
                { x: 290, y: 400 },
                { x: 300, y: 250 },
            ],
        },
    ],
};
