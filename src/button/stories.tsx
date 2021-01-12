import { Story, Meta } from '@storybook/react';

import React from 'react';
import BUTTON_COLORS from './button_colors';
import BUTTON_VARIANTS from './button_variants';
import Button, { Props as ButtonProps } from '.';

export default {
    title: 'Components/Button',
    component: Button,
    argTypes: {
        color: {
            control: {
                type: 'select',
                options: BUTTON_COLORS,
            },
        },
        variant: {
            control: {
                type: 'select',
                options: BUTTON_VARIANTS,
            },
        },
        onClick: { action: 'Clicked' },
    },
    args: {
        label: 'Button',
        color: BUTTON_COLORS.GREEN,
        variant: BUTTON_VARIANTS.CONTAINED,
        disabled: false,
    },
} as Meta;

const Template: Story<ButtonProps> = ({ ...args }) => <Button {...args} />;

export const Contained = Template.bind({});

export const Outlined = Template.bind({});
Outlined.args = {
    variant: BUTTON_VARIANTS.OUTLINED,
};

export const Disabled = Template.bind({});
Disabled.args = {
    disabled: true,
};
