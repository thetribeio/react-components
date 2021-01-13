import { Story, Meta } from '@storybook/react';
import React from 'react';
import AnnotationEngine, { AnnotationEngineProps, useAnnotationEngine } from '.';

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
    },
} as Meta;

const Template: Story<AnnotationEngineProps> = (args) => {
    const props = useAnnotationEngine(args);

    return <AnnotationEngine {...props} />;
};

export const WithBackgroundImage = Template.bind({});

export const WithForegroundImage = Template.bind({});
WithForegroundImage.args = {
    foregroundImagePath:
        'https://lh3.googleusercontent.com/proxy/F2UPMXFEMqlRPx2wHxj4c-NlHEwSHCfT1U4fjjbyuurg069xqtqBWrwGhiHSdfp3-nu22s0DeOiGazZsCRVkewdta29PnawM7cQ0BLppDp4wR8aQkPhG2QxAANWd',
};
