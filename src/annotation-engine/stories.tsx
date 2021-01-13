import { Story, Meta } from '@storybook/react';
import React from 'react';
import AnnotationEngine, { AnnotationEngineProps, useAnnotationEngine } from '.';

export default {
    title: 'Components/Annotation Engine',
    component: AnnotationEngine,
    args: {
        width: 539,
        height: 750,
        backgroundImgPath: 'https://posterstore.fr/images/zoom/mountain-road.jpg',
    },
} as Meta;

const Template: Story<AnnotationEngineProps> = ({ width, height, backgroundImgPath }) => {
    const props = useAnnotationEngine({ width, height, backgroundImgPath });

    return <AnnotationEngine {...props} />;
};

export const WithImageBackground = Template.bind({});
